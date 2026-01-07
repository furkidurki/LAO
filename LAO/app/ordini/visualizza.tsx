import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";

import { useOrders } from "@/lib/providers/OrdersProvider";
import type { OrderStatus } from "@/lib/models/order";
import * as OrderModel from "@/lib/models/order";
import { updateOrder } from "@/lib/repos/orders.repo";
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

    const boughtCount = ord ? OrderModel.getOrderBoughtCount(ord) : 0;
    const totalQty = ord ? OrderModel.getOrderTotalQuantity(ord) : 0;
    const purchaseStage = ord ? OrderModel.getOrderPurchaseStage(ord) : "ordine_nuovo";
    const needReceiveCount = ord ? OrderModel.getOrderBoughtNotReceivedCount(ord) : 0;

    async function toggleBought(itemId: string, index: number) {
        if (!ord) return;
        if (busy) return;
        if (ord.status !== "ordinato") return;

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

        // se tolgo "comprato", tolgo anche "ricevuto"
        if (!nextValue) {
            rFlags[index] = false;
            rAt[index] = null;
        }

        nextItems[ix] = { ...it, boughtFlags: flags, boughtAtMs: at, receivedFlags: rFlags, receivedAtMs: rAt };

        try {
            setBusy(true);
            const patch: any = {
                items: nextItems,
                totalPrice: OrderModel.getOrderTotalPriceFromItems({ ...ord, items: nextItems } as any),
                quantity: OrderModel.getOrderTotalQuantity({ ...ord, items: nextItems } as any),
            };

            if (!ord.orderDateMs) patch.orderDateMs = Date.now();

            await updateOrder(ord.id, patch);
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare");
        } finally {
            setBusy(false);
        }
    }

    async function toggleReceived(itemId: string, index: number) {
        if (!ord) return;
        if (busy) return;
        if (ord.status !== "ordinato") return;

        const nextItems = items.map((x) => ({ ...x }));
        const ix = nextItems.findIndex((x) => x.id === itemId);
        if (ix < 0) return;

        const it = nextItems[ix];
        const bFlags = OrderModel.getOrderBoughtFlagsForItem(it);
        const rFlags = OrderModel.getOrderReceivedFlagsForItem(it);
        const rAt = OrderModel.getOrderReceivedAtMsForItem(it);

        // non posso ricevere/ritirare se non è comprato
        if (!Boolean(bFlags[index])) return;

        const nextValue = !Boolean(rFlags[index]);
        rFlags[index] = nextValue;
        rAt[index] = nextValue ? Date.now() : null;

        nextItems[ix] = { ...it, receivedFlags: rFlags, receivedAtMs: rAt };

        try {
            setBusy(true);
            const patch: any = {
                items: nextItems,
                totalPrice: OrderModel.getOrderTotalPriceFromItems({ ...ord, items: nextItems } as any),
                quantity: OrderModel.getOrderTotalQuantity({ ...ord, items: nextItems } as any),
            };

            if (!ord.orderDateMs) patch.orderDateMs = Date.now();

            await updateOrder(ord.id, patch);
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare");
        } finally {
            setBusy(false);
        }
    }

    async function toggleFlag(flag: "flagToReceive" | "flagToPickup") {
        if (!ord) return;
        if (busy) return;

        const next = !Boolean((ord as any)[flag]);

        try {
            setBusy(true);
            await updateOrder(ord.id, { [flag]: next } as any);
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
                <Text>Errore: manca id ordine</Text>
            </View>
        );
    }

    if (!ord) {
        return (
            <View style={{ flex: 1, padding: 16 }}>
                <Text>Caricamento...</Text>
            </View>
        );
    }

    const showPurchaseSection = ord.status === "ordinato";
    const receiveLabel = ord.flagToPickup ? "ritirato" : "ricevuto";

    return (
        <ScrollView contentContainerStyle={s.page}>
            <Text style={s.title}>Visualizza Ordine</Text>

            <View style={s.card}>
                <Text style={[s.label, { fontSize: 12 }]}>Ragione sociale</Text>
                <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>{ord.ragioneSociale}</Text>

                <Text style={s.help}>Codice cliente: {ord.code}</Text>
                <Text style={s.help}>Stato: {niceStatus(ord.status)}</Text>

                {ord.orderDateMs ? <Text style={s.help}>Data ordine: {OrderModel.formatDayFromMs(ord.orderDateMs)}</Text> : null}

                <Text style={s.help}>Pezzi totali: {totalQty}</Text>
                <Text style={s.help}>Totale ordine: {ord.totalPrice}</Text>

                {showPurchaseSection ? (
                    <View style={{ marginTop: 10, gap: 10 }}>
                        <Text style={[s.label, { fontSize: 12 }]}>Acquisto</Text>

                        <Text style={s.help}>Stato acquisto: {OrderModel.formatOrderPurchaseStage(purchaseStage)}</Text>
                        <Text style={s.help}>
                            Comprati: {boughtCount} / {Math.max(0, totalQty || 0)}
                        </Text>

                        <Text style={s.help}>
                            Da {ord.flagToPickup ? "ritirare" : "ricevere"}: {needReceiveCount}
                        </Text>

                        <View style={s.row}>
                            <Pressable onPress={() => toggleFlag("flagToReceive")} disabled={busy} style={s.btnMuted}>
                                <Text style={s.btnMutedText}>Da ricevere: {ord.flagToReceive ? "si" : "no"}</Text>
                            </Pressable>

                            <Pressable onPress={() => toggleFlag("flagToPickup")} disabled={busy} style={s.btnMuted}>
                                <Text style={s.btnMutedText}>Da ritirare: {ord.flagToPickup ? "si" : "no"}</Text>
                            </Pressable>
                        </View>
                    </View>
                ) : null}

                <View style={{ marginTop: 10, gap: 10 }}>
                    <Text style={[s.label, { fontSize: 12 }]}>Articoli</Text>

                    {items.map((it, itemIndex) => {
                        const flags = OrderModel.getOrderBoughtFlagsForItem(it);
                        const at = OrderModel.getOrderBoughtAtMsForItem(it);
                        const bought = OrderModel.getOrderBoughtCountForItem(it);

                        const title = it.materialName && it.materialName.trim() ? it.materialName : it.materialType;

                        return (
                            <View
                                key={it.id}
                                style={{
                                    borderWidth: 1,
                                    borderColor: "rgba(255,255,255,0.12)",
                                    borderRadius: 16,
                                    padding: 12,
                                    backgroundColor: "rgba(255,255,255,0.04)",
                                    gap: 10,
                                }}
                            >
                                <Text style={{ color: "white", fontWeight: "900" }}>
                                    {itemIndex + 1}) {title}
                                </Text>

                                {it.description ? <Text style={s.help}>Descrizione: {it.description}</Text> : null}
                                <Text style={s.help}>Distributore: {it.distributorName}</Text>
                                <Text style={s.help}>Quantità: {it.quantity}</Text>
                                <Text style={s.help}>Prezzo singolo: {it.unitPrice}</Text>
                                <Text style={s.help}>Totale articolo: {it.totalPrice}</Text>

                                {ord.status === "ordinato" ? (
                                    <Text style={s.help}>
                                        Comprati: {bought} / {Math.max(0, it.quantity || 0)}
                                    </Text>
                                ) : null}

                                {ord.status === "ordinato" ? (
                                    <View style={{ gap: 8 }}>
                                        {Array.from({ length: Math.max(0, it.quantity || 0) }, (_, i) => {
                                            const isBought = Boolean(flags[i]);
                                            const day = OrderModel.formatDayFromMs(at[i] ?? null);

                                            const rFlags = OrderModel.getOrderReceivedFlagsForItem(it);
                                            const rAt = OrderModel.getOrderReceivedAtMsForItem(it);
                                            const isReceived = Boolean(rFlags[i]);
                                            const rDay = OrderModel.formatDayFromMs(rAt[i] ?? null);

                                            return (
                                                <View
                                                    key={i}
                                                    style={{
                                                        borderWidth: 1,
                                                        borderColor: "rgba(255,255,255,0.12)",
                                                        borderRadius: 14,
                                                        padding: 12,
                                                        backgroundColor: "rgba(255,255,255,0.04)",
                                                        gap: 10,
                                                    }}
                                                >
                                                    <Text style={{ color: "white", fontWeight: "900" }}>Pezzo {i + 1}</Text>

                                                    <View style={{ flexDirection: "row", gap: 10 }}>
                                                        <Pressable
                                                            onPress={() => toggleBought(it.id, i)}
                                                            disabled={busy}
                                                            style={{
                                                                flex: 1,
                                                                flexDirection: "row",
                                                                justifyContent: "space-between",
                                                                alignItems: "center",
                                                            }}
                                                        >
                                                            <Text style={s.help}>{isBought ? `Comprato: ${day}` : "Non comprato"}</Text>
                                                            <Text style={{ color: "white", fontWeight: "900" }}>{isBought ? "[x]" : "[ ]"}</Text>
                                                        </Pressable>

                                                        <Pressable
                                                            onPress={() => toggleReceived(it.id, i)}
                                                            disabled={busy || !isBought}
                                                            style={{
                                                                flex: 1,
                                                                flexDirection: "row",
                                                                justifyContent: "space-between",
                                                                alignItems: "center",
                                                            }}
                                                        >
                                                            <Text style={s.help}>
                                                                {isReceived ? `${receiveLabel}: ${rDay}` : `${receiveLabel}: no`}
                                                            </Text>
                                                            <Text style={{ color: "white", fontWeight: "900" }}>{isReceived ? "[x]" : "[ ]"}</Text>
                                                        </Pressable>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : null}
                            </View>
                        );
                    })}
                </View>

                <Pressable onPress={() => router.back()} style={s.btnMuted}>
                    <Text style={s.btnMutedText}>Indietro</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}
