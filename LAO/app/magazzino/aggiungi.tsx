import { useMemo, useState } from "react";
import { Text, TextInput, Pressable, Alert, ScrollView, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import { BarcodeScannerModal } from "@/lib/ui/components/BarcodeScannerModal";

import { useMaterials } from "@/lib/providers/MaterialsProvider";
import { addWarehouseItem } from "@/lib/repos/warehouse.repo";
import { s } from "./magazzino.styles";

const ADD = "__add__";

export default function AggiungiMagazzino() {
    const { materials } = useMaterials();
    const [scanOpen, setScanOpen] = useState(false);

    const [materialId, setMaterialId] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [serialDesc, setSerialDesc] = useState("");
    const [busy, setBusy] = useState(false);

    const materialLabel = useMemo(() => {
        return materials.find((m) => m.id === materialId)?.name ?? "";
    }, [materialId, materials]);

    function onPickMaterial(v: string) {
        if (v === ADD) {
            setMaterialId("");
            router.push({ pathname: "/settings/editMaterials" as any, params: { openAdd: "1" } } as any);
            return;
        }
        setMaterialId(v);
    }

    async function onSave() {
        if (busy) return;

        if (!materialId) return Alert.alert("Errore", "Seleziona un materiale");
        if (!serialNumber.trim()) return Alert.alert("Errore", "Metti un seriale");

        try {
            setBusy(true);

            await addWarehouseItem({
                materialLabel,
                serialNumber: serialNumber.trim(),
                serialDesc: serialDesc.trim(),
            });

            Alert.alert("Ok", "Salvato in magazzino");
            router.back();
        } catch (e: any) {
            const msg = String(e?.message || "");
            if (msg.includes("SERIAL_EXISTS")) return Alert.alert("Errore", "Questo seriale esiste già.");
            if (msg.includes("SERIAL_EMPTY")) return Alert.alert("Errore", "Seriale non valido.");
            if (msg.includes("MATERIAL_REQUIRED")) return Alert.alert("Errore", "Materiale non valido.");
            Alert.alert("Errore", "Non riesco a salvare in magazzino");
        } finally {
            setBusy(false);
        }
    }

    return (
        <ScrollView contentContainerStyle={s.page}>
            <Text style={s.title}>Aggiungi in Magazzino</Text>

            <View style={s.card}>
                <Text style={s.lineMuted}>Materiale</Text>
                <View style={s.pickerBox}>
                    <Picker selectedValue={materialId} onValueChange={(v) => onPickMaterial(String(v))}>
                        <Picker.Item label="Seleziona..." value="" />
                        <Picker.Item label="+ Aggiungi materiale..." value={ADD} />
                        {materials.map((m) => (
                            <Picker.Item key={m.id} label={m.name} value={m.id} />
                        ))}
                    </Picker>
                </View>

                <Text style={s.lineMuted}>Seriale</Text>

                <View style={s.row}>
                    <TextInput
                        value={serialNumber}
                        onChangeText={setSerialNumber}
                        placeholder="Es. ABC123..."
                        placeholderTextColor={"rgba(229,231,235,0.70)"}
                        autoCapitalize="characters"
                        style={[s.input, { flex: 1, minWidth: 220 }]}
                    />

                    <Pressable
                        onPress={() => setScanOpen(true)}
                        disabled={busy}
                        style={s.btnMuted}
                    >
                        <Text style={s.btnMutedText}>Scansiona</Text>
                    </Pressable>
                </View>


                <Text style={s.lineMuted}>Descrizione (opzionale)</Text>
                <TextInput
                    value={serialDesc}
                    onChangeText={setSerialDesc}
                    placeholder="Es. senza alimentatore, graffiato..."
                    placeholderTextColor={"rgba(229,231,235,0.70)"}
                    style={s.input}
                    multiline
                />

                <View style={s.row}>
                    <Pressable onPress={onSave} disabled={busy} style={s.btnPrimary}>
                        <Text style={s.btnPrimaryText}>{busy ? "..." : "Salva"}</Text>
                    </Pressable>

                    <Pressable onPress={() => router.back()} disabled={busy} style={s.btnMuted}>
                        <Text style={s.btnMutedText}>Indietro</Text>
                    </Pressable>
                </View>
                <BarcodeScannerModal
                    visible={scanOpen}
                    onClose={() => setScanOpen(false)}
                    title="Scansiona seriale"
                    onScanned={(value) => {
                        setSerialNumber(String(value ?? "").trim());
                    }}
                />

            </View>
        </ScrollView>
    );
}
