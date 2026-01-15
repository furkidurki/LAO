import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { BarcodeScannerModal } from "@/lib/ui/components/BarcodeScannerModal";
import { db } from "@/lib/firebase/firebase";
import { updateWarehouseSerial } from "@/lib/repos/warehouse.repo";
import { s } from "./magazzino.styles";

export default function ModificaMagazzinoSeriale() {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const itemId = String(id || "").trim();

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const [materialLabel, setMaterialLabel] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [serialDesc, setSerialDesc] = useState("");
    const [scanOpen, setScanOpen] = useState(false);

    const [oldSerialLower, setOldSerialLower] = useState("");

    useEffect(() => {
        if (!itemId) return;

        const ref = doc(db, "warehouse", itemId);
        return onSnapshot(
            ref,
            (snap) => {
                if (!snap.exists()) {
                    setLoading(false);
                    return;
                }

                const d = snap.data() as any;

                setMaterialLabel(String(d?.materialLabel ?? ""));
                setSerialNumber(String(d?.serialNumber ?? ""));
                setSerialDesc(String(d?.serialDesc ?? ""));
                setOldSerialLower(String(d?.serialLower ?? ""));

                setLoading(false);
            },
            () => setLoading(false)
        );
    }, [itemId]);

    async function onSave() {
        if (busy) return;

        const sn = serialNumber.trim();
        const desc = serialDesc.trim();

        if (!sn) return Alert.alert("Errore", "Metti il seriale");

        try {
            setBusy(true);

            await updateWarehouseSerial({
                warehouseId: itemId,
                oldSerialLower,
                newSerialNumber: sn,
                serialDesc: desc,
            });

            Alert.alert("Ok", "Salvato");
            router.back();
        } catch (e: any) {
            const msg = String(e?.message || "");
            if (msg.includes("SERIAL_EXISTS")) return Alert.alert("Errore", "Questo seriale esiste già.");
            if (msg.includes("SERIAL_EMPTY")) return Alert.alert("Errore", "Seriale non valido.");
            Alert.alert("Errore", "Non riesco a salvare");
        } finally {
            setBusy(false);
        }
    }

    return (
        <ScrollView contentContainerStyle={s.page}>
            <Text style={s.title}>Modifica seriale</Text>
            <Text style={s.subtitle}>{loading ? "Caricamento..." : materialLabel}</Text>

            <View style={s.card}>
                <Text style={s.lineMuted}>Seriale</Text>

                <View style={s.row}>
                    <TextInput
                        value={serialNumber}
                        onChangeText={setSerialNumber}
                        placeholder="Seriale..."
                        placeholderTextColor={"rgba(229,231,235,0.70)"}
                        style={[s.input, { flex: 1, minWidth: 220 }]}
                        editable={!busy}
                        autoCapitalize="characters"
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
                    placeholder="Descrizione..."
                    placeholderTextColor={"rgba(229,231,235,0.70)"}
                    style={s.input}
                    editable={!busy}
                    multiline
                />

                <View style={s.row}>
                    <Pressable onPress={onSave} disabled={busy || loading} style={s.btnPrimary}>
                        <Text style={s.btnPrimaryText}>{busy ? "Salvo..." : "Salva"}</Text>
                    </Pressable>

                    <Pressable onPress={() => router.back()} disabled={busy} style={s.btnMuted}>
                        <Text style={s.btnMutedText}>Indietro</Text>
                    </Pressable>
                </View>
            </View>
            <BarcodeScannerModal
                visible={scanOpen}
                onClose={() => setScanOpen(false)}
                title="Scansiona seriale"
                onScanned={(value) => {
                    setSerialNumber(String(value ?? "").trim());
                }}
            />

        </ScrollView>
    );
}
