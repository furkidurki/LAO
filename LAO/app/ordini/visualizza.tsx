import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";

import { useOrders } from "@/lib/providers/OrdersProvider";
import type { FulfillmentType, OrderStatus } from "@/lib/models/order";
import * as OrderModel from "@/lib/models/order";
import { updateOrder } from "@/lib/repos/orders.repo";
import { theme } from "@/lib/ui/theme"; // Assicurati di importare il tema
import { s } from "./ordini.styles";

function niceStatus(x: OrderStatus) {
    if (x === "in_prestito") return "in prestito";
    return x;
}

export default function VisualizzaOrdine() {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const orderId = String(id || "");

    const { orders } = useOrders();
    const ord = useMemo(() => orders.find((o) => o.id === orderId), [orders, orderId]);

    const [busy, setBusy] = useState(false);

    const items = useMemo(() => (ord ? OrderModel.getOrderItems(ord) : []), [ord]);

    const totalQty = ord ? OrderModel.getOrderTotalQuantity(ord) : 0;
    const boughtCount = ord ? OrderModel.getOrderBoughtCount(ord) : 0;

    const toBuyCount = ord ? OrderModel.getOrderToBuyCount(ord) : 0;
    const allBought = toBuyCount === 0;

    const purchaseStage = ord ? OrderModel.getOrderPurchaseStage(ord) : "ordine_nuovo";
    const fulfill = ord ? OrderModel.getOrderPendingFulfillmentCounts(ord) : { receive: 0, pickup: 0, total: 0 };

    const fullyDone = ord ? OrderModel.getOrderIsFullyFulfilled(ord) : false;

    async function saveItems(nextItems: any[]) {
        if (!ord) return;

        const patch: any = {
            items: nextItems,
            totalPrice: OrderModel.getOrderTotalPriceFromItems({ ...ord, items: nextItems } as any),
            quantity: OrderModel.getOrderTotalQuantity({ ...ord, items: nextItems } as any),
        };

        if (!ord.orderDateMs) patch.orderDateMs = Date.now();

        await updateOrder(ord.id, patch);
    }

    // FASE 1: ordinato (comprato)
    async function toggleBought(itemId: string, index: number) {
        if (!ord) return;
        if (busy) return;
        if (ord.status !== "ordinato") return;
        if (allBought) return;

        const nextItems = items.map((x) => ({ ...x }));
        const ix = nextItems.findIndex((x) => x.id === itemId);
        if (ix < 0) return;

        const it = nextItems[ix];
        const flags = OrderModel.getOrderBoughtFlagsForItem(it);
        const at = OrderModel.getOrderBoughtAtMsForItem(it);

        const rFlags = OrderModel.getOrderReceivedFlagsForItem(it);
        const rAt = OrderModel.getOrderReceivedAtMsForItem(it);

        const nextValue = !Boolean(flags[index]);
        flags[index] = nextValue;
        at[index] = nextValue ? Date.now() : null;

        if (!nextValue) {
            rFlags[index] = false;
            rAt[index] = null;
        }

        nextItems[ix] = { ...it, boughtFlags: flags, boughtAtMs: at, receivedFlags: rFlags, receivedAtMs: rAt };

        try {
            setBusy(true);
            await saveItems(nextItems);
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare");
        } finally {
            setBusy(false);
        }
    }

    // FASE 2: scegli per ARTICOLO se è da ricevere o da ritirare
    async function setItemFulfillmentType(itemId: string, ft: FulfillmentType) {
        if (!ord) return;
        if (busy) return;
        if (ord.status !== "ordinato") return;
        if (!allBought) return;

        const nextItems = items.map((x) => ({ ...x }));
        const ix = nextItems.findIndex((x) => x.id === itemId);
        if (ix < 0) return;

        nextItems[ix] = { ...nextItems[ix], fulfillmentType: ft };

        try {
            setBusy(true);
            await saveItems(nextItems);
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare");
        } finally {
            setBusy(false);
        }
    }

    // FASE 2: ricevuto/ritirato (per pezzo)
    async function toggleReceived(itemId: string, index: number) {
        if (!ord) return;
        if (busy) return;
        if (ord.status !== "ordinato") return;
        if (!allBought) return;

        const nextItems = items.map((x) => ({ ...x }));
        const ix = nextItems.findIndex((x) => x.id === itemId);
        if (ix < 0) return;

        const it = nextItems[ix];
        const bFlags = OrderModel.getOrderBoughtFlagsForItem(it);

        if (!Boolean(bFlags[index])) return;

        const rFlags = OrderModel.getOrderReceivedFlagsForItem(it);
        const rAt = OrderModel.getOrderReceivedAtMsForItem(it);

        const nextValue = !Boolean(rFlags[index]);
        rFlags[index] = nextValue;
        rAt[index] = nextValue ? Date.now() : null;

        nextItems[ix] = { ...it, receivedFlags: rFlags, receivedAtMs: rAt };

        try {
            setBusy(true);
            await saveItems(nextItems);
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare");
        } finally {
            setBusy(false);
        }
    }

    async function orderAllPieces() {
        if (!ord) return;
        if (busy) return;
        if (ord.status !== "ordinato") return;
        if (allBought) return;

        const now = Date.now();
        const nextItems = items.map((it) => {
            const flags = OrderModel.getOrderBoughtFlagsForItem(it);
            const at = OrderModel.getOrderBoughtAtMsForItem(it);

            for (let i = 0; i < flags.length; i++) {
                if (!flags[i]) {
                    flags[i] = true;
                    at[i] = now;
                }
            }
            return { ...it, boughtFlags: flags, boughtAtMs: at };
        });

        try {
            setBusy(true);
            await saveItems(nextItems);
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare");
        } finally {
            setBusy(false);
        }
    }

    async function fulfillAllPieces() {
        if (!ord) return;
        if (busy) return;
        if (ord.status !== "ordinato") return;
        if (!allBought) return;

        const now = Date.now();
        const nextItems = items.map((it) => {
            const bought = OrderModel.getOrderBoughtFlagsForItem(it);
            const rFlags = OrderModel.getOrderReceivedFlagsForItem(it);
            const rAt = OrderModel.getOrderReceivedAtMsForItem(it);

            for (let i = 0; i < bought.length; i++) {
                if (bought[i] && !rFlags[i]) {
                    rFlags[i] = true;
                    rAt[i] = now;
                }
            }
            return { ...it, receivedFlags: rFlags, receivedAtMs: rAt };
        });

        try {
            setBusy(true);
            await saveItems(nextItems);
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare");
        } finally {
            setBusy(false);
        }
    }

    if (!orderId) {
        return (
            <View style={{ flex: 1, padding: 16 }}>
                <Text style={{ color: theme.colors.text }}>Errore: manca id ordine</Text>
            </View>
        );
    }

    if (!ord) {
        return (
            <View style={{ flex: 1, padding: 16 }}>
                <Text style={{ color: theme.colors.text }}>Caricamento...</Text>
            </View>
        );
    }

    // Stili helper locali per i testi
    const labelStyle = { fontSize: 12, color: theme.colors.muted, fontWeight: "700" as const, textTransform: "uppercase" as const };
    const valueStyle = { color: theme.colors.text, fontWeight: "900" as const, fontSize: 18 };
    const helpStyle = { color: theme.colors.muted, fontSize: 14, fontWeight: "500" as const };

    return (
        <ScrollView contentContainerStyle={s.page}>
            <Text style={[s.title, { color: theme.colors.text }]}>Ordine</Text>

            <View style={[s.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, padding: 16 }]}>
                <Text style={labelStyle}>Ragione sociale</Text>
                <Text style={valueStyle}>{ord.ragioneSociale}</Text>

                <View style={{ height: 12 }} />

                <Text style={helpStyle}>Codice: {ord.code}</Text>
                <Text style={helpStyle}>Stato: {niceStatus(ord.status)}</Text>

                {ord.orderDateMs ? <Text style={helpStyle}>Data: {OrderModel.formatDayFromMs(ord.orderDateMs)}</Text> : null}

                <Text style={helpStyle}>Pezzi: {totalQty}</Text>
                <Text style={helpStyle}>Totale: {ord.totalPrice}</Text>

                {ord.status === "ordinato" ? (
                    <View style={{ marginTop: 20, gap: 10 }}>
                        <Text style={labelStyle}>Fase Attuale</Text>

                        <Text style={{ color: theme.colors.primary, fontWeight: "bold" }}>
                            {OrderModel.formatOrderPurchaseStage(purchaseStage)}
                        </Text>

                        {!allBought ? (
                            <Text style={helpStyle}>
                                Da ordinare: {toBuyCount} (comprati {boughtCount}/{Math.max(0, totalQty)})
                            </Text>
                        ) : (
                            <Text style={helpStyle}>
                                Da ricevere: {fulfill.receive} | Da ritirare: {fulfill.pickup}
                            </Text>
                        )}

                        <View style={s.row}>
                            {!allBought ? (
                                <Pressable onPress={orderAllPieces} disabled={busy} style={s.btnPrimary}>
                                    <Text style={s.btnPrimaryText}>Ordina tutti</Text>
                                </Pressable>
                            ) : (
                                <Pressable onPress={fulfillAllPieces} disabled={busy} style={s.btnPrimary}>
                                    <Text style={s.btnPrimaryText}>Completa tutti</Text>
                                </Pressable>
                            )}
                        </View>

                        {fullyDone ? (
                            <Text style={[helpStyle, { color: theme.colors.primary, fontWeight: "900" }]}>
                                Ordine finito
                            </Text>
                        ) : null}
                    </View>
                ) : null}

                <View style={{ marginTop: 20, gap: 12 }}>
                    <Text style={labelStyle}>Articoli</Text>

                    {items.map((it, itemIndex) => {
                        const title = it.materialName && it.materialName.trim() ? it.materialName : it.materialType;

                        const flags = OrderModel.getOrderBoughtFlagsForItem(it);
                        const at = OrderModel.getOrderBoughtAtMsForItem(it);

                        const rFlags = OrderModel.getOrderReceivedFlagsForItem(it);
                        const rAt = OrderModel.getOrderReceivedAtMsForItem(it);

                        const ft: FulfillmentType = it.fulfillmentType === "pickup" ? "pickup" : "receive";

                        return (
                            <View
                                key={it.id}
                                style={{
                                    borderWidth: 1,
                                    borderColor: theme.colors.border, // Colore bordo corretto
                                    borderRadius: 16,
                                    padding: 12,
                                    backgroundColor: theme.colors.surface2, // Sfondo grigio chiaro invece che trasparente
                                    gap: 10,
                                }}
                            >
                                <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
                                    {itemIndex + 1}) {title}
                                </Text>

                                {it.description ? <Text style={helpStyle}>Descrizione: {it.description}</Text> : null}
                                <Text style={helpStyle}>Distributore: {it.distributorName}</Text>
                                <Text style={helpStyle}>Quantità: {it.quantity}</Text>

                                {/* FASE 2: flags per ARTICOLO (solo quando tutto è comprato) */}
                                {ord.status === "ordinato" && allBought ? (
                                    <View style={s.row}>
                                        <Pressable
                                            onPress={() => setItemFulfillmentType(it.id, "receive")}
                                            disabled={busy}
                                            style={ft === "receive" ? s.btnPrimary : s.btnMuted}
                                        >
                                            <Text style={ft === "receive" ? s.btnPrimaryText : s.btnMutedText}>
                                                Da ricevere
                                            </Text>
                                        </Pressable>

                                        <Pressable
                                            onPress={() => setItemFulfillmentType(it.id, "pickup")}
                                            disabled={busy}
                                            style={ft === "pickup" ? s.btnPrimary : s.btnMuted}
                                        >
                                            <Text style={ft === "pickup" ? s.btnPrimaryText : s.btnMutedText}>
                                                Da ritirare
                                            </Text>
                                        </Pressable>
                                    </View>
                                ) : null}

                                {/* pezzi */}
                                {ord.status === "ordinato" ? (
                                    <View style={{ gap: 8, marginTop: 4 }}>
                                        {Array.from({ length: Math.max(0, it.quantity || 0) }, (_, i) => {
                                            const isBought = Boolean(flags[i]);
                                            const buyDay = OrderModel.formatDayFromMs(at[i] ?? null);

                                            const isReceived = Boolean(rFlags[i]);
                                            const recDay = OrderModel.formatDayFromMs(rAt[i] ?? null);

                                            const rightLabel = ft === "pickup" ? "Ritirato" : "Ricevuto";

                                            return (
                                                <View
                                                    key={i}
                                                    style={{
                                                        borderWidth: 1,
                                                        borderColor: theme.colors.border,
                                                        borderRadius: 14,
                                                        padding: 12,
                                                        backgroundColor: theme.colors.surface, // Sfondo bianco interno
                                                        gap: 10,
                                                    }}
                                                >
                                                    <Text style={{ color: theme.colors.text, fontWeight: "bold" }}>Pezzo {i + 1}</Text>

                                                    {/* FASE 1 */}
                                                    <Pressable
                                                        onPress={() => toggleBought(it.id, i)}
                                                        disabled={busy || allBought}
                                                        style={{
                                                            flexDirection: "row",
                                                            justifyContent: "space-between",
                                                            alignItems: "center",
                                                        }}
                                                    >
                                                        <Text style={helpStyle}>
                                                            {isBought ? `Ordinato: ${buyDay}` : "Da ordinare"}
                                                        </Text>
                                                        <Text style={{ color: isBought ? theme.colors.primary : theme.colors.muted, fontWeight: "900", fontSize: 16 }}>
                                                            {isBought ? "✓" : "○"}
                                                        </Text>
                                                    </Pressable>

                                                    {/* FASE 2 */}
                                                    {allBought ? (
                                                        <Pressable
                                                            onPress={() => toggleReceived(it.id, i)}
                                                            disabled={busy || !isBought}
                                                            style={{
                                                                flexDirection: "row",
                                                                justifyContent: "space-between",
                                                                alignItems: "center",
                                                                marginTop: 4
                                                            }}
                                                        >
                                                            <Text style={helpStyle}>
                                                                {isReceived ? `${rightLabel}: ${recDay}` : `${rightLabel}: no`}
                                                            </Text>
                                                            <Text style={{ color: isReceived ? theme.colors.primary : theme.colors.muted, fontWeight: "900", fontSize: 16 }}>
                                                                {isReceived ? "✓" : "○"}
                                                            </Text>
                                                        </Pressable>
                                                    ) : null}
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : null}
                            </View>
                        );
                    })}
                </View>

                <Pressable onPress={() => router.back()} style={[s.btnMuted, { marginTop: 24 }]}>
                    <Text style={s.btnMutedText}>Indietro</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}