import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";

import { useOrders } from "@/lib/providers/OrdersProvider";
import type { Order } from "@/lib/models/order";
import type { OrderPiece, PieceStatus } from "@/lib/models/piece";
import { updateOrder } from "@/lib/repos/orders.repo";
import { createPiecesBatchUniqueAtomic, subscribePiecesForOrder } from "@/lib/repos/pieces.repo";

import { s } from "./configurazione.styles";
import { BarcodeScannerModal } from "@/lib/ui/components/BarcodeScannerModal";

type FinalChoice = "" | "venduto" | "in_prestito";

// accetta "YYYY-MM-DD"
function parseYmdToMs(sx: string): number | null {
    const x = sx.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return null;
    const [yy, mm, dd] = x.split("-").map((n) => parseInt(n, 10));
    if (!yy || !mm || !dd) return null;
    const d = new Date(yy, mm - 1, dd, 0, 0, 0, 0);
    const ms = d.getTime();
    if (Number.isNaN(ms)) return null;
    return ms;
}

function normalizeSerial(raw: string): string {
    // seriali spesso arrivano con spazi o newline, qui li puliamo
    return String(raw ?? "")
        .trim()
        .replace(/\s+/g, "")
        .toUpperCase();
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

    // SCAN
    const [scanIndex, setScanIndex] = useState<number | null>(null);

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
            <ScrollView contentContainerStyle={s.page}>
                <Text style={s.title}>Configurazione</Text>
                <View style={s.card}>
                    <Text style={s.warn}>Questo ordine è già stato configurato (seriali già salvati).</Text>

                    <Pressable onPress={() => router.back()} style={s.btnMuted}>
                        <Text style={s.btnMutedText}>Indietro</Text>
                    </Pressable>
                </View>
            </ScrollView>
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

        // seriali tutti presenti
        for (let i = 0; i < serialInputs.length; i++) {
            if (!serialInputs[i]?.trim()) {
                Alert.alert("Errore", `Manca il seriale per il pezzo #${i + 1}`);
                return;
            }
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

            if (msg.includes("SERIAL_EXISTS")) return Alert.alert("Errore", "Uno o più seriali esistono già (devono essere univoci).");
            if (msg.includes("SERIAL_DUPLICATE_LOCAL")) return Alert.alert("Errore", "Hai messo due volte lo stesso seriale (duplicato).");
            if (msg.includes("SERIAL_EMPTY")) return Alert.alert("Errore", "Ci sono seriali vuoti/non validi.");
            if (msg.includes("SERIAL_COUNT_MISMATCH")) return Alert.alert("Errore", "Numero seriali diverso dalla quantità.");
            if (msg.includes("LOAN_START_REQUIRED")) return Alert.alert("Errore", "Data inizio prestito obbligatoria.");

            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare. Controlla seriali e riprova.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <ScrollView contentContainerStyle={s.page}>
            <Text style={s.title}>Configurazione</Text>

            <View style={s.card}>
                <Text style={s.line}>{order.ragioneSociale}</Text>
                <Text style={s.subtitle}>Materiale: {order.materialName ?? order.materialType}</Text>
                <Text style={s.subtitle}>Quantità: {order.quantity}</Text>
                {order.description ? <Text style={s.subtitle}>Descrizione: {order.description}</Text> : null}
            </View>

            <Text style={s.label}>Seriali</Text>

            {Array.from({ length: order.quantity }, (_, i) => (
                <View key={i} style={s.pieceCard}>
                    <Text style={s.line}>Pezzo #{i + 1}</Text>

                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                        <View style={{ flex: 1 }}>
                            <TextInput
                                value={serialInputs[i] ?? ""}
                                onChangeText={(t) => setSerialAt(i, t)}
                                placeholder={`Seriale pezzo ${i + 1}`}
                                placeholderTextColor={"rgba(229,231,235,0.70)"}
                                autoCapitalize="characters"
                                editable={!saving}
                                style={[s.input, saving ? s.inputDisabled : null]}
                            />
                        </View>

                        <Pressable
                            onPress={() => setScanIndex(i)}
                            disabled={saving}
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 12,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "rgba(59,130,246,0.18)",
                                borderWidth: 1,
                                borderColor: "rgba(59,130,246,0.35)",
                            }}
                        >
                            <Ionicons name="barcode-outline" size={22} color={"rgba(229,231,235,0.95)"} />
                        </Pressable>
                    </View>

                    <Text style={{ marginTop: 8, color: "rgba(229,231,235,0.65)" }}>
                        Premi l’icona per scansionare il barcode.
                    </Text>
                </View>
            ))}

            <Text style={s.label}>Stato finale (per tutti)</Text>
            <View style={s.pickerBox}>
                <Picker selectedValue={finalChoice} onValueChange={(v) => setFinalChoice(v as FinalChoice)} enabled={!saving}>
                    <Picker.Item label="Seleziona..." value="" />
                    <Picker.Item label="Venduto" value="venduto" />
                    <Picker.Item label="Prestito" value="in_prestito" />
                </Picker>
            </View>

            {finalChoice === "in_prestito" ? (
                <View style={s.card}>
                    <Text style={s.label}>Data inizio prestito (YYYY-MM-DD)</Text>
                    <TextInput
                        value={loanStartYmd}
                        onChangeText={setLoanStartYmd}
                        placeholder="2025-12-23"
                        placeholderTextColor={"rgba(229,231,235,0.70)"}
                        editable={!saving}
                        style={[s.input, saving ? s.inputDisabled : null]}
                    />
                </View>
            ) : null}

            <View style={s.row}>
                <Pressable onPress={onSaveFinal} disabled={saving} style={s.btnPrimary}>
                    <Text style={s.btnPrimaryText}>{saving ? "Salvataggio..." : "Salva"}</Text>
                </Pressable>

                <Pressable onPress={() => router.back()} style={s.btnMuted}>
                    <Text style={s.btnMutedText}>Indietro</Text>
                </Pressable>
            </View>

            <BarcodeScannerModal
                visible={scanIndex !== null}
                onClose={() => setScanIndex(null)}
                title={scanIndex !== null ? `Scansiona pezzo #${scanIndex + 1}` : "Scansiona"}
                onScanned={(value) => {
                    const v = normalizeSerial(value);
                    if (scanIndex === null) return;
                    setSerialAt(scanIndex, v);
                }}
            />
        </ScrollView>
    );
}
