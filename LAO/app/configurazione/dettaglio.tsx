import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import type { Order, OrderStatus } from "@/lib/models/order";
import type { OrderPiece, PieceStatus } from "@/lib/models/piece";
import { updateOrder } from "@/lib/repos/orders.repo";
import {
    createPieceWithUniqueSerial,
    deletePiece,
    normalizeSerial,
    setPiecesStatus,
    subscribePiecesForOrder,
} from "@/lib/repos/pieces.repo";

function niceStatus(s: OrderStatus | PieceStatus) {
    if (s === "in_prestito") return "in prestito";
    return s;
}

export default function ConfigurazioneDettaglio() {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const orderId = String(id || "");

    const { orders } = useOrders();

    const ord = useMemo(() => {
        return orders.find((o) => o.id === orderId);
    }, [orders, orderId]);

    const [pieces, setPieces] = useState<OrderPiece[]>([]);
    const [inputs, setInputs] = useState<string[]>([]);

    useEffect(() => {
        if (!orderId) return;
        return subscribePiecesForOrder(orderId, setPieces);
    }, [orderId]);

    useEffect(() => {
        if (!ord) return;
        setInputs((prev) => {
            const n = Math.max(0, ord.quantity || 0);
            const next = Array.from({ length: n }, (_, i) => prev[i] ?? "");
            return next;
        });
    }, [ord?.quantity]);

    const byIndex = useMemo(() => {
        const m = new Map<number, OrderPiece>();
        for (const p of pieces) m.set(p.index, p);
        return m;
    }, [pieces]);

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

    // ✅ FIX: dopo questo punto TS sa che ord è Order (non undefined)
    const order: Order = ord;

    function setInputAt(i: number, v: string) {
        setInputs((prev) => {
            const next = [...prev];
            next[i] = v;
            return next;
        });
    }

    function validateLocalDuplicates() {
        const seen = new Set<string>();
        for (let i = 0; i < inputs.length; i++) {
            if (byIndex.has(i)) continue;
            const raw = inputs[i].trim();
            if (!raw) continue;
            const key = normalizeSerial(raw);
            if (!key) continue;
            if (seen.has(key)) return { ok: false as const, message: `Seriale duplicato negli input: "${raw}"` };
            seen.add(key);
        }
        return { ok: true as const };
    }

    async function saveOne(i: number) {
        const raw = inputs[i]?.trim() ?? "";
        if (!raw) {
            Alert.alert("Errore", `Inserisci il seriale per il pezzo #${i + 1}`);
            return;
        }

        try {
            await createPieceWithUniqueSerial({ order, index: i, serialNumber: raw });
            setInputAt(i, "");
        } catch (e: any) {
            const msg = String(e?.message || "");
            if (msg.includes("SERIAL_EXISTS")) {
                Alert.alert("Errore", "Questo seriale esiste già (deve essere univoco).");
                return;
            }
            if (msg.includes("SERIAL_EMPTY")) {
                Alert.alert("Errore", "Seriale non valido.");
                return;
            }
            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare questo pezzo.");
        }
    }

    async function saveAllMissing() {
        const dup = validateLocalDuplicates();
        if (!dup.ok) {
            Alert.alert("Errore", dup.message);
            return;
        }

        for (let i = 0; i < inputs.length; i++) {
            if (byIndex.has(i)) continue;
            const raw = inputs[i]?.trim() ?? "";
            if (!raw) {
                Alert.alert("Errore", `Manca il seriale per il pezzo #${i + 1}`);
                return;
            }
        }

        for (let i = 0; i < inputs.length; i++) {
            if (byIndex.has(i)) continue;
            await saveOne(i);
        }
    }

    async function removePiece(i: number) {
        const p = byIndex.get(i);
        if (!p) return;

        try {
            await deletePiece(p.id);
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a eliminare questo pezzo.");
        }
    }

    async function finalize(nextStatus: PieceStatus) {
        if (pieces.length !== order.quantity) {
            Alert.alert("Errore", "Devi salvare tutti i pezzi (tutti i seriali) prima di continuare.");
            return;
        }

        try {
            await updateOrder(orderId, { status: nextStatus });
            await setPiecesStatus(
                pieces.map((p) => p.id),
                nextStatus
            );

            Alert.alert("Ok", `Stato aggiornato: ${niceStatus(nextStatus)}`);
            router.replace("/(tabs)/configurazione" as any);
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a finalizzare.");
        }
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Configurazione</Text>

            <Text style={{ fontWeight: "800" }}>{order.ragioneSociale}</Text>
            <Text>Materiale: {order.materialName ?? order.materialType}</Text>
            <Text>Quantità: {order.quantity}</Text>
            <Text>Stato attuale: {niceStatus(order.status)}</Text>
            {order.description ? <Text>Descrizione: {order.description}</Text> : null}

            <Text style={{ marginTop: 8, fontWeight: "700" }}>Pezzi (1 seriale = 1 pezzo)</Text>

            {Array.from({ length: order.quantity }, (_, i) => {
                const existing = byIndex.get(i);
                return (
                    <View key={i} style={{ borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 }}>
                        <Text style={{ fontWeight: "700" }}>Pezzo #{i + 1}</Text>

                        {existing ? (
                            <>
                                <Text>Seriale: {existing.serialNumber}</Text>
                                <Pressable
                                    onPress={() => removePiece(i)}
                                    style={{ padding: 10, borderRadius: 8, backgroundColor: "red", alignSelf: "flex-start" }}
                                >
                                    <Text style={{ color: "white", fontWeight: "700" }}>Elimina solo questo pezzo</Text>
                                </Pressable>
                            </>
                        ) : (
                            <>
                                <TextInput
                                    value={inputs[i] ?? ""}
                                    onChangeText={(t) => setInputAt(i, t)}
                                    placeholder={`Seriale pezzo ${i + 1}`}
                                    autoCapitalize="characters"
                                    style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
                                />
                                <Pressable
                                    onPress={() => saveOne(i)}
                                    style={{ padding: 10, borderRadius: 8, backgroundColor: "black", alignSelf: "flex-start" }}
                                >
                                    <Text style={{ color: "white", fontWeight: "700" }}>Salva questo pezzo</Text>
                                </Pressable>
                            </>
                        )}
                    </View>
                );
            })}

            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                <Pressable onPress={saveAllMissing} style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}>
                    <Text style={{ color: "white", fontWeight: "700" }}>Salva tutti i pezzi mancanti</Text>
                </Pressable>

                <Pressable onPress={() => finalize("venduto")} style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}>
                    <Text style={{ color: "white", fontWeight: "700" }}>Venduto</Text>
                </Pressable>

                <Pressable onPress={() => finalize("in_prestito")} style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}>
                    <Text style={{ color: "white", fontWeight: "700" }}>In prestito</Text>
                </Pressable>

                <Pressable onPress={() => router.back()} style={{ padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontWeight: "700", textDecorationLine: "underline" }}>Indietro</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}
