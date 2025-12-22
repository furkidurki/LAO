import { useMemo, useState } from "react";
import { ScrollView, View, Text, TextInput, Pressable, Alert } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router, useLocalSearchParams } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import { useDistributors } from "@/lib/providers/DistributorsProvider";
import { useMaterials } from "@/lib/providers/MaterialsProvider";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/models/order";
import { updateOrder } from "@/lib/repos/orders.repo";

function money(n: number) {
    if (!isFinite(n)) return "0";
    return String(Math.round(n * 100) / 100);
}

export default function ModificaOrdine() {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const orderId = String(id || "");

    const { orders } = useOrders();
    const { distributors } = useDistributors();
    const { materials } = useMaterials();

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
                <Text>Caricamento ordine...</Text>
                <Pressable onPress={() => router.back()} style={{ marginTop: 10 }}>
                    <Text style={{ textDecorationLine: "underline" }}>Indietro</Text>
                </Pressable>
            </View>
        );
    }

    // --- stati editabili (prefill)
    const [code, setCode] = useState(ord.code ?? "");
    const [ragioneSociale, setRagioneSociale] = useState(ord.ragioneSociale ?? "");
    const [materialType, setMaterialType] = useState(ord.materialType ?? "");
    const [description, setDescription] = useState(ord.description ?? "");
    const [quantityStr, setQuantityStr] = useState(String(ord.quantity ?? 1));
    const [unitPriceStr, setUnitPriceStr] = useState(String(ord.unitPrice ?? 0));
    const [distributorId, setDistributorId] = useState(ord.distributorId ?? "");
    const [status, setStatus] = useState<OrderStatus>(ord.status ?? "in_consegna");

    const distributorName = useMemo(() => {
        return distributors.find((d) => d.id === distributorId)?.name ?? "";
    }, [distributorId, distributors]);

    const materialName = useMemo(() => {
        return materials.find((m) => m.id === materialType)?.name ?? "";
    }, [materialType, materials]);

    const quantity = Math.max(0, parseInt(quantityStr || "0", 10) || 0);
    const unitPrice = Math.max(0, parseFloat(unitPriceStr || "0") || 0);
    const totalPrice = quantity * unitPrice;

    async function onSave() {
        if (!code.trim()) return Alert.alert("Errore", "Metti codice cliente");
        if (!ragioneSociale.trim()) return Alert.alert("Errore", "Metti ragione sociale");
        if (!materialType) return Alert.alert("Errore", "Seleziona tipo materiale");
        if (!distributorId) return Alert.alert("Errore", "Seleziona distributore");

        try {
            await updateOrder(orderId, {
                code: code.trim(),
                ragioneSociale: ragioneSociale.trim(),
                materialType,
                materialName,
                description: description.trim(),
                quantity,
                distributorId,
                distributorName,
                unitPrice,
                totalPrice,
                status,
            });

            Alert.alert("Ok", "Ordine aggiornato");
            router.back();
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare modifiche");
        }
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Modifica Ordine</Text>

            <Text>Codice cliente</Text>
            <TextInput
                value={code}
                onChangeText={setCode}
                style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
            />

            <Text>Ragione sociale</Text>
            <TextInput
                value={ragioneSociale}
                onChangeText={setRagioneSociale}
                style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
            />

            <Text>Tipo materiale</Text>
            <Picker selectedValue={materialType} onValueChange={(v) => setMaterialType(String(v))}>
                <Picker.Item label="Seleziona..." value="" />
                {materials.map((m) => (
                    <Picker.Item key={m.id} label={m.name} value={m.id} />
                ))}
            </Picker>

            <Text>Descrizione</Text>
            <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                style={{ borderWidth: 1, padding: 10, borderRadius: 8, minHeight: 70 }}
            />

            <Text>Quantità</Text>
            <TextInput
                value={quantityStr}
                onChangeText={setQuantityStr}
                keyboardType="number-pad"
                style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
            />

            <Text>Distributore</Text>
            <Picker selectedValue={distributorId} onValueChange={(v) => setDistributorId(String(v))}>
                <Picker.Item label="Seleziona..." value="" />
                {distributors.map((d) => (
                    <Picker.Item key={d.id} label={d.name} value={d.id} />
                ))}
            </Picker>

            <Text>Prezzo singolo</Text>
            <TextInput
                value={unitPriceStr}
                onChangeText={setUnitPriceStr}
                keyboardType="decimal-pad"
                style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
            />

            <Text>Prezzo totale (auto)</Text>
            <TextInput
                value={money(totalPrice)}
                editable={false}
                style={{ borderWidth: 1, padding: 10, borderRadius: 8, opacity: 0.7 }}
            />

            <Text>Stato ordine</Text>
            <Picker selectedValue={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
                {ORDER_STATUSES.map((s) => (
                    <Picker.Item key={s} label={s} value={s} />
                ))}
            </Picker>

            <Pressable
                onPress={onSave}
                style={{ padding: 12, borderRadius: 8, backgroundColor: "black", alignSelf: "flex-start" }}
            >
                <Text style={{ color: "white", fontWeight: "700" }}>Salva Modifiche</Text>
            </Pressable>
        </ScrollView>
    );
}
