import { useMemo, useState } from "react";
import { Text, TextInput, Pressable, Alert, Platform, ScrollView } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";

import { useDistributors } from "@/lib/providers/DistributorsProvider";
import { useMaterials } from "@/lib/providers/MaterialsProvider";
import { useClients } from "@/lib/providers/ClientsProvider";
import { addOrder } from "@/lib/repos/orders.repo";

function money(n: number) {
    if (!isFinite(n)) return "0";
    return String(Math.round(n * 100) / 100);
}

function showAlert(title: string, msg: string) {
    if (Platform.OS === "web") window.alert(`${title}\n\n${msg}`);
    else Alert.alert(title, msg);
}

const ADD_CLIENT = "__add_client__";
const ADD_MATERIAL = "__add_material__";
const ADD_DISTRIBUTOR = "__add_distributor__";

export default function NuovoOrdine() {
    const { distributors } = useDistributors();
    const { materials } = useMaterials();
    const { clients } = useClients();

    const [clientId, setClientId] = useState("");
    const selectedClient = useMemo(
        () => clients.find((c) => c.id === clientId) ?? null,
        [clientId, clients]
    );

    const [materialType, setMaterialType] = useState("");
    const materialName = useMemo(
        () => materials.find((m) => m.id === materialType)?.name ?? "",
        [materialType, materials]
    );

    const [description, setDescription] = useState("");
    const [quantityStr, setQuantityStr] = useState("1");
    const [unitPriceStr, setUnitPriceStr] = useState("0");

    const [distributorId, setDistributorId] = useState("");
    const distributorName = useMemo(
        () => distributors.find((d) => d.id === distributorId)?.name ?? "",
        [distributorId, distributors]
    );

    const quantity = Math.max(0, parseInt(quantityStr || "0", 10) || 0);
    const unitPrice = Math.max(0, parseFloat(unitPriceStr || "0") || 0);
    const totalPrice = quantity * unitPrice;

    async function onSave() {
        if (!selectedClient) return showAlert("Errore", "Seleziona una ragione sociale (cliente)");
        if (!materialType) return showAlert("Errore", "Seleziona un tipo materiale");
        if (!distributorId) return showAlert("Errore", "Seleziona un distributore");

        const cleanDesc = description.trim();

        const payload: any = {
            clientId: selectedClient.id,
            code: selectedClient.code,
            ragioneSociale: selectedClient.ragioneSociale,

            materialType,
            materialName,

            quantity,

            distributorId,
            distributorName,

            unitPrice,
            totalPrice,

            status: "ordinato",
        };

        if (cleanDesc.length > 0) payload.description = cleanDesc;

        try {
            await addOrder(payload);
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

            <Text>Ragione sociale (cliente)</Text>
            <Picker
                selectedValue={clientId}
                onValueChange={(v) => {
                    const val = String(v);
                    if (val === ADD_CLIENT) {
                        router.push({ pathname: "/settings/editClienti" as any, params: { openAdd: "1" } } as any);
                        return;
                    }
                    setClientId(val);
                }}
            >
                <Picker.Item label="Seleziona..." value="" />
                <Picker.Item label="➕ Aggiungi cliente..." value={ADD_CLIENT} />
                {clients.map((c) => (
                    <Picker.Item key={c.id} label={c.ragioneSociale} value={c.id} />
                ))}
            </Picker>

            <Text>Codice cliente (auto)</Text>
            <TextInput
                value={selectedClient?.code ?? ""}
                editable={false}
                style={{ borderWidth: 1, padding: 10, borderRadius: 8, opacity: 0.7 }}
            />

            <Text>Tipo di materiale</Text>
            <Picker
                selectedValue={materialType}
                onValueChange={(v) => {
                    const val = String(v);
                    if (val === ADD_MATERIAL) {
                        router.push({ pathname: "/settings/editMaterials" as any, params: { openAdd: "1" } } as any);
                        return;
                    }
                    setMaterialType(val);
                }}
            >
                <Picker.Item label="Seleziona..." value="" />
                <Picker.Item label="➕ Aggiungi materiale..." value={ADD_MATERIAL} />
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
            <Picker
                selectedValue={distributorId}
                onValueChange={(v) => {
                    const val = String(v);
                    if (val === ADD_DISTRIBUTOR) {
                        router.push(
                            { pathname: "/settings/editDistributori" as any, params: { openAdd: "1" } } as any
                        );
                        return;
                    }
                    setDistributorId(val);
                }}
            >
                <Picker.Item label="Seleziona..." value="" />
                <Picker.Item label="➕ Aggiungi distributore..." value={ADD_DISTRIBUTOR} />
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

            <Pressable onPress={onSave} style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}>
                <Text style={{ color: "white", fontWeight: "700" }}>Salva</Text>
            </Pressable>
        </ScrollView>
    );
}
