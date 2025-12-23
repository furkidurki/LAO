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
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
}

function parseYmdToMs(ymd: string): number | null {
    const s = String(ymd || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
    const dt = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
    const ms = dt.getTime();
    return Number.isFinite(ms) ? ms : null;
}

export default function MagazzinoTab() {
    const { clients } = useClients();

    const [items, setItems] = useState<WarehouseItem[]>([]);
    const [q, setQ] = useState("");

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

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) return items;

        return items.filter((it) => {
            const ml = String(it.materialLabel || "").toLowerCase();
            const sn = String(it.serialNumber || "").toLowerCase();
            return ml.includes(needle) || sn.includes(needle);
        });
    }, [items, q]);

    const grouped = useMemo(() => {
        const map = new Map<string, WarehouseItem[]>();
        for (const it of filtered) {
            const key = (it.materialLabel || "Materiale").trim();
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(it);
        }

        const arr: MaterialGroup[] = Array.from(map.entries()).map(([materialLabel, its]) => ({
            materialLabel,
            items: its,
        }));

        arr.sort((a, b) => a.materialLabel.localeCompare(b.materialLabel));
        return arr;
    }, [filtered]);

    function toggleEditing() {
        if (busy) return;
        setEditing((x) => !x);
        setSelected(new Set());
        setMode("none");
    }

    function toggleSelected(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function onPickMode(next: ActionMode) {
        if (busy) return;
        setMode((prev) => (prev === next ? "none" : next));
    }

    async function onDeleteSelected() {
        if (busy) return;
        if (selected.size === 0) return Alert.alert("Errore", "Seleziona almeno un pezzo.");

        Alert.alert("Conferma", "Vuoi eliminare i pezzi selezionati?", [
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
                        setEditing(false);
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

        const pick = items.filter((it) => selected.has(it.id));

        try {
            setBusy(true);
            await moveWarehouseItemsToPrestito({
                items: pick,
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

                <View style={s.row}>
                    <Pressable
                        onPress={() => router.push("/magazzino/aggiungi" as any)}
                        disabled={busy || editing}
                        style={busy || editing ? s.btnMuted : s.btnPrimary}
                    >
                        <Text style={busy || editing ? s.btnMutedText : s.btnPrimaryText}>+ Aggiungi</Text>
                    </Pressable>

                    <Pressable onPress={toggleEditing} disabled={busy} style={editing ? s.btnMuted : s.btnPrimary}>
                        <Text style={editing ? s.btnMutedText : s.btnPrimaryText}>{editing ? "Chiudi" : "Modifica"}</Text>
                    </Pressable>
                </View>
            </View>

            <Text style={s.subtitle}>Totale pezzi: {items.length}</Text>

            <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Cerca (materiale o seriale)..."
                placeholderTextColor={"rgba(229,231,235,0.70)"}
                style={s.input}
            />

            {editing ? (
                <View style={s.card}>
                    <Text style={s.lineStrong}>Azione</Text>

                    <View style={s.row}>
                        <Pressable
                            onPress={() => onPickMode("delete")}
                            disabled={busy}
                            style={mode === "delete" ? s.btnMuted : s.btnPrimary}
                        >
                            <Text style={mode === "delete" ? s.btnMutedText : s.btnPrimaryText}>Elimina</Text>
                        </Pressable>

                        <Pressable
                            onPress={() => onPickMode("prestito")}
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
                        <>
                            <Text style={s.lineMuted}>Ragione sociale</Text>
                            <Select value={clientId} onChange={setClientId} options={clientOptions} />

                            <Text style={s.lineMuted}>Data inizio prestito (YYYY-MM-DD)</Text>
                            <TextInput value={loanStartYmd} onChangeText={setLoanStartYmd} style={s.input} />

                            <Pressable onPress={onPrestitoSelected} disabled={busy} style={s.btnPrimary}>
                                <Text style={s.btnPrimaryText}>{busy ? "..." : "Conferma prestito"}</Text>
                            </Pressable>
                        </>
                    ) : null}
                </View>
            ) : null}

            <FlatList
                data={grouped}
                keyExtractor={(x) => x.materialLabel}
                contentContainerStyle={{ paddingBottom: 24 }}
                renderItem={({ item }) => (
                    <View style={s.card}>
                        <Text style={s.lineStrong}>{item.materialLabel}</Text>

                        {item.items.map((it) => {
                            const checked = selected.has(it.id);

                            return (
                                <Pressable
                                    key={it.id}
                                    onPress={() => (editing ? toggleSelected(it.id) : null)}
                                    style={[
                                        s.rowBetween,
                                        { paddingVertical: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
                                    ]}
                                >
                                    <Text style={s.lineMuted}>{it.serialNumber}</Text>

                                    {editing ? (
                                        <Text style={s.smallMuted}>{checked ? "✅" : "⬜"}</Text>
                                    ) : (
                                        <Text style={s.smallMuted}></Text>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                )}
                ListEmptyComponent={<Text style={s.empty}>Nessun oggetto in magazzino</Text>}
            />
        </View>
    );
}
