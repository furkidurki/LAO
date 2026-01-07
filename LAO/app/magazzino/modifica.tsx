import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "@/lib/firebase/firebase";
import { updateWarehouseItem } from "@/lib/repos/warehouse.repo";
import { s } from "./magazzino.styles";

export default function ModificaMagazzinoItem() {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const itemId = String(id || "");

    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const [materialLabel, setMaterialLabel] = useState("");
    const [serialNumber, setSerialNumber] = useState("");

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
                setLoading(false);
            },
            () => {
                setLoading(false);
            }
        );
    }, [itemId]);

    async function onSave() {
        if (busy) return;

        const ml = materialLabel.trim();
        const sn = serialNumber.trim();

        if (!ml) return Alert.alert("Errore", "Metti il nome del materiale");
        if (!sn) return Alert.alert("Errore", "Metti il seriale");

        try {
            setBusy(true);

            await updateWarehouseItem({
                id: itemId,
                materialLabel: ml,
                serialNumber: sn,
            });

            Alert.alert("Ok", "Modificato");
            router.back();
        } catch (e: any) {
            console.log(e);

            const msg = String(e?.message || "");
            if (msg.includes("SERIAL_EXISTS")) return Alert.alert("Errore", "Questo seriale esiste già.");
            if (msg.includes("SERIAL_EMPTY")) return Alert.alert("Errore", "Seriale non valido.");
            if (msg.includes("MATERIAL_REQUIRED")) return Alert.alert("Errore", "Nome materiale non valido.");
            if (msg.includes("NOT_FOUND")) return Alert.alert("Errore", "Oggetto non trovato.");

            Alert.alert("Errore", "Non riesco a salvare la modifica");
        } finally {
            setBusy(false);
        }
    }

    return (
        <View style={s.page}>
            <Text style={s.title}>Modifica pezzo</Text>
            <Text style={s.subtitle}>{loading ? "Caricamento..." : "Modifica nome e seriale"}</Text>

            <View style={s.card}>
                <Text style={s.lineMuted}>Nome / descrizione materiale</Text>
                <TextInput
                    value={materialLabel}
                    onChangeText={setMaterialLabel}
                    placeholder="Es. Router WiFi..."
                    placeholderTextColor={"rgba(229,231,235,0.70)"}
                    style={s.input}
                    editable={!busy}
                />

                <Text style={s.lineMuted}>Seriale</Text>
                <TextInput
                    value={serialNumber}
                    onChangeText={setSerialNumber}
                    placeholder="Es. ABC123..."
                    placeholderTextColor={"rgba(229,231,235,0.70)"}
                    autoCapitalize="characters"
                    style={s.input}
                    editable={!busy}
                />

                <View style={s.row}>
                    <Pressable onPress={onSave} disabled={busy || loading} style={s.btnPrimary}>
                        <Text style={s.btnPrimaryText}>{busy ? "..." : "Salva"}</Text>
                    </Pressable>

                    <Pressable onPress={() => router.back()} disabled={busy} style={s.btnMuted}>
                        <Text style={s.btnMutedText}>Indietro</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
