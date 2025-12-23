import { View, Text, Pressable, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";

import { useOrders } from "@/lib/providers/OrdersProvider";
import type { OrderStatus } from "@/lib/models/order";
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

    return (
        <ScrollView contentContainerStyle={s.page}>
            <Text style={s.title}>Visualizza Ordine</Text>

            <View style={s.card}>
                <Text style={[s.label, { fontSize: 12 }]}>Ragione sociale</Text>
                <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>{ord.ragioneSociale}</Text>

                <Text style={s.help}>Codice cliente: {ord.code}</Text>
                <Text style={s.help}>Stato: {niceStatus(ord.status)}</Text>

                <Text style={s.help}>Materiale: {ord.materialName ?? ord.materialType}</Text>
                <Text style={s.help}>Quantità: {ord.quantity}</Text>

                <Text style={s.help}>Distributore: {ord.distributorName}</Text>
                <Text style={s.help}>Prezzo singolo: {ord.unitPrice}</Text>
                <Text style={s.help}>Prezzo totale: {ord.totalPrice}</Text>

                <Text style={s.help}>Descrizione: {ord.description ? ord.description : "-"}</Text>

                <Pressable onPress={() => router.back()} style={s.btnMuted}>
                    <Text style={s.btnMutedText}>Indietro</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}
