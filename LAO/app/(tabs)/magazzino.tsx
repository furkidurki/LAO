import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import type { WarehouseItem } from "@/lib/models/warehouse";
import { confirmDanger } from "@/lib/ui/confirm";

import {
    subscribeWarehouseItems,
    deleteWarehouseItems,
    moveWarehouseItemsToPrestito,
} from "@/lib/repos/warehouse.repo";
import { useClients } from "@/lib/providers/ClientsProvider";

import { ClientSmartSearch, type ClientLite } from "@/lib/ui/components/ClientSmartSearch";

import { Screen } from "@/lib/ui/kit/Screen";
import { Card } from "@/lib/ui/kit/Card";
import { Chip } from "@/lib/ui/kit/Chip";
import { MotionPressable } from "@/lib/ui/kit/MotionPressable";
import { theme } from "@/lib/ui/theme";

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

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    let t: any;
    const timeout = new Promise<T>((_, reject) => {
        t = setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

export default function MagazzinoTab() {
    const { clients } = useClients();

    const [items, setItems] = useState<WarehouseItem[]>([]);
    const [q, setQ] = useState("");

    const [editing, setEditing] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [mode, setMode] = useState<ActionMode>("none");
    const [busy, setBusy] = useState(false);

    const [clientIdFilter, setClientIdFilter] = useState<string | null>(null);
    const [clientText, setClientText] = useState("");

    const [loanStartYmd, setLoanStartYmd] = useState<string>(todayYmd());

    useEffect(() => {
        return subscribeWarehouseItems(setItems);
    }, []);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) return items;

        return items.filter((it) => {
            const ml = String(it.materialLabel || "").toLowerCase();
            const sn = String(it.serialNumber || "").toLowerCase();
            const desc = String(it.serialDesc || "").toLowerCase();
            return ml.includes(needle) || sn.includes(needle) || desc.includes(needle);
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

        const ok = await confirmDanger("Elimina", "Vuoi eliminare i pezzi selezionati?");
        if (!ok) return;

        try {
            setBusy(true);
            await deleteWarehouseItems(Array.from(selected));
            setSelected(new Set());
            setMode("none");
            setEditing(false);
        } catch (e: any) {
            console.log(e);
            Alert.alert("Errore", String(e?.message ?? e ?? "Non riesco a eliminare."));
        } finally {
            setBusy(false);
        }
    }


    async function onPrestitoSelected() {
        if (busy) return;

        console.log("[MAGAZZINO] onPrestitoSelected: start");
        console.log("[MAGAZZINO] selected size =", selected.size);
        console.log("[MAGAZZINO] clientIdFilter =", clientIdFilter, " clientText =", clientText);
        console.log("[MAGAZZINO] loanStartYmd =", loanStartYmd);

        if (selected.size === 0) {
            return Alert.alert("Errore", "Seleziona almeno un pezzo (checkbox).");
        }

        const ms = parseYmdToMs(loanStartYmd);
        if (!ms) {
            return Alert.alert("Errore", "Data inizio prestito non valida. Formato: YYYY-MM-DD (es. 2026-01-09).");
        }

        // scegli cliente: prima via selezione, poi fallback via testo
        const textNeedle = clientText.trim().toLowerCase();
        let cl = clientIdFilter ? clients.find((c) => c.id === clientIdFilter) : undefined;

        if (!cl && textNeedle) {
            cl = clients.find((c) => String(c.ragioneSociale || "").trim().toLowerCase() === textNeedle);
        }

        if (!cl) {
            return Alert.alert("Errore", "Seleziona una ragione sociale dalla lista (tocca un risultato).");
        }

        const pick = items.filter((it) => selected.has(it.id));
        console.log("[MAGAZZINO] pick length =", pick.length);

        if (pick.length === 0) {
            return Alert.alert("Errore", "Selezione vuota (non trovo gli id selezionati negli items).");
        }

        try {
            setBusy(true);
            console.log("[MAGAZZINO] calling moveWarehouseItemsToPrestito...");

            // timeout per evitare “rimane lì” senza feedback
            await withTimeout(
                moveWarehouseItemsToPrestito({
                    items: pick,
                    clientId: cl.id,
                    ragioneSociale: cl.ragioneSociale,
                    loanStartMs: ms,
                }),
                12000,
                "Operazione troppo lenta o bloccata. Controlla rete / permessi Firestore / quota."
            );

            console.log("[MAGAZZINO] moveWarehouseItemsToPrestito DONE");

            setSelected(new Set());
            setMode("none");
            setEditing(false);

            // route più robusta: i group non sono parte dell’URL
            router.replace("/prestito" as any);
        } catch (e) {
            console.log("[MAGAZZINO] prestito error:", e);
            Alert.alert("Errore", String((e as any)?.message ?? e ?? "Non riesco a mandare in prestito."));
        } finally {
            setBusy(false);
            console.log("[MAGAZZINO] onPrestitoSelected: end (busy=false)");
        }
    }

    return (
        <Screen scroll={false} contentStyle={{ paddingBottom: 0 }}>
            <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.2 }}>
                            Magazzino
                        </Text>
                        <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                            Totale pezzi: {items.length} • Visibili: {filtered.length}
                        </Text>
                    </View>

                    <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <Chip label="Aggiungi" tone="primary" onPress={() => router.push("/magazzino/aggiungi" as any)} />
                        <Chip label={editing ? "Chiudi" : "Modifica"} onPress={toggleEditing} />
                    </View>
                </View>

                <Card>
                    <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>Cerca</Text>
                    <TextInput
                        value={q}
                        onChangeText={setQ}
                        placeholder="Materiale, seriale, descrizione..."
                        placeholderTextColor={theme.colors.muted}
                        style={{
                            backgroundColor: theme.colors.surface2,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            borderRadius: theme.radius.lg,
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            color: theme.colors.text,
                            fontWeight: "900",
                        }}
                    />

                    {editing ? (
                        <View style={{ gap: 12, marginTop: 12 }}>
                            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                                <Chip label="Elimina" tone={mode === "delete" ? "primary" : "neutral"} onPress={() => onPickMode("delete")} />
                                <Chip label="Prestito" tone={mode === "prestito" ? "primary" : "neutral"} onPress={() => onPickMode("prestito")} />
                                <Chip label={`Selezionati ${selected.size}`} />
                            </View>

                            {mode === "delete" ? (
                                <Pressable
                                    onPress={() => {
                                        Alert.alert("TEST", "Tap Elimina ricevuto");
                                        onDeleteSelected();
                                    }}
                                    disabled={busy || selected.size === 0}
                                    hitSlop={12}
                                    style={({ pressed }) => ({
                                        backgroundColor: theme.colors.primary,
                                        borderRadius: theme.radius.lg,
                                        paddingVertical: 12,
                                        paddingHorizontal: 14,
                                        alignItems: "center",
                                        opacity: busy || selected.size === 0 ? 0.55 : pressed ? 0.85 : 1,
                                    })}
                                >
                                    <Text style={{ color: "white", fontWeight: "900" }}>
                                        {busy ? "..." : `Elimina selezionati (${selected.size})`}
                                    </Text>
                                </Pressable>
                            ) : null}

                            {mode === "prestito" ? (
                                <View style={{ gap: 12 }}>
                                    <ClientSmartSearch
                                        label="Ragione sociale"
                                        value={clientText}
                                        onChangeValue={(t) => {
                                            setClientText(t);
                                            setClientIdFilter(null);
                                        }}
                                        selectedId={clientIdFilter}
                                        onSelect={(c: ClientLite) => {
                                            setClientIdFilter(c.id);
                                            setClientText(c.ragioneSociale);
                                        }}
                                        onClear={() => {
                                            setClientIdFilter(null);
                                            setClientText("");
                                        }}
                                        maxRecent={10}
                                        maxResults={20}
                                    />

                                    <View style={{ gap: 8 }}>
                                        <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>Data inizio (YYYY-MM-DD)</Text>
                                        <TextInput
                                            value={loanStartYmd}
                                            onChangeText={setLoanStartYmd}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor={theme.colors.muted}
                                            style={{
                                                backgroundColor: theme.colors.surface2,
                                                borderWidth: 1,
                                                borderColor: theme.colors.border,
                                                borderRadius: theme.radius.lg,
                                                paddingVertical: 12,
                                                paddingHorizontal: 12,
                                                color: theme.colors.text,
                                                fontWeight: "900",
                                            }}
                                        />
                                    </View>

                                    <Pressable
                                        onPress={() => {
                                            Alert.alert("TEST", "Tap ricevuto");
                                            onPrestitoSelected();
                                        }}
                                        style={{
                                            backgroundColor: theme.colors.primary,
                                            borderRadius: theme.radius.lg,
                                            paddingVertical: 12,
                                            paddingHorizontal: 14,
                                            alignItems: "center",
                                            opacity: busy ? 0.6 : 1,
                                        }}
                                        disabled={busy}
                                    >
                                        <Text style={{ color: "white", fontWeight: "900" }}>
                                            {busy ? "..." : "Conferma prestito"}
                                        </Text>
                                    </Pressable>

                                </View>
                            ) : null}
                        </View>
                    ) : null}
                </Card>
            </View>

            <FlatList
                style={{ flex: 1 }}
                data={grouped}
                keyExtractor={(x) => x.materialLabel}
                contentContainerStyle={{ paddingTop: 14, paddingBottom: 110 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                    <Card>
                        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>{item.materialLabel}</Text>

                        <View style={{ height: 1, backgroundColor: theme.colors.border, marginTop: 12, marginBottom: 8 }} />

                        {item.items.map((it) => {
                            const checked = selected.has(it.id);
                            const desc = String(it.serialDesc ?? "").trim();

                            return (
                                <MotionPressable
                                    key={it.id}
                                    onPress={() => {
                                        if (editing) toggleSelected(it.id);
                                        else router.push({ pathname: "/magazzino/modifica" as any, params: { id: it.id } } as any);
                                    }}
                                    haptic={editing ? "light" : "none"}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 10,
                                        paddingVertical: 10,
                                    }}
                                >
                                    <View style={{ flex: 1, gap: 2 }}>
                                        <Text style={{ color: theme.colors.text, fontWeight: "900" }}>{it.serialNumber}</Text>
                                        <Text style={{ color: theme.colors.muted, fontWeight: "900" }} numberOfLines={1}>
                                            {desc ? desc : "Senza descrizione"}
                                        </Text>
                                    </View>

                                    {editing ? (
                                        <Ionicons
                                            name={checked ? "checkbox" : "square-outline"}
                                            size={22}
                                            color={checked ? theme.colors.primary2 : "rgba(11,16,32,0.55)"}
                                        />
                                    ) : (
                                        <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
                                    )}
                                </MotionPressable>
                            );
                        })}
                    </Card>
                )}
                ListEmptyComponent={<Text style={{ color: theme.colors.muted, fontWeight: "900" }}>Nessun oggetto in magazzino</Text>}
            />
        </Screen>
    );
}
