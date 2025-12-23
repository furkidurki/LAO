import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import type { Order } from "@/lib/models/order";
import type { OrderPiece, PieceStatus } from "@/lib/models/piece";
import {
    createPieceWithUniqueSerial,
    subscribePiecesForOrder,
    updatePieceStatus,
} from "@/lib/repos/pieces.repo";

function niceStatus(s: PieceStatus | string) {
    if (s === "in_prestito") return "in prestito";
    return s;
}

export default function ConfigurazioneDettaglio() {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const orderId = String(id || "");

    const { orders } = useOrders();
    const ord = useMemo(() => orders.find((o) => o.id === orderId), [orders, orderId]);

    const [pieces, setPieces] = useState<OrderPiece[]>([]);
    const [inputs, setInputs] = useState<string[]>([]);
    const [savingIdx, setSavingIdx] = useState<number | null>(null);
    const [changingPieceId, setChangingPieceId] = useState<string | null>(null);

    useEffect(() => {
        if (!orderId) return;
        return subscribePiecesForOrder(orderId, setPieces);
    }, [orderId]);

    useEffect(() => {
        if (!ord) return;
        setInputs((prev) => {
            const n = Math.max(0, ord.quantity || 0);
            return Array.from({ length: n }, (_, i) => prev[i] ?? "");
        });
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

    // mappa: index -> piece
    const pieceByIndex = useMemo(() => {
        const m = new Map<number, OrderPiece>();
        for (const p of pieces) m.set(p.index, p);
        return m;
    }, [pieces]);

    // 🔥 Mostriamo SOLO pezzi "da configurare":
    // - se non esiste -> input
    // - se esiste ma status=arrivato -> mostra seriale + bottoni
    // - se status venduto/in_prestito -> NON mostrare (sparisce)
    const indexesToShow = useMemo(() => {
        const arr: number[] = [];
        for (let i = 0; i < order.quantity; i++) {
            const p = pieceByIndex.get(i);
            if (!p) arr.push(i);
            else if (p.status === "arrivato") arr.push(i);
        }
        return arr;
    }, [order.quantity, pieceByIndex]);

    function setInputAt(i: number, v: string) {
        setInputs((prev) => {
            const next = [...prev];
            next[i] = v;
            return next;
        });
    }

    async function saveOne(i: number) {
        if (savingIdx !== null) return;

        const existing = pieceByIndex.get(i);
        if (existing) return; // già creato

        const raw = (inputs[i] ?? "").trim();
        if (!raw) {
            Alert.alert("Errore", `Inserisci il seriale per il pezzo #${i + 1}`);
            return;
        }

        try {
            setSavingIdx(i);
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
        } finally {
            setSavingIdx(null);
        }
    }

    async function setPieceFinalStatus(piece: OrderPiece, status: PieceStatus) {
        if (changingPieceId) return;

        try {
            setChangingPieceId(piece.id);
            await updatePieceStatus(piece.id, status);

            // ✅ manda alla pagina giusta
            if (status === "venduto") {
                router.push("/(tabs)/venduto" as any);
            } else {
                router.push("/(tabs)/prestito" as any);
            }
            // appena lo status cambia, qui sparisce automaticamente (perché non è più "arrivato")
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare lo stato del pezzo.");
        } finally {
            setChangingPieceId(null);
        }
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Configurazione</Text>

            <Text style={{ fontWeight: "800" }}>{order.ragioneSociale}</Text>
            <Text>Materiale: {order.materialName ?? order.materialType}</Text>
            <Text>Quantità: {order.quantity}</Text>
            {order.description ? <Text>Descrizione: {order.description}</Text> : null}

            <Text style={{ marginTop: 8, fontWeight: "700" }}>Pezzi (1 seriale = 1 pezzo)</Text>

            {indexesToShow.length === 0 ? (
                <Text>Tutti i pezzi sono stati configurati.</Text>
            ) : (
                indexesToShow.map((i) => {
                    const p = pieceByIndex.get(i);
                    const isSavingThis = savingIdx === i;

                    return (
                        <View key={i} style={{ borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 }}>
                            <Text style={{ fontWeight: "700" }}>Pezzo #{i + 1}</Text>

                            {!p ? (
                                <>
                                    <TextInput
                                        value={inputs[i] ?? ""}
                                        onChangeText={(t) => setInputAt(i, t)}
                                        placeholder={`Seriale pezzo ${i + 1}`}
                                        autoCapitalize="characters"
                                        editable={!isSavingThis}
                                        style={{
                                            borderWidth: 1,
                                            padding: 10,
                                            borderRadius: 8,
                                            opacity: isSavingThis ? 0.6 : 1,
                                        }}
                                    />

                                    <Pressable
                                        onPress={() => saveOne(i)}
                                        disabled={isSavingThis}
                                        style={{
                                            padding: 10,
                                            borderRadius: 8,
                                            backgroundColor: "black",
                                            alignSelf: "flex-start",
                                            opacity: isSavingThis ? 0.6 : 1,
                                        }}
                                    >
                                        <Text style={{ color: "white", fontWeight: "700" }}>
                                            {isSavingThis ? "Salvataggio..." : "Salva questo pezzo"}
                                        </Text>
                                    </Pressable>
                                </>
                            ) : (
                                <>
                                    <Text>Seriale: {p.serialNumber}</Text>
                                    <Text>Stato: {niceStatus(p.status)}</Text>

                                    <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                                        <Pressable
                                            onPress={() => setPieceFinalStatus(p, "venduto")}
                                            disabled={changingPieceId === p.id}
                                            style={{
                                                padding: 10,
                                                borderRadius: 8,
                                                backgroundColor: "black",
                                                opacity: changingPieceId === p.id ? 0.6 : 1,
                                            }}
                                        >
                                            <Text style={{ color: "white", fontWeight: "700" }}>Venduto</Text>
                                        </Pressable>

                                        <Pressable
                                            onPress={() => setPieceFinalStatus(p, "in_prestito")}
                                            disabled={changingPieceId === p.id}
                                            style={{
                                                padding: 10,
                                                borderRadius: 8,
                                                backgroundColor: "black",
                                                opacity: changingPieceId === p.id ? 0.6 : 1,
                                            }}
                                        >
                                            <Text style={{ color: "white", fontWeight: "700" }}>In prestito</Text>
                                        </Pressable>
                                    </View>
                                </>
                            )}
                        </View>
                    );
                })
            )}

            <Pressable onPress={() => router.back()} style={{ padding: 12, borderRadius: 8 }}>
                <Text style={{ fontWeight: "700", textDecorationLine: "underline" }}>Indietro</Text>
            </Pressable>
        </ScrollView>
    );
}
