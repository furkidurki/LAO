import { useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, TextInput, Pressable, Alert } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router, useLocalSearchParams } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import { useDistributors } from "@/lib/providers/DistributorsProvider";
import { useMaterials } from "@/lib/providers/MaterialsProvider";
import type { OrderStatus } from "@/lib/models/order";
import { updateOrder } from "@/lib/repos/orders.repo";
import { s } from "./ordini.styles";

const EDITABLE_STATUSES: OrderStatus[] = ["ordinato", "arrivato"];
const ADD = "__add__";

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

    const ord = useMemo(() => orders.find((o) => o.id === orderId) ?? null, [orders, orderId]);

    // ✅ hooks sempre chiamati
    const [code, setCode] = useState("");
    const [ragioneSociale, setRagioneSociale] = useState("");
    const [materialType, setMaterialType] = useState("");
    const [description, setDescription] = useState("");
    const [quantityStr, setQuantityStr] = useState("1");
    const [unitPriceStr, setUnitPriceStr] = useState("0");
    const [distributorId, setDistributorId] = useState("");
    const [status, setStatus] = useState<OrderStatus>("ordinato");

    useEffect(() => {
        if (!ord) return;
        setCode(ord.code ?? "");
        setRagioneSociale(ord.ragioneSociale ?? "");
        setMaterialType(ord.materialType ?? "");
        setDescription(ord.description ?? "");
        setQuantityStr(String(ord.quantity ?? 1));
        setUnitPriceStr(String(ord.unitPrice ?? 0));
        setDistributorId(ord.distributorId ?? "");
        setStatus(ord.status === "ordinato" || ord.status === "arrivato" ? ord.status : "ordinato");
    }, [ord]);

    const distributorName = useMemo(
        () => distributors.find((d) => d.id === distributorId)?.name ?? "",
        [distributorId, distributors]
    );

    const materialName = useMemo(
        () => materials.find((m) => m.id === materialType)?.name ?? "",
        [materialType, materials]
    );

    const quantity = Math.max(0, parseInt(quantityStr || "0", 10) || 0);
    const unitPrice = Math.max(0, parseFloat(unitPriceStr || "0") || 0);
    const totalPrice = quantity * unitPrice;

    function onPickMaterial(v: string) {
        if (v === ADD) {
            router.push({ pathname: "/settings/editMaterials" as any, params: { openAdd: "1" } } as any);
            return;
        }
        setMaterialType(v);
    }

    function onPickDistributor(v: string) {
        if (v === ADD) {
            router.push({ pathname: "/settings/editDistributori" as any, params: { openAdd: "1" } } as any);
            return;
        }
        setDistributorId(v);
    }

    async function onSave() {
        if (!orderId) return Alert.alert("Errore", "Manca id ordine");
        if (!code.trim()) return Alert.alert("Errore", "Metti codice cliente");
        if (!ragioneSociale.trim()) return Alert.alert("Errore", "Metti ragione sociale");
        if (!materialType) return Alert.alert("Errore", "Seleziona tipo materiale");
        if (!distributorId) return Alert.alert("Errore", "Seleziona distributore");

        const cleanDesc = description.trim();

        const patch: any = {
            code: code.trim(),
            ragioneSociale: ragioneSociale.trim(),
            materialType,
            materialName,
            quantity,
            distributorId,
            distributorName,
            unitPrice,
            totalPrice,
            status,
        };

        if (cleanDesc.length > 0) patch.description = cleanDesc;
        else patch.description = null;

        try {
            await updateOrder(orderId, patch);

            Alert.alert("Ok", "Ordine aggiornato");
            // ✅ NON andare in configurazione
            router.back();
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare modifiche");
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
                <Text>Caricamento ordine...</Text>
                <Pressable onPress={() => router.back()} style={{ marginTop: 10 }}>
                    <Text style={{ textDecorationLine: "underline" }}>Indietro</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={s.page}>
            <Text style={s.title}>Modifica Ordine</Text>

            <View style={s.card}>
                <Text style={s.label}>Codice cliente</Text>
                <TextInput value={code} onChangeText={setCode} style={s.input} />

                <Text style={s.label}>Ragione sociale</Text>
                <TextInput value={ragioneSociale} onChangeText={setRagioneSociale} style={s.input} />

                <Text style={s.label}>Tipo materiale</Text>
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
                    multiline
                    style={[s.input, { minHeight: 80, textAlignVertical: "top" }]}
                />

                <View style={s.row}>
                    <View style={{ flex: 1, minWidth: 180, gap: 8 }}>
                        <Text style={s.label}>Quantità</Text>
                        <TextInput value={quantityStr} onChangeText={setQuantityStr} keyboardType="number-pad" style={s.input} />
                    </View>

                    <View style={{ flex: 1, minWidth: 180, gap: 8 }}>
                        <Text style={s.label}>Prezzo singolo</Text>
                        <TextInput value={unitPriceStr} onChangeText={setUnitPriceStr} keyboardType="decimal-pad" style={s.input} />
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

                <Text style={s.label}>Stato ordine</Text>
                <View style={s.pickerBox}>
                    <Picker selectedValue={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
                        {EDITABLE_STATUSES.map((x) => (
                            <Picker.Item key={x} label={x} value={x} />
                        ))}
                    </Picker>
                </View>

                <Pressable onPress={onSave} style={s.btnPrimary}>
                    <Text style={s.btnPrimaryText}>Salva Modifiche</Text>
                </Pressable>

                <Pressable onPress={() => router.back()} style={s.btnMuted}>
                    <Text style={s.btnMutedText}>Annulla</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}
