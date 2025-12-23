import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, TextInput, Alert } from "react-native";
import { router } from "expo-router";

import type { WarehouseItem } from "@/lib/models/warehouse";
import { subscribeWarehouseItems, deleteWarehouseItems, moveWarehouseItemsToPrestito } from "@/lib/repos/warehouse.repo";
import { useClients } from "@/lib/providers/ClientsProvider";

import { Select } from "@/lib/ui/components/Select";
import { s } from "./tabs.styles";

type MaterialGroup = { materialLabel: string; items: WarehouseItem[] };
type ActionMode = "none" | "delete" | "prestito";

function todayYmd(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function parseYmdToMs(sx: string): number | null {
    const x = sx.trim();
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

    const [clientId, setClientId] = useState<string>("");
    const [loanStartYmd, setLoanStartYmd] = useState<string>(todayYmd());

    useEffect(() => {
        return subscribeWarehouseItems(setItems);
    }, []);

    const clientOptions = useMemo(() => {
        return [{ label: "Seleziona...", value: "" }, ...clients.map((c) => ({ label: c.ragioneSociale, value: c.id }))];
    }, [clients]);

    const grouped: MaterialGroup[] = useMemo(() => {
        const byMat = new Map<string, WarehouseItem[]>();
        for (const it of items) {
            const key = (it.materialLabel || "Materiale").trim();
            if (!byMat.has(key)) byMat.set(key, []);
            byMat.get(key)!.push(it);
        }

        return Array.from(byMat.entries())
            .map(([materialLabel, arr]) => ({
                materialLabel,
                items: arr.slice().sort((a, b) => (a.serialNumber || "").localeCompare(b.serialNumber || "")),
            }))
            .sort((a, b) => a.materialLabel.localeCompare(b.materialLabel));
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
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    const selectedItems = useMemo(() => {
        const map = new Map(items.map((x) => [x.id, x]));
        return Array.from(selected).map((id) => map.get(id)).filter(Boolean) as WarehouseItem[];
    }, [selected, items]);

    async function onDeleteSelected() {
        if (busy) return;
        if (selected.size === 0) return Alert.alert("Errore", "Seleziona almeno un pezzo.");

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
        if (selected.size === 0) return Alert.alert("Errore", "Seleziona almeno un pezzo.");
        if (!clientId) return Alert.alert("Errore", "Seleziona una ragione sociale.");

        const cl = clients.find((c) => c.id === clientId);
        if (!cl) return Alert.alert("Errore", "Cliente non valido.");

        const ms = parseYmdToMs(loanStartYmd);
        if (!ms) return Alert.alert("Errore", "Data inizio prestito non valida (YYYY-MM-DD).");

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

            router.replace("/(tabs)/prestito" as any);
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a mandare in prestito.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <View style={s.page}>
            <View style={s.rowBetween}>
                <Text style={s.title}>Magazzino</Text>

                <Pressable onPress={toggleEditing} disabled={busy} style={editing ? s.btnMuted : s.btnPrimary}>
                    <Text style={editing ? s.btnMutedText : s.btnPrimaryText}>{editing ? "Chiudi" : "Modifica"}</Text>
                </Pressable>
            </View>

            <Text style={s.subtitle}>Totale pezzi: {items.length}</Text>

            {editing ? (
                <View style={s.card}>
                    <Text style={s.cardTitle}>Azioni</Text>

                    <View style={s.row}>
                        <Pressable
                            onPress={() => setMode((m) => (m === "delete" ? "none" : "delete"))}
                            disabled={busy}
                            style={mode === "delete" ? s.btnMuted : s.btnPrimary}
                        >
                            <Text style={mode === "delete" ? s.btnMutedText : s.btnPrimaryText}>Elimina</Text>
                        </Pressable>

                        <Pressable
                            onPress={() => setMode((m) => (m === "prestito" ? "none" : "prestito"))}
                            disabled={busy}
                            style={mode === "prestito" ? s.btnMuted : s.btnPrimary}
                        >
                            <Text style={mode === "prestito" ? s.btnMutedText : s.btnPrimaryText}>Prestito</Text>
                        </Pressable>
                    </View>

                    <Text style={s.smallMuted}>Selezionati: {selected.size}</Text>

                    {mode === "delete" ? (
                        <Pressable onPress={onDeleteSelected} disabled={busy} style={s.btnDanger}>
                            <Text style={s.btnDangerText}>{busy ? "..." : "Elimina selezionati"}</Text>
                        </Pressable>
                    ) : null}

                    {mode === "prestito" ? (
                        <View style={{ gap: 12 }}>
                            <Select
                                label="Ragione sociale"
                                value={clientId}
                                options={clientOptions}
                                onChange={(v) => setClientId(String(v))}
                                searchable
                            />

                            <Text style={s.smallMuted}>Data inizio prestito (YYYY-MM-DD)</Text>
                            <TextInput
                                value={loanStartYmd}
                                onChangeText={setLoanStartYmd}
                                editable={!busy}
                                placeholder="2025-12-23"
                                placeholderTextColor={"rgba(229,231,235,0.70)"}
                                style={[s.input, busy ? { opacity: 0.6 } : null]}
                            />

                            <Pressable onPress={onPrestitoSelected} disabled={busy} style={s.btnPrimary}>
                                <Text style={s.btnPrimaryText}>{busy ? "Salvo..." : "Salva Prestito"}</Text>
                            </Pressable>
                        </View>
                    ) : null}
                </View>
            ) : null}

            <FlatList
                data={grouped}
                keyExtractor={(x) => x.materialLabel}
                contentContainerStyle={s.listContent}
                renderItem={({ item }) => (
                    <View style={s.groupCard}>
                        <Text style={s.groupTitle}>
                            {item.materialLabel} — {item.items.length}
                        </Text>

                        {item.items.map((x) => {
                            const checked = selected.has(x.id);

                            return (
                                <View key={x.id} style={s.pieceRow}>
                                    <Text style={s.lineStrong}>• {x.serialNumber}</Text>

                                    {editing ? (
                                        <Pressable onPress={() => toggleSelected(x.id)} disabled={busy} style={s.miniBtn}>
                                            <Text style={s.miniBtnText}>{checked ? "☑" : "☐"}</Text>
                                        </Pressable>
                                    ) : null}
                                </View>
                            );
                        })}
                    </View>
                )}
                ListEmptyComponent={<Text style={s.empty}>Nessun oggetto in magazzino</Text>}
            />
        </View>
    );
}
