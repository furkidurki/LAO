import { useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useOrders } from "@/lib/providers/OrdersProvider";
import type { OrderStatus } from "@/lib/models/order";
import { updateOrder } from "@/lib/repos/orders.repo";
import { s } from "./ordini.styles";
import { theme } from "@/lib/ui/theme";

type FulfillmentType = "receive" | "pickup";

type ItemVM = {
    id: string;
    materialType: string;
    materialName?: string;
    description?: string;

    distributorName?: string;

    quantity: number;

    fulfillmentType: FulfillmentType;

    boughtFlags: boolean[];
    boughtAtMs: (number | null)[];

    receivedFlags: boolean[];
    receivedAtMs: (number | null)[];
};

function ensureBoolArray(v: any, len: number) {
    const out = Array.from({ length: Math.max(0, len) }, () => false);
    if (!Array.isArray(v)) return out;
    for (let i = 0; i < out.length; i++) out[i] = Boolean(v[i]);
    return out;
}

function ensureNullableNumberArray(v: any, len: number) {
    const out: (number | null)[] = Array.from({ length: Math.max(0, len) }, () => null);
    if (!Array.isArray(v)) return out;
    for (let i = 0; i < out.length; i++) {
        const raw = v[i];
        out[i] = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
    }
    return out;
}

function formatDayFromMs(ms: number | null | undefined) {
    if (typeof ms !== "number" || !Number.isFinite(ms)) return "-";
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
}

function normalizeItems(ord: any): ItemVM[] {
    const rawItems = Array.isArray(ord?.items) ? ord.items : null;

    if (rawItems && rawItems.length > 0) {
        return rawItems.map((it: any, idx: number) => {
            const quantity = Math.max(0, parseInt(String(it?.quantity ?? 0), 10) || 0);
            const ft: FulfillmentType = it?.fulfillmentType === "pickup" ? "pickup" : "receive";

            return {
                id: String(it?.id ?? `item-${idx}`),
                materialType: String(it?.materialType ?? ""),
                materialName: it?.materialName ? String(it.materialName) : undefined,
                description: it?.description ? String(it.description) : undefined,
                distributorName: it?.distributorName ? String(it.distributorName) : undefined,
                quantity,

                fulfillmentType: ft,

                boughtFlags: ensureBoolArray(it?.boughtFlags, quantity),
                boughtAtMs: ensureNullableNumberArray(it?.boughtAtMs, quantity),

                receivedFlags: ensureBoolArray(it?.receivedFlags, quantity),
                receivedAtMs: ensureNullableNumberArray(it?.receivedAtMs, quantity),
            };
        });
    }

    const quantity = Math.max(0, parseInt(String(ord?.quantity ?? 0), 10) || 0);
    const ft: FulfillmentType = Boolean(ord?.flagToPickup) ? "pickup" : "receive";

    return [
        {
            id: "legacy",
            materialType: String(ord?.materialType ?? ""),
            materialName: ord?.materialName ? String(ord.materialName) : undefined,
            description: ord?.description ? String(ord.description) : undefined,
            distributorName: ord?.distributorName ? String(ord.distributorName) : undefined,
            quantity,

            fulfillmentType: ft,

            boughtFlags: ensureBoolArray(ord?.boughtFlags, quantity),
            boughtAtMs: ensureNullableNumberArray(ord?.boughtAtMs, quantity),

            receivedFlags: ensureBoolArray(ord?.receivedFlags, quantity),
            receivedAtMs: ensureNullableNumberArray(ord?.receivedAtMs, quantity),
        },
    ];
}

function getTotals(items: ItemVM[]) {
    let totalQty = 0;
    let bought = 0;

    for (const it of items) {
        totalQty += Math.max(0, it.quantity || 0);
        for (const f of it.boughtFlags) if (f) bought++;
    }

    const toBuy = Math.max(0, totalQty - bought);

    let stage: "ordine_nuovo" | "in_lavorazione" | "concluso" = "ordine_nuovo";
    if (totalQty > 0 && bought > 0 && bought < totalQty) stage = "in_lavorazione";
    if (totalQty > 0 && bought === totalQty) stage = "concluso";

    return { totalQty, bought, toBuy, stage };
}

function getPendingFulfillment(items: ItemVM[]) {
    let receive = 0;
    let pickup = 0;

    for (const it of items) {
        for (let i = 0; i < it.quantity; i++) {
            const isBought = Boolean(it.boughtFlags[i]);
            const isReceived = Boolean(it.receivedFlags[i]);
            if (isBought && !isReceived) {
                if (it.fulfillmentType === "pickup") pickup++;
                else receive++;
            }
        }
    }

    return { receive, pickup, total: receive + pickup };
}

export default function ModificaOrdine() {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const orderId = String(id || "");

    const { orders } = useOrders();
    const ord = useMemo(() => orders.find((o) => o.id === orderId) ?? null, [orders, orderId]);

    const [busy, setBusy] = useState(false);

    // stato locale per evitare "rimbalzi" UI
    const [localItems, setLocalItems] = useState<ItemVM[]>([]);
    useEffect(() => {
        if (!ord) return;
        setLocalItems(normalizeItems(ord as any));
    }, [ord?.id, ord?.updatedAt]);

    const items = localItems;

    const totals = useMemo(() => getTotals(items), [items]);
    const allBought = totals.toBuy === 0 && totals.totalQty > 0;

    const pending = useMemo(() => (allBought ? getPendingFulfillment(items) : { receive: 0, pickup: 0, total: 0 }), [
        items,
        allBought,
    ]);

    const fullyDone = allBought && pending.total === 0;

    async function saveItems(next: ItemVM[], opts?: { ensureOrderDate?: boolean }) {
        if (!ord) return;

        const patch: any = {};

        if (Array.isArray((ord as any)?.items)) {
            patch.items = next.map((it) => ({
                id: it.id,
                materialType: it.materialType,
                materialName: it.materialName ?? null,
                description: it.description ?? null,
                distributorName: it.distributorName ?? null,
                quantity: it.quantity,

                fulfillmentType: it.fulfillmentType,

                boughtFlags: it.boughtFlags,
                boughtAtMs: it.boughtAtMs,

                receivedFlags: it.receivedFlags,
                receivedAtMs: it.receivedAtMs,
            }));
        } else {
            const it = next[0];
            patch.boughtFlags = it.boughtFlags;
            patch.boughtAtMs = it.boughtAtMs;

            patch.receivedFlags = it.receivedFlags;
            patch.receivedAtMs = it.receivedAtMs;

            patch.flagToPickup = it.fulfillmentType === "pickup";
            patch.flagToReceive = it.fulfillmentType === "receive";
        }

        if (opts?.ensureOrderDate && !(ord as any)?.orderDateMs) {
            patch.orderDateMs = Date.now();
        }

        await updateOrder(ord.id, patch);
    }

    async function toggleBought(itemId: string, pieceIndex: number) {
        if (!ord) return;
        if (busy) return;
        if ((ord as any).status !== "ordinato") return;
        if (allBought) return;

        const prev = items;
        const next = items.map((x) => ({ ...x }));
        const ix = next.findIndex((x) => x.id === itemId);
        if (ix < 0) return;

        const it = next[ix];

        const nextValue = !Boolean(it.boughtFlags[pieceIndex]);
        it.boughtFlags = [...it.boughtFlags];
        it.boughtAtMs = [...it.boughtAtMs];
        it.receivedFlags = [...it.receivedFlags];
        it.receivedAtMs = [...it.receivedAtMs];

        it.boughtFlags[pieceIndex] = nextValue;
        it.boughtAtMs[pieceIndex] = nextValue ? Date.now() : null;

        if (!nextValue) {
            it.receivedFlags[pieceIndex] = false;
            it.receivedAtMs[pieceIndex] = null;
        }

        next[ix] = it;

        try {
            setBusy(true);
            setLocalItems(next);
            await saveItems(next, { ensureOrderDate: true });
        } catch (e) {
            console.log(e);
            setLocalItems(prev);
            Alert.alert("Errore", "Non riesco a salvare");
        } finally {
            setBusy(false);
        }
    }

    async function setFulfillmentType(itemId: string, ft: FulfillmentType) {
        if (!ord) return;
        if (busy) return;
        if ((ord as any).status !== "ordinato") return;
        if (!allBought) return;

        const prev = items;
        const next = items.map((x) => ({ ...x }));
        const ix = next.findIndex((x) => x.id === itemId);
        if (ix < 0) return;

        next[ix] = { ...next[ix], fulfillmentType: ft };

        try {
            setBusy(true);
            setLocalItems(next);
            await saveItems(next, { ensureOrderDate: true });
        } catch (e) {
            console.log(e);
            setLocalItems(prev);
            Alert.alert("Errore", "Non riesco a salvare");
        } finally {
            setBusy(false);
        }
    }

    async function toggleReceived(itemId: string, pieceIndex: number) {
        if (!ord) return;
        if (busy) return;
        if ((ord as any).status !== "ordinato") return;
        if (!allBought) return;

        const prev = items;
        const next = items.map((x) => ({ ...x }));
        const ix = next.findIndex((x) => x.id === itemId);
        if (ix < 0) return;

        const it = next[ix];

        if (!Boolean(it.boughtFlags[pieceIndex])) return;

        it.receivedFlags = [...it.receivedFlags];
        it.receivedAtMs = [...it.receivedAtMs];

        const nextValue = !Boolean(it.receivedFlags[pieceIndex]);
        it.receivedFlags[pieceIndex] = nextValue;
        it.receivedAtMs[pieceIndex] = nextValue ? Date.now() : null;

        next[ix] = it;

        try {
            setBusy(true);
            setLocalItems(next);
            await saveItems(next, { ensureOrderDate: true });
        } catch (e) {
            console.log(e);
            setLocalItems(prev);
            Alert.alert("Errore", "Non riesco a salvare");
        } finally {
            setBusy(false);
        }
    }

    async function orderAll() {
        if (!ord) return;
        if (busy) return;
        if ((ord as any).status !== "ordinato") return;
        if (allBought) return;

        const prev = items;
        const now = Date.now();
        const next = items.map((it) => {
            const boughtFlags = [...it.boughtFlags];
            const boughtAtMs = [...it.boughtAtMs];

            for (let i = 0; i < it.quantity; i++) {
                if (!boughtFlags[i]) {
                    boughtFlags[i] = true;
                    boughtAtMs[i] = now;
                }
            }

            return { ...it, boughtFlags, boughtAtMs };
        });

        try {
            setBusy(true);
            setLocalItems(next);
            await saveItems(next, { ensureOrderDate: true });
        } catch (e) {
            console.log(e);
            setLocalItems(prev);
            Alert.alert("Errore", "Non riesco a salvare");
        } finally {
            setBusy(false);
        }
    }

    async function fulfillAll() {
        if (!ord) return;
        if (busy) return;
        if ((ord as any).status !== "ordinato") return;
        if (!allBought) return;

        const prev = items;
        const now = Date.now();
        const next = items.map((it) => {
            const receivedFlags = [...it.receivedFlags];
            const receivedAtMs = [...it.receivedAtMs];

            for (let i = 0; i < it.quantity; i++) {
                if (Boolean(it.boughtFlags[i]) && !receivedFlags[i]) {
                    receivedFlags[i] = true;
                    receivedAtMs[i] = now;
                }
            }

            return { ...it, receivedFlags, receivedAtMs };
        });

        try {
            setBusy(true);
            setLocalItems(next);
            await saveItems(next, { ensureOrderDate: true });
        } catch (e) {
            console.log(e);
            setLocalItems(prev);
            Alert.alert("Errore", "Non riesco a salvare");
        } finally {
            setBusy(false);
        }
    }

    if (!orderId) {
        return (
            <View style={{ flex: 1, padding: 16 }}>
                <Text>Errore: manca id ordine</Text>
            </View>
        );
    }

    if (!ord) {
        return (
            <View style={{ flex: 1, padding: 16 }}>
                <Text>Caricamento ordine...</Text>
                <Pressable onPress={() => router.back()} style={{ marginTop: 10 }}>
                    <Text style={{ textDecorationLine: "underline" }}>Indietro</Text>
                </Pressable>
            </View>
        );
    }

    const st: OrderStatus = (ord as any).status;

    return (
        <ScrollView contentContainerStyle={s.page}>
            <Text style={s.title}>Modifica Ordine</Text>

            <View style={s.card}>
                <Text style={[s.label, { fontSize: 12 }]}>Ragione sociale</Text>
                <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 18 }}>{ord.ragioneSociale}</Text>

                <Text style={s.help}>Codice: {ord.code}</Text>
                <Text style={s.help}>Stato: {st}</Text>

                {(ord as any).orderDateMs ? <Text style={s.help}>Data: {formatDayFromMs((ord as any).orderDateMs)}</Text> : null}

                {st !== "ordinato" ? (
                    <View style={{ marginTop: 10, gap: 10 }}>
                        <Text style={s.help}>Questo ordine non è in “ordinato”.</Text>
                        <Pressable
                            onPress={() => router.replace({ pathname: "/ordini/visualizza" as any, params: { id: orderId } } as any)}
                            style={s.btnPrimary}
                        >
                            <Text style={s.btnPrimaryText}>Visualizza</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={{ marginTop: 10, gap: 10 }}>
                        <Text style={[s.label, { fontSize: 12 }]}>Fase 1</Text>
                        <Text style={s.help}>
                            Ordine: {totals.stage} | Comprati {totals.bought}/{totals.totalQty}
                        </Text>

                        {!allBought ? (
                            <View style={s.row}>
                                <Pressable onPress={orderAll} disabled={busy} style={s.btnPrimary}>
                                    <Text style={s.btnPrimaryText}>Ordina tutti</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <>
                                <Text style={[s.label, { fontSize: 12, marginTop: 6 }]}>Fase 2</Text>
                                <Text style={s.help}>
                                    Da ricevere {pending.receive} | Da ritirare {pending.pickup}
                                </Text>

                                <View style={s.row}>
                                    <Pressable onPress={fulfillAll} disabled={busy} style={s.btnPrimary}>
                                        <Text style={s.btnPrimaryText}>Completa tutti</Text>
                                    </Pressable>
                                </View>

                                {fullyDone ? (
                                    <Pressable
                                        onPress={() =>
                                            router.replace({ pathname: "/ordini/visualizza" as any, params: { id: orderId } } as any)
                                        }
                                        style={s.btnPrimary}
                                    >
                                        <Text style={s.btnPrimaryText}>Visualizza ordine</Text>
                                    </Pressable>
                                ) : null}
                            </>
                        )}
                    </View>
                )}
            </View>

            <View style={s.card}>
                <Text style={[s.label, { fontSize: 12 }]}>Articoli</Text>

                {items.map((it, idx) => {
                    const title = it.materialName && it.materialName.trim() ? it.materialName : it.materialType;
                    const boughtCount = it.boughtFlags.filter(Boolean).length;
                    const receiveLabel = it.fulfillmentType === "pickup" ? "Ritirato" : "Ricevuto";

                    return (
                        <View
                            key={it.id}
                            style={{
                                marginTop: 12,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                borderRadius: theme.radius.lg,
                                padding: 12,
                                backgroundColor: theme.colors.surface2,
                                gap: 10,
                            }}
                        >
                            <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                                {idx + 1}) {title}
                            </Text>

                            <Text style={s.help}>Quantità: {it.quantity}</Text>
                            <Text style={s.help}>Comprati: {boughtCount}/{it.quantity}</Text>

                            {st === "ordinato" && allBought ? (
                                <View style={s.row}>
                                    <Pressable
                                        onPress={() => setFulfillmentType(it.id, "receive")}
                                        disabled={busy}
                                        style={it.fulfillmentType === "receive" ? s.btnPrimary : s.btnMuted}
                                    >
                                        <Text style={it.fulfillmentType === "receive" ? s.btnPrimaryText : s.btnMutedText}>
                                            Da ricevere
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => setFulfillmentType(it.id, "pickup")}
                                        disabled={busy}
                                        style={it.fulfillmentType === "pickup" ? s.btnPrimary : s.btnMuted}
                                    >
                                        <Text style={it.fulfillmentType === "pickup" ? s.btnPrimaryText : s.btnMutedText}>
                                            Da ritirare
                                        </Text>
                                    </Pressable>
                                </View>
                            ) : null}

                            <View style={{ gap: 8 }}>
                                {Array.from({ length: Math.max(0, it.quantity) }, (_, i) => {
                                    const isBought = Boolean(it.boughtFlags[i]);
                                    const buyDay = formatDayFromMs(it.boughtAtMs[i]);

                                    const isReceived = Boolean(it.receivedFlags[i]);
                                    const recDay = formatDayFromMs(it.receivedAtMs[i]);

                                    return (
                                        <View
                                            key={i}
                                            style={{
                                                borderWidth: 1,
                                                borderColor: theme.colors.border,
                                                borderRadius: theme.radius.md,
                                                padding: 12,
                                                backgroundColor: theme.colors.surface,
                                                gap: 10,
                                            }}
                                        >
                                            <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Pezzo {i + 1}</Text>

                                            <Pressable
                                                onPress={() => toggleBought(it.id, i)}
                                                disabled={busy || st !== "ordinato" || allBought}
                                                style={{
                                                    flexDirection: "row",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    opacity: busy || st !== "ordinato" || allBought ? 0.6 : 1,
                                                }}
                                            >
                                                <Text style={s.help}>{isBought ? `Ordinato: ${buyDay}` : "Da ordinare"}</Text>

                                                <Ionicons
                                                    name={isBought ? "checkbox" : "square-outline"}
                                                    size={22}
                                                    color={isBought ? theme.colors.primary : theme.colors.muted}
                                                />
                                            </Pressable>

                                            {st === "ordinato" && allBought ? (
                                                <Pressable
                                                    onPress={() => toggleReceived(it.id, i)}
                                                    disabled={busy || !isBought}
                                                    style={{
                                                        flexDirection: "row",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        opacity: busy || !isBought ? 0.6 : 1,
                                                    }}
                                                >
                                                    <Text style={s.help}>
                                                        {isReceived ? `${receiveLabel}: ${recDay}` : `${receiveLabel}: no`}
                                                    </Text>

                                                    <Ionicons
                                                        name={isReceived ? "checkbox" : "square-outline"}
                                                        size={22}
                                                        color={isReceived ? theme.colors.primary : theme.colors.muted}
                                                    />
                                                </Pressable>
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    );
                })}

                <Pressable onPress={() => router.back()} style={s.btnMuted}>
                    <Text style={s.btnMutedText}>Indietro</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}
