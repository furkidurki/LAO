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

    const boughtFlags = useMemo(() => (ord ? OrderModel.getOrderBoughtFlags(ord) : []), [ord]);
    const boughtAtMs = useMemo(() => (ord ? OrderModel.getOrderBoughtAtMs(ord) : []), [ord]);

    const boughtCount = ord ? OrderModel.getOrderBoughtCount(ord) : 0;
    const purchaseStage = ord ? OrderModel.getOrderPurchaseStage(ord) : "ordine_nuovo";

    async function toggleBought(index: number) {
        if (!ord) return;
        if (busy) return;
        if (ord.status !== "ordinato") return;

        const nextFlags = [...boughtFlags];
        const nextAt = [...boughtAtMs];

        const nextValue = !Boolean(nextFlags[index]);
        nextFlags[index] = nextValue;
        nextAt[index] = nextValue ? Date.now() : null;

        try {
            setBusy(true);
            const patch: any = {
                boughtFlags: nextFlags,
                boughtAtMs: nextAt,
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

    return (
        <ScrollView contentContainerStyle={s.page}>
            <Text style={s.title}>Visualizza Ordine</Text>

            <View style={s.card}>
                <Text style={[s.label, { fontSize: 12 }]}>Ragione sociale</Text>
                <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>{ord.ragioneSociale}</Text>

                <Text style={s.help}>Codice cliente: {ord.code}</Text>
                <Text style={s.help}>Stato: {niceStatus(ord.status)}</Text>

                {ord.orderDateMs ? <Text style={s.help}>Data ordine: {OrderModel.formatDayFromMs(ord.orderDateMs)}</Text> : null}

                <Text style={s.help}>Materiale: {ord.materialName ?? ord.materialType}</Text>
                <Text style={s.help}>Quantità: {ord.quantity}</Text>

                <Text style={s.help}>Distributore: {ord.distributorName}</Text>
                <Text style={s.help}>Prezzo singolo: {ord.unitPrice}</Text>
                <Text style={s.help}>Prezzo totale: {ord.totalPrice}</Text>

                <Text style={s.help}>Descrizione: {ord.description ? ord.description : "-"}</Text>

                {showPurchaseSection ? (
                    <View style={{ marginTop: 10, gap: 10 }}>
                        <Text style={[s.label, { fontSize: 12 }]}>Acquisto</Text>

                        <Text style={s.help}>Stato acquisto: {OrderModel.formatOrderPurchaseStage(purchaseStage)}</Text>
                        <Text style={s.help}>
                            Comprati: {boughtCount} / {Math.max(0, ord.quantity || 0)}
                        </Text>

                        <View style={s.row}>
                            <Pressable onPress={() => toggleFlag("flagToReceive")} disabled={busy} style={s.btnMuted}>
                                <Text style={s.btnMutedText}>Da ricevere: {ord.flagToReceive ? "si" : "no"}</Text>
                            </Pressable>

                            <Pressable onPress={() => toggleFlag("flagToPickup")} disabled={busy} style={s.btnMuted}>
                                <Text style={s.btnMutedText}>Da ritirare: {ord.flagToPickup ? "si" : "no"}</Text>
                            </Pressable>
                        </View>

                        <View style={{ gap: 8 }}>
                            {Array.from({ length: Math.max(0, ord.quantity || 0) }, (_, i) => {
                                const isBought = Boolean(boughtFlags[i]);
                                const day = OrderModel.formatDayFromMs(boughtAtMs[i] ?? null);

                                return (
                                    <Pressable
                                        key={i}
                                        onPress={() => toggleBought(i)}
                                        disabled={busy}
                                        style={{
                                            borderWidth: 1,
                                            borderColor: "rgba(255,255,255,0.12)",
                                            borderRadius: 14,
                                            padding: 12,
                                            backgroundColor: "rgba(255,255,255,0.04)",
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: 12,
                                        }}
                                    >
                                        <View style={{ flex: 1, gap: 4 }}>
                                            <Text style={{ color: "white", fontWeight: "900" }}>Articolo {i + 1}</Text>
                                            <Text style={s.help}>{isBought ? `Comprato: ${day}` : "Non comprato"}</Text>
                                        </View>

                                        <Text style={{ color: "white", fontWeight: "900" }}>{isBought ? "[x]" : "[ ]"}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                ) : null}

                <Pressable onPress={() => router.back()} style={s.btnMuted}>
                    <Text style={s.btnMutedText}>Indietro</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}
