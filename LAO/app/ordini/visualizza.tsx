import { View, Text, Pressable, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";

import { useOrders } from "@/lib/providers/OrdersProvider";
import type { OrderStatus } from "@/lib/models/order";

function niceStatus(s: OrderStatus) {
    if (s === "in_prestito") return "in prestito";
    return s;
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
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Visualizza Ordine</Text>

            <Text style={{ fontWeight: "800" }}>{ord.ragioneSociale}</Text>
            <Text>Codice cliente: {ord.code}</Text>
            <Text>Stato: {niceStatus(ord.status)}</Text>

            <Text>Materiale: {ord.materialName ?? ord.materialType}</Text>
            <Text>Quantità: {ord.quantity}</Text>

            <Text>Distributore: {ord.distributorName}</Text>
            <Text>Prezzo singolo: {ord.unitPrice}</Text>
            <Text>Prezzo totale: {ord.totalPrice}</Text>

            {ord.description ? <Text>Descrizione: {ord.description}</Text> : <Text>Descrizione: -</Text>}

            <Pressable onPress={() => router.back()} style={{ padding: 12, borderRadius: 8 }}>
                <Text style={{ fontWeight: "700", textDecorationLine: "underline" }}>Indietro</Text>
            </Pressable>
        </ScrollView>
    );
}
