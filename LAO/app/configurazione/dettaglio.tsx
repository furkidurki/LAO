import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Picker } from "@react-native-picker/picker";

import { useOrders } from "@/lib/providers/OrdersProvider";
import type { Order } from "@/lib/models/order";
import type { OrderPiece, PieceStatus } from "@/lib/models/piece";
import { updateOrder } from "@/lib/repos/orders.repo";
import {
    createPiecesBatchUniqueAtomic,
    findExistingSerials,
    subscribePiecesForOrder,
    validateSerialListLocalOrThrow,
} from "@/lib/repos/pieces.repo";

type FinalChoice = "" | "venduto" | "in_prestito";

// accetta "YYYY-MM-DD"
function parseYmdToMs(s: string): number | null {
    const x = s.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return null;
    const [yy, mm, dd] = x.split("-").map((n) => parseInt(n, 10));
    if (!yy || !mm || !dd) return null;
    const d = new Date(yy, mm - 1, dd, 0, 0, 0, 0);
    const ms = d.getTime();
    if (Number.isNaN(ms)) return null;
    return ms;
}

export default function ConfigurazioneDettaglio() {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const orderId = String(id || "");

    const { orders } = useOrders();
    const ord = useMemo(() => orders.find((o) => o.id === orderId), [orders, orderId]);

    const [pieces, setPieces] = useState<OrderPiece[]>([]);
    const [serialInputs, setSerialInputs] = useState<string[]>([]);

    const [finalChoice, setFinalChoice] = useState<FinalChoice>("");
    const [loanStartYmd, setLoanStartYmd] = useState<string>(""); // YYYY-MM-DD

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!orderId) return;
        return subscribePiecesForOrder(orderId, setPieces);
    }, [orderId]);

    useEffect(() => {
        if (!ord) return;
        const n = Math.max(0, ord.quantity || 0);
        setSerialInputs((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? ""));
    }, [ord?.quantity]);

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

    const order: Order = ord;

    // se già ci sono pezzi, blocchiamo (anti-sovrascrittura)
    if (pieces.length > 0) {
        return (
            <View style={{ flex: 1, padding: 16, gap: 10 }}>
                <Text style={{ fontSize: 22, fontWeight: "700" }}>Configurazione</Text>
                <Text>Questo ordine è già stato configurato (seriali già salvati).</Text>

                <Pressable onPress={() => router.back()} style={{ padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontWeight: "700", textDecorationLine: "underline" }}>Indietro</Text>
                </Pressable>
            </View>
        );
    }

    function setSerialAt(i: number, v: string) {
        setSerialInputs((prev) => {
            const next = [...prev];
            next[i] = v;
            return next;
        });
    }

    async function onSaveFinal() {
        if (saving) return;

        if (!finalChoice) {
            Alert.alert("Errore", "Seleziona venduto o prestito");
            return;
        }

        // ✅ controllo locale: vuoti + duplicati dentro input
        try {
            validateSerialListLocalOrThrow(serialInputs);
        } catch (e: any) {
            const msg = String(e?.message || "");
            if (msg.includes("SERIAL_DUPLICATE_LOCAL")) {
                Alert.alert("Errore", "Hai messo due volte lo stesso seriale (duplicato).");
                return;
            }
            if (msg.includes("SERIAL_EMPTY")) {
                Alert.alert("Errore", "Ci sono seriali vuoti/non validi.");
                return;
            }
            Alert.alert("Errore", "Controlla i seriali inseriti.");
            return;
        }

        // ✅ controllo DB PRIMA di salvare (così evitiamo anche di provare a salvare)
        try {
            const existing = await findExistingSerials(serialInputs);
            if (existing.length > 0) {
                Alert.alert("Errore", "Uno o più seriali esistono già (devono essere univoci).");
                return;
            }
        } catch (e: any) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a verificare i seriali. Riprova.");
            return;
        }

        let status: PieceStatus = finalChoice === "venduto" ? "venduto" : "in_prestito";
        let loanStartMs: number | undefined = undefined;

        if (status === "in_prestito") {
            const ms = parseYmdToMs(loanStartYmd);
            if (!ms) {
                Alert.alert("Errore", "Per prestito inserisci una data valida: YYYY-MM-DD");
                return;
            }
            loanStartMs = ms;
        }

        try {
            setSaving(true);

            // 1) crea TUTTI i pezzi in modo atomico (o tutti o nessuno)
            await createPiecesBatchUniqueAtomic({
                order,
                serialNumbers: serialInputs,
                status,
                loanStartMs,
            });

            // 2) aggiorna lo stato ordine -> così sparisce da Configurazione
            await updateOrder(orderId, { status });

            // 3) vai alla pagina giusta
            if (status === "venduto") router.replace("/(tabs)/venduto" as any);
            else router.replace("/(tabs)/prestito" as any);
        } catch (e: any) {
            const msg = String(e?.message || "");

            if (msg.includes("SERIAL_EXISTS")) {
                Alert.alert("Errore", "Uno o più seriali esistono già (devono essere univoci).");
                return;
            }
            if (msg.includes("SERIAL_DUPLICATE_LOCAL")) {
                Alert.alert("Errore", "Hai messo due volte lo stesso seriale (duplicato).");
                return;
            }
            if (msg.includes("SERIAL_EMPTY")) {
                Alert.alert("Errore", "Ci sono seriali vuoti/non validi.");
                return;
            }
            if (msg.includes("SERIAL_COUNT_MISMATCH")) {
                Alert.alert("Errore", "Numero seriali diverso dalla quantità.");
                return;
            }
            if (msg.includes("LOAN_START_REQUIRED")) {
                Alert.alert("Errore", "Data inizio prestito obbligatoria.");
                return;
            }

            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare. Controlla seriali e riprova.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Configurazione</Text>

            <Text style={{ fontWeight: "800" }}>{order.ragioneSociale}</Text>
            <Text>Materiale: {order.materialName ?? order.materialType}</Text>
            <Text>Quantità: {order.quantity}</Text>
            {order.description ? <Text>Descrizione: {order.description}</Text> : null}

            <Text style={{ marginTop: 8, fontWeight: "700" }}>Seriali</Text>

            {Array.from({ length: order.quantity }, (_, i) => (
                <View key={i} style={{ borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 }}>
                    <Text style={{ fontWeight: "700" }}>Pezzo #{i + 1}</Text>
                    <TextInput
                        value={serialInputs[i] ?? ""}
                        onChangeText={(t) => setSerialAt(i, t)}
                        placeholder={`Seriale pezzo ${i + 1}`}
                        autoCapitalize="characters"
                        editable={!saving}
                        style={{
                            borderWidth: 1,
                            padding: 10,
                            borderRadius: 8,
                            opacity: saving ? 0.6 : 1,
                        }}
                    />
                </View>
            ))}

            <Text style={{ marginTop: 8, fontWeight: "700" }}>Stato finale (per tutti)</Text>
            <Picker selectedValue={finalChoice} onValueChange={(v) => setFinalChoice(v as FinalChoice)} enabled={!saving}>
                <Picker.Item label="Seleziona..." value="" />
                <Picker.Item label="Venduto" value="venduto" />
                <Picker.Item label="Prestito" value="in_prestito" />
            </Picker>

            {finalChoice === "in_prestito" ? (
                <>
                    <Text>Data inizio prestito (YYYY-MM-DD)</Text>
                    <TextInput
                        value={loanStartYmd}
                        onChangeText={setLoanStartYmd}
                        placeholder="2025-12-23"
                        editable={!saving}
                        style={{
                            borderWidth: 1,
                            padding: 10,
                            borderRadius: 8,
                            opacity: saving ? 0.6 : 1,
                        }}
                    />
                </>
            ) : null}

            <Pressable
                onPress={onSaveFinal}
                disabled={saving}
                style={{
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: "black",
                    alignSelf: "flex-start",
                    opacity: saving ? 0.6 : 1,
                }}
            >
                <Text style={{ color: "white", fontWeight: "700" }}>{saving ? "Salvataggio..." : "Salva"}</Text>
            </Pressable>

            <Pressable onPress={() => router.back()} style={{ padding: 12, borderRadius: 8 }}>
                <Text style={{ fontWeight: "700", textDecorationLine: "underline" }}>Indietro</Text>
            </Pressable>
        </ScrollView>
    );
}
