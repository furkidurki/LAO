import { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, Pressable, Alert, Platform } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";

import { useDistributors } from "@/lib/providers/DistributorsProvider";
import { useMaterials } from "@/lib/providers/MaterialsProvider";
import { useClients } from "@/lib/providers/ClientsProvider";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/models/order";
import { addOrder } from "@/lib/repos/orders.repo";

function money(n: number) {
    if (!isFinite(n)) return "0";
    return String(Math.round(n * 100) / 100);
}

function showAlert(title: string, msg: string) {
    if (Platform.OS === "web") window.alert(`${title}\n\n${msg}`);
    else Alert.alert(title, msg);
}

export default function NuovoOrdine() {
    const { distributors } = useDistributors();
    const { materials } = useMaterials();
    const { clients } = useClients();

    // ragione sociale (da lista clienti)
    const [ragioneSociale, setRagioneSociale] = useState<string>("");

    // materiale
    const [materialType, setMaterialType] = useState("");
    const materialName = useMemo(
        () => materials.find((m) => m.id === materialType)?.name ?? "",
        [materialType, materials]
    );

    // descrizione (opzionale)
    const [description, setDescription] = useState("");

    // prezzi / quantità
    const [quantityStr, setQuantityStr] = useState("1");
    const [unitPriceStr, setUnitPriceStr] = useState("0");

    // distributore
    const [distributorId, setDistributorId] = useState("");
    const distributorName = useMemo(
        () => distributors.find((d) => d.id === distributorId)?.name ?? "",
        [distributorId, distributors]
    );

    // stato: solo ordinato / consegnato
    const [status, setStatus] = useState<OrderStatus>("ordinato");

    const quantity = Math.max(0, parseInt(quantityStr || "0", 10) || 0);
    const unitPrice = Math.max(0, parseFloat(unitPriceStr || "0") || 0);
    const totalPrice = quantity * unitPrice;

    async function onSave() {
        if (!ragioneSociale.trim()) return showAlert("Errore", "Seleziona una ragione sociale");
        if (!materialType) return showAlert("Errore", "Seleziona un materiale");
        if (!distributorId) return showAlert("Errore", "Seleziona un distributore");

        const cleanDesc = description.trim();

        try {
            await addOrder({
                ragioneSociale: ragioneSociale.trim(),

                materialType,
                materialName,

                description: cleanDesc.length ? cleanDesc : undefined,
                quantity,

                distributorId,
                distributorName,

                unitPrice,
                totalPrice,

                status,
            });

            showAlert("Ok", "Ordine salvato");
            router.replace("/" as any);
        } catch (e) {
            console.log(e);
            showAlert("Errore", "Non riesco a salvare l'ordine");
        }
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Nuovo Ordine</Text>

            <Text>Ragione sociale</Text>
            <Picker selectedValue={ragioneSociale} onValueChange={(v) => setRagioneSociale(String(v))}>
                <Picker.Item label="Seleziona..." value="" />
                {clients.map((c) => (
                    <Picker.Item key={c.id} label={c.ragioneSociale} value={c.ragioneSociale} />
                ))}
            </Picker>

            <Text>Materiale</Text>
            <Picker selectedValue={materialType} onValueChange={(v) => setMaterialType(String(v))}>
                <Picker.Item label="Seleziona..." value="" />
                {materials.map((m) => (
                    <Picker.Item key={m.id} label={m.name} value={m.id} />
                ))}
            </Picker>

            <Text>Descrizione (opzionale)</Text>
            <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Testo..."
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

            <Pressable onPress={onSave} style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}>
                <Text style={{ color: "white", fontWeight: "700" }}>Salva</Text>
            </Pressable>
        </ScrollView>
    );
}
