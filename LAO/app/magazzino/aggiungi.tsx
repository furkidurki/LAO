import { useMemo, useState } from "react";
import { Text, TextInput, Pressable, Alert, ScrollView, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";

import { useDistributors } from "@/lib/providers/DistributorsProvider";
import { useMaterials } from "@/lib/providers/MaterialsProvider";
import { addInventoryItem } from "@/lib/repos/inventory.repo";
import { s } from "./magazzino.styles";

const ADD = "__add__";

function money(n: number) {
    if (!isFinite(n)) return "0";
    return String(Math.round(n * 100) / 100);
}

export default function AggiungiMagazzino() {
    const { distributors } = useDistributors();
    const { materials } = useMaterials();

    const [lastClientCode, setLastClientCode] = useState("");
    const [lastClientRagioneSociale, setLastClientRagioneSociale] = useState("");

    const [description, setDescription] = useState("");
    const [quantityStr, setQuantityStr] = useState("1");
    const [unitPriceStr, setUnitPriceStr] = useState("0");
    const [materialType, setMaterialType] = useState("");
    const [distributorId, setDistributorId] = useState("");

    const distributorName = useMemo(() => {
        return distributors.find((d) => d.id === distributorId)?.name ?? "";
    }, [distributorId, distributors]);

    const quantity = Math.max(0, parseInt(quantityStr || "0", 10) || 0);
    const unitPrice = Math.max(0, parseFloat(unitPriceStr || "0") || 0);
    const totalPrice = quantity * unitPrice;

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
        if (!lastClientCode.trim()) return Alert.alert("Errore", "Metti codice ultimo cliente");
        if (!lastClientRagioneSociale.trim()) return Alert.alert("Errore", "Metti ragione sociale");
        if (!materialType) return Alert.alert("Errore", "Seleziona un materiale");
        if (!distributorId) return Alert.alert("Errore", "Seleziona un distributore");

        try {
            await addInventoryItem({
                lastClientCode: lastClientCode.trim(),
                lastClientRagioneSociale: lastClientRagioneSociale.trim(),
                materialType,
                description: description.trim(),
                quantity,
                distributorId,
                distributorName,
                unitPrice,
                totalPrice,
            });

            Alert.alert("Ok", "Salvato in magazzino");
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare in magazzino");
        }
    }

    return (
        <ScrollView contentContainerStyle={s.page}>
            <Text style={s.title}>Aggiungi in Magazzino</Text>

            <View style={s.card}>
                <Text style={s.lineMuted}>Codice (ultimo cliente)</Text>
                <TextInput value={lastClientCode} onChangeText={setLastClientCode} style={s.input} />

                <Text style={s.lineMuted}>Ragione sociale (ultimo cliente)</Text>
                <TextInput value={lastClientRagioneSociale} onChangeText={setLastClientRagioneSociale} style={s.input} />

                <Text style={s.lineMuted}>Materiale</Text>
                <View style={s.pickerBox}>
                    <Picker selectedValue={materialType} onValueChange={(v) => onPickMaterial(String(v))}>
                        <Picker.Item label="Seleziona..." value="" />
                        <Picker.Item label="+ Aggiungi materiale..." value={ADD} />
                        {materials.map((m) => (
                            <Picker.Item key={m.id} label={m.name} value={m.id} />
                        ))}
                    </Picker>
                </View>

                <Text style={s.lineMuted}>Descrizione</Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    placeholder="Testo..."
                    placeholderTextColor={"rgba(229,231,235,0.70)"}
                    style={[s.input, { minHeight: 80, textAlignVertical: "top" }]}
                />

                <Text style={s.lineMuted}>Quantità</Text>
                <TextInput value={quantityStr} onChangeText={setQuantityStr} keyboardType="number-pad" style={s.input} />

                <Text style={s.lineMuted}>Distributore</Text>
                <View style={s.pickerBox}>
                    <Picker selectedValue={distributorId} onValueChange={(v) => onPickDistributor(String(v))}>
                        <Picker.Item label="Seleziona..." value="" />
                        <Picker.Item label="+ Aggiungi distributore..." value={ADD} />
                        {distributors.map((d) => (
                            <Picker.Item key={d.id} label={d.name} value={d.id} />
                        ))}
                    </Picker>
                </View>

                <Text style={s.lineMuted}>Prezzo singolo</Text>
                <TextInput value={unitPriceStr} onChangeText={setUnitPriceStr} keyboardType="decimal-pad" style={s.input} />

                <Text style={s.lineMuted}>Prezzo totale (auto)</Text>
                <TextInput value={money(totalPrice)} editable={false} style={[s.input, s.inputDisabled]} />

                <View style={s.row}>
                    <Pressable onPress={onSave} style={s.btnPrimary}>
                        <Text style={s.btnPrimaryText}>Salva</Text>
                    </Pressable>

                    <Pressable onPress={() => router.back()} style={s.btnMuted}>
                        <Text style={s.btnMutedText}>Indietro</Text>
                    </Pressable>
                </View>
            </View>
        </ScrollView>
    );
}
