import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { useOrders } from "@/lib/providers/OrdersProvider";
import type { Order } from "@/lib/models/order";
import type { OrderPiece, PieceStatus } from "@/lib/models/piece";
import { updateOrder } from "@/lib/repos/orders.repo";
import { createPiecesBatchUniqueAtomic, subscribePiecesForOrder } from "@/lib/repos/pieces.repo";

import { s } from "./configurazione.styles";
import { BarcodeScannerModal } from "@/lib/ui/components/BarcodeScannerModal";
import { theme } from "@/lib/ui/theme";

type FinalChoice = "" | "venduto" | "in_prestito";

// accetta "YYYY-MM-DD"
function parseYmdToMs(sx: string): number | null {
    const x = sx.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return null;
    const [yy, mm, dd] = x.split("-");
    const y = Number(yy);
    const m = Number(mm);
    const d = Number(dd);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.getTime();
}

function normalizeSerial(x: string) {
    return String(x || "")
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

    // scanner
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
        const nv = normalizeSerial(v);
        setSerialInputs((prev) => {
            const out = [...prev];
            out[i] = nv;
            return out;
        });
    }

    function validateAllSerials(): string | null {
        const seen = new Set<string>();
        for (let i = 0; i < serialInputs.length; i++) {
            const v = normalizeSerial(serialInputs[i] ?? "");
            if (!v) return `Manca seriale per pezzo #${i + 1}`;
            if (seen.has(v)) return `Seriale duplicato: ${v}`;
            seen.add(v);
        }
        return null;
    }

    async function onSaveFinal() {
        if (saving) return;

        const err = validateAllSerials();
        if (err) {
            Alert.alert("Errore", err);
            return;
        }

        let finalStatus: PieceStatus | null = null;
        let loanStartMs: number | undefined = undefined;

        if (finalChoice === "venduto") finalStatus = "venduto";
        if (finalChoice === "in_prestito") finalStatus = "in_prestito";

        if (!finalStatus) {
            Alert.alert("Errore", "Seleziona stato finale");
            return;
        }

        if (finalStatus === "in_prestito") {
            const ms = parseYmdToMs(loanStartYmd);
            if (!ms) {
                Alert.alert("Errore", "Inserisci data prestito valida (YYYY-MM-DD)");
                return;
            }
            loanStartMs = ms;
        }

        try {
            setSaving(true);

            // ✅ FIX: la funzione prende 1 argomento (oggetto params)
            await createPiecesBatchUniqueAtomic({
                order,
                serialNumbers: serialInputs.map(normalizeSerial),
                status: finalStatus,
                ...(finalStatus === "in_prestito" ? { loanStartMs } : {}),
            });

            await updateOrder(orderId, {
                status: finalStatus,
                configuredAtMs: Date.now(),
            });

            Alert.alert("Ok", "Configurazione salvata");
            router.back();
        } catch (e: any) {
            Alert.alert("Errore", String(e?.message ?? e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <ScrollView contentContainerStyle={s.page}>
            <Text style={s.title}>Configurazione</Text>
            <Text style={s.subtitle}>
                Ordine: {order.ragioneSociale} • Qty: {order.quantity}
            </Text>

            <View style={s.card}>
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
                                    placeholderTextColor={theme.colors.muted}
                                    autoCapitalize="characters"
                                    editable={!saving}
                                    style={[s.input, saving ? s.inputDisabled : null]}
                                />
                            </View>

                            <Pressable
                                onPress={() => setScanIndex(i)}
                                disabled={saving}
                                style={{
                                    height: 44,
                                    paddingHorizontal: 12,
                                    borderRadius: 12,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: "rgba(46,91,255,0.10)",
                                    borderWidth: 1,
                                    borderColor: "rgba(46,91,255,0.30)",
                                }}
                            >
                                <Text style={{ color: theme.colors.primary2, fontWeight: "900" }}>Scansiona</Text>
                            </Pressable>
                        </View>
                    </View>
                ))}
            </View>

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
                        placeholder="2026-01-09"
                        placeholderTextColor={theme.colors.muted}
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
