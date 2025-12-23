import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, TextInput, Alert } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";

import type { WarehouseItem } from "@/lib/models/warehouse";
import { subscribeWarehouseItems, deleteWarehouseItems, moveWarehouseItemsToPrestito } from "@/lib/repos/warehouse.repo";
import { useClients } from "@/lib/providers/ClientsProvider";

type MaterialGroup = {
    materialLabel: string;
    items: WarehouseItem[];
};

type ActionMode = "none" | "delete" | "prestito";

// YYYY-MM-DD
function todayYmd(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function parseYmdToMs(s: string): number | null {
    const x = s.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return null;
    const [yy, mm, dd] = x.split("-").map((n) => parseInt(n, 10));
    if (!yy || !mm || !dd) return null;
    const d = new Date(yy, mm - 1, dd, 0, 0, 0, 0);
    const ms = d.getTime();
    if (Number.isNaN(ms)) return null;
    return ms;
}

export default function MagazzinoTab() {
    const [items, setItems] = useState<WarehouseItem[]>([]);
    const { clients } = useClients();

    const [editing, setEditing] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [mode, setMode] = useState<ActionMode>("none");
    const [busy, setBusy] = useState(false);

    // prestito options
    const [clientId, setClientId] = useState<string>("");
    const [loanStartYmd, setLoanStartYmd] = useState<string>(todayYmd());

    useEffect(() => {
        return subscribeWarehouseItems(setItems);
    }, []);

    const grouped: MaterialGroup[] = useMemo(() => {
        const byMat = new Map<string, WarehouseItem[]>();
        for (const it of items) {
            const key = (it.materialLabel || "Materiale").trim();
            if (!byMat.has(key)) byMat.set(key, []);
            byMat.get(key)!.push(it);
        }

        const out: MaterialGroup[] = Array.from(byMat.entries())
            .map(([materialLabel, arr]) => ({
                materialLabel,
                items: arr.slice().sort((a, b) => (a.serialNumber || "").localeCompare(b.serialNumber || "")),
            }))
            .sort((a, b) => a.materialLabel.localeCompare(b.materialLabel));

        return out;
    }, [items]);

    function resetEditState() {
        setSelected(new Set());
        setMode("none");
        setClientId("");
        setLoanStartYmd(todayYmd());
    }

    function toggleEditing() {
        if (editing) {
            setEditing(false);
            resetEditState();
        } else {
            setEditing(true);
            resetEditState();
        }
    }

    function toggleSelected(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    const selectedItems = useMemo(() => {
        const map = new Map(items.map((x) => [x.id, x]));
        return Array.from(selected).map((id) => map.get(id)).filter(Boolean) as WarehouseItem[];
    }, [selected, items]);

    async function onDeleteSelected() {
        if (busy) return;
        if (selected.size === 0) {
            Alert.alert("Errore", "Seleziona almeno un pezzo.");
            return;
        }

        Alert.alert("Elimina", `Eliminare ${selected.size} pezzi dal magazzino?`, [
            { text: "Annulla", style: "cancel" },
            {
                text: "Elimina",
                style: "destructive",
                onPress: async () => {
                    try {
                        setBusy(true);
                        await deleteWarehouseItems(Array.from(selected));
                        setSelected(new Set());
                        setMode("none");
                    } catch (e) {
                        console.log(e);
                        Alert.alert("Errore", "Non riesco a eliminare.");
                    } finally {
                        setBusy(false);
                    }
                },
            },
        ]);
    }

    async function onPrestitoSelected() {
        if (busy) return;
        if (selected.size === 0) {
            Alert.alert("Errore", "Seleziona almeno un pezzo.");
            return;
        }
        if (!clientId) {
            Alert.alert("Errore", "Seleziona una ragione sociale.");
            return;
        }

        const cl = clients.find((c) => c.id === clientId);
        if (!cl) {
            Alert.alert("Errore", "Cliente non valido.");
            return;
        }

        const ms = parseYmdToMs(loanStartYmd);
        if (!ms) {
            Alert.alert("Errore", "Data inizio prestito non valida (YYYY-MM-DD).");
            return;
        }

        try {
            setBusy(true);
            await moveWarehouseItemsToPrestito({
                items: selectedItems,
                clientId: cl.id,
                ragioneSociale: cl.ragioneSociale,
                loanStartMs: ms,
            });

            setSelected(new Set());
            setMode("none");
            setEditing(false);

            // vai in prestito
            router.replace("/(tabs)/prestito" as any);
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a mandare in prestito.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 22, fontWeight: "700" }}>Magazzino</Text>

                <Pressable
                    onPress={toggleEditing}
                    disabled={busy}
                    style={{ padding: 10, borderRadius: 8, backgroundColor: "black", opacity: busy ? 0.6 : 1 }}
                >
                    <Text style={{ color: "white", fontWeight: "700" }}>{editing ? "Chiudi" : "Modifica"}</Text>
                </Pressable>
            </View>

            <Text style={{ opacity: 0.7 }}>Totale pezzi: {items.length}</Text>

            {editing ? (
                <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 }}>
                    <Text style={{ fontWeight: "800" }}>Azioni</Text>

                    <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                        <Pressable
                            onPress={() => setMode((m) => (m === "delete" ? "none" : "delete"))}
                            disabled={busy}
                            style={{
                                padding: 10,
                                borderRadius: 8,
                                backgroundColor: mode === "delete" ? "gray" : "black",
                                opacity: busy ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ color: "white", fontWeight: "700" }}>Elimina</Text>
                        </Pressable>

                        <Pressable
                            onPress={() => setMode((m) => (m === "prestito" ? "none" : "prestito"))}
                            disabled={busy}
                            style={{
                                padding: 10,
                                borderRadius: 8,
                                backgroundColor: mode === "prestito" ? "gray" : "black",
                                opacity: busy ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ color: "white", fontWeight: "700" }}>Prestito</Text>
                        </Pressable>
                    </View>

                    <Text style={{ opacity: 0.7 }}>Selezionati: {selected.size}</Text>

                    {mode === "delete" ? (
                        <Pressable
                            onPress={onDeleteSelected}
                            disabled={busy}
                            style={{ padding: 10, borderRadius: 8, backgroundColor: "red", opacity: busy ? 0.6 : 1 }}
                        >
                            <Text style={{ color: "white", fontWeight: "700" }}>{busy ? "..." : "Elimina selezionati"}</Text>
                        </Pressable>
                    ) : null}

                    {mode === "prestito" ? (
                        <View style={{ gap: 10 }}>
                            <Text style={{ fontWeight: "700" }}>Ragione sociale</Text>
                            <Picker selectedValue={clientId} onValueChange={(v) => setClientId(String(v))} enabled={!busy}>
                                <Picker.Item label="Seleziona..." value="" />
                                {clients.map((c) => (
                                    <Picker.Item key={c.id} label={c.ragioneSociale} value={c.id} />
                                ))}
                            </Picker>

                            <Text style={{ fontWeight: "700" }}>Data inizio prestito (YYYY-MM-DD)</Text>
                            <TextInput
                                value={loanStartYmd}
                                onChangeText={setLoanStartYmd}
                                editable={!busy}
                                placeholder="2025-12-23"
                                style={{ borderWidth: 1, padding: 10, borderRadius: 8, opacity: busy ? 0.6 : 1 }}
                            />

                            <Pressable
                                onPress={onPrestitoSelected}
                                disabled={busy}
                                style={{ padding: 10, borderRadius: 8, backgroundColor: "black", opacity: busy ? 0.6 : 1 }}
                            >
                                <Text style={{ color: "white", fontWeight: "700" }}>{busy ? "Salvo..." : "Salva Prestito"}</Text>
                            </Pressable>
                        </View>
                    ) : null}
                </View>
            ) : null}

            <FlatList
                data={grouped}
                keyExtractor={(x) => x.materialLabel}
                renderItem={({ item }) => (
                    <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                        <Text style={{ fontWeight: "800", fontSize: 16 }}>
                            {item.materialLabel} — {item.items.length}
                        </Text>

                        {item.items.map((x) => {
                            const checked = selected.has(x.id);
                            return (
                                <View
                                    key={x.id}
                                    style={{
                                        marginTop: 8,
                                        borderWidth: 1,
                                        borderRadius: 10,
                                        padding: 10,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 10,
                                    }}
                                >
                                    <Text style={{ flex: 1 }}>• {x.serialNumber}</Text>

                                    {editing ? (
                                        <Pressable
                                            onPress={() => toggleSelected(x.id)}
                                            disabled={busy}
                                            style={{
                                                paddingVertical: 8,
                                                paddingHorizontal: 12,
                                                borderRadius: 8,
                                                backgroundColor: "black",
                                                opacity: busy ? 0.6 : 1,
                                            }}
                                        >
                                            <Text style={{ color: "white", fontWeight: "800" }}>{checked ? "☑" : "☐"}</Text>
                                        </Pressable>
                                    ) : null}
                                </View>
                            );
                        })}
                    </View>
                )}
                ListEmptyComponent={<Text>Nessun oggetto in magazzino</Text>}
            />
        </View>
    );
}
