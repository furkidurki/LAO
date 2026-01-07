import { useMemo, useState } from "react";
import { Text, TextInput, Pressable, Alert, Platform, ScrollView, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";

import { useDistributors } from "@/lib/providers/DistributorsProvider";
import { useMaterials } from "@/lib/providers/MaterialsProvider";
import { useClients } from "@/lib/providers/ClientsProvider";
import { addOrder } from "@/lib/repos/orders.repo";
import { s } from "./ordini.styles";

const ADD = "__add__";

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

    const [clientId, setClientId] = useState("");
    const selectedClient = useMemo(() => clients.find((c) => c.id === clientId) ?? null, [clientId, clients]);

    const [materialType, setMaterialType] = useState("");
    const materialName = useMemo(() => materials.find((m) => m.id === materialType)?.name ?? "", [materialType, materials]);

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

    function onPickClient(v: string) {
        if (v === ADD) {
            setClientId("");
            router.push({ pathname: "/settings/editClienti" as any, params: { openAdd: "1" } } as any);
            return;
        }
        setClientId(v);
    }

    function onPickMaterial(v: string) {
        if (v === ADD) {
            setMaterialType("");
            router.push({ pathname: "/settings/editMaterials" as any, params: { openAdd: "1" } } as any);
            return;
        }
        setMaterialType(v);
    }

    function onPickDistributor(v: string) {
        if (v === ADD) {
            setDistributorId("");
            router.push({ pathname: "/settings/editDistributori" as any, params: { openAdd: "1" } } as any);
            return;
        }
        setDistributorId(v);
    }

    async function onSave() {
        if (!selectedClient) return showAlert("Errore", "Seleziona una ragione sociale (cliente)");
        if (!materialType) return showAlert("Errore", "Seleziona un tipo materiale");
        if (!distributorId) return showAlert("Errore", "Seleziona un distributore");

        const cleanDesc = description.trim();

        const boughtFlags = Array.from({ length: Math.max(0, quantity) }, () => false);
        const boughtAtMs = Array.from({ length: Math.max(0, quantity) }, () => null);

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

            orderDateMs: Date.now(),
            boughtFlags,
            boughtAtMs,
            flagToReceive: false,
            flagToPickup: false,
        };

        if (cleanDesc.length > 0) payload.description = cleanDesc;

        try {
            await addOrder(payload);
            showAlert("Ok", "Ordine salvato");
            router.replace("/(tabs)/ordini" as any);
        } catch (e) {
            console.log(e);
            showAlert("Errore", "Non riesco a salvare l'ordine");
        }
    }

    return (
        <ScrollView contentContainerStyle={s.page}>
            <Text style={s.title}>Nuovo Ordine</Text>

            <View style={s.card}>
                <Text style={s.label}>Ragione sociale (cliente)</Text>
                <View style={s.pickerBox}>
                    <Picker selectedValue={clientId} onValueChange={(v) => onPickClient(String(v))}>
                        <Picker.Item label="Seleziona..." value="" />
                        <Picker.Item label="+ Aggiungi cliente..." value={ADD} />
                        {clients.map((c) => (
                            <Picker.Item key={c.id} label={c.ragioneSociale} value={c.id} />
                        ))}
                    </Picker>
                </View>

                <Text style={s.label}>Codice cliente (auto)</Text>
                <TextInput value={selectedClient?.code ?? ""} editable={false} style={[s.input, s.inputDisabled]} />

                <Text style={s.label}>Tipo di materiale</Text>
                <View style={s.pickerBox}>
                    <Picker selectedValue={materialType} onValueChange={(v) => onPickMaterial(String(v))}>
                        <Picker.Item label="Seleziona..." value="" />
                        <Picker.Item label="+ Aggiungi materiale..." value={ADD} />
                        {materials.map((m) => (
                            <Picker.Item key={m.id} label={m.name} value={m.id} />
                        ))}
                    </Picker>
                </View>

                <Text style={s.label}>Descrizione (opzionale)</Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Testo..."
                    placeholderTextColor={"rgba(229,231,235,0.70)"}
                    multiline
                    style={[s.input, { minHeight: 80, textAlignVertical: "top" }]}
                />

                <View style={s.row}>
                    <View style={{ flex: 1, minWidth: 180, gap: 8 }}>
                        <Text style={s.label}>Quantità</Text>
                        <TextInput
                            value={quantityStr}
                            onChangeText={setQuantityStr}
                            keyboardType="number-pad"
                            style={s.input}
                        />
                    </View>

                    <View style={{ flex: 1, minWidth: 180, gap: 8 }}>
                        <Text style={s.label}>Prezzo singolo</Text>
                        <TextInput
                            value={unitPriceStr}
                            onChangeText={setUnitPriceStr}
                            keyboardType="decimal-pad"
                            style={s.input}
                        />
                    </View>
                </View>

                <Text style={s.label}>Distributore</Text>
                <View style={s.pickerBox}>
                    <Picker selectedValue={distributorId} onValueChange={(v) => onPickDistributor(String(v))}>
                        <Picker.Item label="Seleziona..." value="" />
                        <Picker.Item label="+ Aggiungi distributore..." value={ADD} />
                        {distributors.map((d) => (
                            <Picker.Item key={d.id} label={d.name} value={d.id} />
                        ))}
                    </Picker>
                </View>

                <Text style={s.label}>Prezzo totale (auto)</Text>
                <TextInput value={money(totalPrice)} editable={false} style={[s.input, s.inputDisabled]} />

                <Pressable onPress={onSave} style={s.btnPrimary}>
                    <Text style={s.btnPrimaryText}>Salva</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}
