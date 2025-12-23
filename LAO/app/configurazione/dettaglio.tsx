import { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import { updateOrder } from "@/lib/repos/orders.repo";
import { formatOrderStatus } from "@/lib/models/order";

function buildSerialArray(qty: number, existing?: string[]) {
    const arr = Array.from({ length: Math.max(0, qty) }, (_, i) => (existing?.[i] ?? ""));
    return arr;
}

export default function ConfigurazioneDettaglio() {
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

    const [serials, setSerials] = useState<string[]>(() => buildSerialArray(ord.quantity, ord.serialNumbers));

    // se cambia qty (raro), riallineo
    const alignedSerials = useMemo(() => buildSerialArray(ord.quantity, serials), [ord.quantity, serials]);

    function setSerialAt(i: number, v: string) {
        const next = [...alignedSerials];
        next[i] = v;
        setSerials(next);
    }

    function allSerialsOk(arr: string[]) {
        return arr.every((x) => x.trim().length > 0);
    }

    async function saveOnly() {
        try {
            await updateOrder(orderId, { serialNumbers: alignedSerials.map((s) => s.trim()) });
            Alert.alert("Ok", "Seriali salvati");
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare i seriali");
        }
    }

    async function finalize(nextStatus: "venduto" | "in_prestito") {
        const trimmed = alignedSerials.map((s) => s.trim());

        if (!allSerialsOk(trimmed)) {
            Alert.alert("Errore", "Devi inserire tutti i numeri seriali");
            return;
        }

        try {
            await updateOrder(orderId, {
                serialNumbers: trimmed,
                status: nextStatus,
            });

            Alert.alert("Ok", `Stato aggiornato: ${formatOrderStatus(nextStatus)}`);
            router.replace("/(tabs)/configurazione" as any);
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco ad aggiornare lo stato");
        }
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Configurazione</Text>

            <Text style={{ fontWeight: "800" }}>{ord.ragioneSociale}</Text>
            <Text>Materiale: {ord.materialName ?? ord.materialType}</Text>
            <Text>Quantità: {ord.quantity}</Text>
            <Text>Stato attuale: {formatOrderStatus(ord.status)}</Text>
            {ord.description ? <Text>Descrizione: {ord.description}</Text> : null}

            <Text style={{ marginTop: 8, fontWeight: "700" }}>Numeri seriali</Text>
            {alignedSerials.map((val, i) => (
                <View key={i} style={{ gap: 6 }}>
                    <Text>Seriale #{i + 1}</Text>
                    <TextInput
                        value={val}
                        onChangeText={(t) => setSerialAt(i, t)}
                        placeholder={`Seriale ${i + 1}`}
                        autoCapitalize="characters"
                        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
                    />
                </View>
            ))}

            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                <Pressable onPress={saveOnly} style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}>
                    <Text style={{ color: "white", fontWeight: "700" }}>Salva seriali</Text>
                </Pressable>

                <Pressable
                    onPress={() => finalize("venduto")}
                    style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}
                >
                    <Text style={{ color: "white", fontWeight: "700" }}>Venduto</Text>
                </Pressable>

                <Pressable
                    onPress={() => finalize("in_prestito")}
                    style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}
                >
                    <Text style={{ color: "white", fontWeight: "700" }}>In prestito</Text>
                </Pressable>

                <Pressable onPress={() => router.back()} style={{ padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontWeight: "700", textDecorationLine: "underline" }}>Indietro</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}
