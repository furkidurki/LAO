import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, TextInput, Alert } from "react-native";

import type { OrderPiece } from "@/lib/models/piece";
import { deletePieceAndSerial, subscribePiecesByStatus, updatePieceSerial } from "@/lib/repos/pieces.repo";

function fmtDateFromFirestore(ts: any): string {
    if (!ts) return "-";
    if (typeof ts?.toDate === "function") {
        const d = ts.toDate();
        return fmtDate(d);
    }
    if (typeof ts?.seconds === "number") {
        return fmtDate(new Date(ts.seconds * 1000));
    }
    if (typeof ts === "number") return fmtDate(new Date(ts));
    return "-";
}

function fmtDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

type MaterialGroup = { materialLabel: string; items: OrderPiece[] };
type ClientGroup = { ragioneSociale: string; materials: MaterialGroup[] };

export default function VendutoTab() {
    const [pieces, setPieces] = useState<OrderPiece[]>([]);

    // editing
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState<string>("");
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        return subscribePiecesByStatus("venduto", setPieces);
    }, []);

    const grouped: ClientGroup[] = useMemo(() => {
        const byClient = new Map<string, Map<string, OrderPiece[]>>();

        for (const p of pieces) {
            const clientKey = (p.ragioneSociale || "Senza ragione sociale").trim();
            const materialLabel =
                p.materialName && p.materialName.trim().length > 0 ? p.materialName : p.materialType;

            if (!byClient.has(clientKey)) byClient.set(clientKey, new Map());
            const byMat = byClient.get(clientKey)!;

            const matKey = materialLabel || "Materiale";
            if (!byMat.has(matKey)) byMat.set(matKey, []);
            byMat.get(matKey)!.push(p);
        }

        const out: ClientGroup[] = [];
        for (const [ragioneSociale, byMat] of byClient.entries()) {
            const materials: MaterialGroup[] = Array.from(byMat.entries())
                .map(([materialLabel, items]) => ({
                    materialLabel,
                    items: items.slice().sort((a, b) => (a.serialNumber || "").localeCompare(b.serialNumber || "")),
                }))
                .sort((a, b) => a.materialLabel.localeCompare(b.materialLabel));

            out.push({ ragioneSociale, materials });
        }

        out.sort((a, b) => a.ragioneSociale.localeCompare(b.ragioneSociale));
        return out;
    }, [pieces]);

    function startEdit(p: OrderPiece) {
        setEditingId(p.id);
        setEditingValue(p.serialNumber || "");
    }

    function cancelEdit() {
        setEditingId(null);
        setEditingValue("");
    }

    async function saveEdit(p: OrderPiece) {
        if (!editingId) return;
        if (busyId) return;

        const newSerial = editingValue.trim();
        if (!newSerial) {
            Alert.alert("Errore", "Seriale vuoto.");
            return;
        }

        try {
            setBusyId(p.id);

            await updatePieceSerial({
                pieceId: p.id,
                orderId: p.orderId,
                oldSerialLower: p.serialLower,
                newSerialNumber: newSerial,
            });

            cancelEdit();
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
            Alert.alert("Errore", "Non riesco a modificare il seriale.");
        } finally {
            setBusyId(null);
        }
    }

    function confirmDelete(p: OrderPiece) {
        Alert.alert(
            "Elimina pezzo",
            `Vuoi eliminare il pezzo con seriale "${p.serialNumber}"?`,
            [
                { text: "Annulla", style: "cancel" },
                {
                    text: "Elimina",
                    style: "destructive",
                    onPress: () => doDelete(p),
                },
            ]
        );
    }

    async function doDelete(p: OrderPiece) {
        if (busyId) return;
        try {
            setBusyId(p.id);
            await deletePieceAndSerial({ pieceId: p.id, serialLower: p.serialLower });
            // la lista si aggiorna da sola via onSnapshot
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a eliminare il pezzo.");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Venduto</Text>
            <Text style={{ opacity: 0.7 }}>Totale pezzi: {pieces.length}</Text>

            <FlatList
                data={grouped}
                keyExtractor={(x) => x.ragioneSociale}
                renderItem={({ item }) => (
                    <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                        <Text style={{ fontWeight: "800", fontSize: 16 }}>{item.ragioneSociale}</Text>

                        {item.materials.map((m) => (
                            <View key={m.materialLabel} style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1 }}>
                                <Text style={{ fontWeight: "700" }}>
                                    {m.materialLabel} — {m.items.length} pezzi
                                </Text>

                                {m.items.map((p) => {
                                    const isEditing = editingId === p.id;
                                    const isBusy = busyId === p.id;

                                    return (
                                        <View key={p.id} style={{ marginTop: 8, borderWidth: 1, borderRadius: 10, padding: 10 }}>
                                            <Text style={{ fontWeight: "700" }}>Seriale</Text>

                                            {isEditing ? (
                                                <>
                                                    <TextInput
                                                        value={editingValue}
                                                        onChangeText={setEditingValue}
                                                        autoCapitalize="characters"
                                                        editable={!isBusy}
                                                        style={{
                                                            borderWidth: 1,
                                                            padding: 10,
                                                            borderRadius: 8,
                                                            marginTop: 6,
                                                            opacity: isBusy ? 0.6 : 1,
                                                        }}
                                                    />

                                                    <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                                                        <Pressable
                                                            onPress={() => saveEdit(p)}
                                                            disabled={isBusy}
                                                            style={{
                                                                padding: 10,
                                                                borderRadius: 8,
                                                                backgroundColor: "black",
                                                                opacity: isBusy ? 0.6 : 1,
                                                            }}
                                                        >
                                                            <Text style={{ color: "white", fontWeight: "700" }}>
                                                                {isBusy ? "Salvataggio..." : "Salva"}
                                                            </Text>
                                                        </Pressable>

                                                        <Pressable onPress={cancelEdit} disabled={isBusy} style={{ padding: 10, borderRadius: 8 }}>
                                                            <Text style={{ fontWeight: "700", textDecorationLine: "underline" }}>Annulla</Text>
                                                        </Pressable>
                                                    </View>
                                                </>
                                            ) : (
                                                <>
                                                    <Text style={{ marginTop: 6 }}>
                                                        • {p.serialNumber} — Data: {fmtDateFromFirestore(p.createdAt)}
                                                    </Text>

                                                    <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                                                        <Pressable
                                                            onPress={() => startEdit(p)}
                                                            disabled={isBusy}
                                                            style={{
                                                                padding: 10,
                                                                borderRadius: 8,
                                                                backgroundColor: "black",
                                                                opacity: isBusy ? 0.6 : 1,
                                                            }}
                                                        >
                                                            <Text style={{ color: "white", fontWeight: "700" }}>Modifica</Text>
                                                        </Pressable>

                                                        <Pressable
                                                            onPress={() => confirmDelete(p)}
                                                            disabled={isBusy}
                                                            style={{
                                                                padding: 10,
                                                                borderRadius: 8,
                                                                backgroundColor: "red",
                                                                opacity: isBusy ? 0.6 : 1,
                                                            }}
                                                        >
                                                            <Text style={{ color: "white", fontWeight: "700" }}>Elimina</Text>
                                                        </Pressable>
                                                    </View>
                                                </>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                )}
                ListEmptyComponent={<Text>Nessun pezzo venduto </Text>}
            />
        </View>
    );
}
