import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, Alert } from "react-native";

import type { OrderPiece } from "@/lib/models/piece";
import { subscribePiecesByStatus } from "@/lib/repos/pieces.repo";
import { deletePieceOnly } from "@/lib/repos/pieces.repo";
import { movePiecesToWarehouse } from "@/lib/repos/warehouse.repo";

function fmtLoanDate(ms?: number) {
    if (!ms) return "-";
    const d = new Date(ms);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

type MaterialGroup = {
    materialLabel: string;
    items: OrderPiece[];
};

type ClientGroup = {
    ragioneSociale: string;
    materials: MaterialGroup[];
};

export default function PrestitoTab() {
    const [pieces, setPieces] = useState<OrderPiece[]>([]);

    // edit state per ragione sociale
    const [editingClient, setEditingClient] = useState<string | null>(null);
    const [warehouseMode, setWarehouseMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set()); // pieceId
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        return subscribePiecesByStatus("in_prestito", setPieces);
    }, []);

    const grouped: ClientGroup[] = useMemo(() => {
        const byClient = new Map<string, Map<string, OrderPiece[]>>();

        for (const p of pieces) {
            const clientKey = (p.ragioneSociale || "Senza ragione sociale").trim();
            const materialLabel =
                p.materialName && p.materialName.trim().length > 0 ? p.materialName : p.materialType;

            if (!byClient.has(clientKey)) byClient.set(clientKey, new Map());
            const byMat = byClient.get(clientKey)!;

            const matKey = (materialLabel || "Materiale").trim();
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

    function resetEditState() {
        setWarehouseMode(false);
        setSelected(new Set());
    }

    function toggleEditClient(client: string) {
        if (editingClient === client) {
            setEditingClient(null);
            resetEditState();
            return;
        }
        setEditingClient(client);
        resetEditState();
    }

    function toggleSelected(pieceId: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(pieceId)) next.delete(pieceId);
            else next.add(pieceId);
            return next;
        });
    }

    async function onDeletePiece(p: OrderPiece) {
        if (busy) return;
        Alert.alert("Elimina", `Eliminare il pezzo con seriale "${p.serialNumber}"?`, [
            { text: "Annulla", style: "cancel" },
            {
                text: "Elimina",
                style: "destructive",
                onPress: async () => {
                    try {
                        setBusy(true);
                        await deletePieceOnly(p.id);
                    } catch (e) {
                        console.log(e);
                        Alert.alert("Errore", "Non riesco a eliminare.");
                    } finally {
                        setBusy(false);
                    }
                },
            },
        ]);
    }

    async function onSaveWarehouseForClient(client: ClientGroup) {
        if (busy) return;

        const ids = Array.from(selected);
        if (ids.length === 0) {
            Alert.alert("Errore", "Seleziona almeno un oggetto da spostare in magazzino.");
            return;
        }

        // prendo solo i pezzi di quel client
        const clientPieces = client.materials.flatMap((m) => m.items);
        const selectedPieces = clientPieces.filter((p) => selected.has(p.id));

        if (selectedPieces.length === 0) {
            Alert.alert("Errore", "Hai selezionato pezzi di un altro cliente.");
            return;
        }

        // mappa id->materialLabel (così in magazzino restano raggruppati bene)
        const materialLabelByPieceId: Record<string, string> = {};
        for (const m of client.materials) {
            for (const p of m.items) {
                materialLabelByPieceId[p.id] = m.materialLabel;
            }
        }

        try {
            setBusy(true);
            await movePiecesToWarehouse({ pieces: selectedPieces, materialLabelByPieceId });

            // finito: reset selezione
            setSelected(new Set());
            setWarehouseMode(false);
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare in magazzino.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Prestito</Text>
            <Text style={{ opacity: 0.7 }}>Totale pezzi: {pieces.length}</Text>

            <FlatList
                data={grouped}
                keyExtractor={(x) => x.ragioneSociale}
                renderItem={({ item }) => {
                    const isEditing = editingClient === item.ragioneSociale;

                    return (
                        <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                <Text style={{ fontWeight: "800", fontSize: 16 }}>{item.ragioneSociale}</Text>

                                <Pressable
                                    onPress={() => toggleEditClient(item.ragioneSociale)}
                                    style={{ padding: 10, borderRadius: 8, backgroundColor: "black", opacity: busy ? 0.6 : 1 }}
                                    disabled={busy}
                                >
                                    <Text style={{ color: "white", fontWeight: "700" }}>{isEditing ? "Chiudi" : "Modifica"}</Text>
                                </Pressable>
                            </View>

                            {isEditing ? (
                                <View style={{ marginTop: 10, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                                    <Pressable
                                        onPress={() => {
                                            setWarehouseMode((x) => !x);
                                            setSelected(new Set());
                                        }}
                                        disabled={busy}
                                        style={{
                                            padding: 10,
                                            borderRadius: 8,
                                            backgroundColor: warehouseMode ? "gray" : "black",
                                            opacity: busy ? 0.6 : 1,
                                        }}
                                    >
                                        <Text style={{ color: "white", fontWeight: "700" }}>{warehouseMode ? "Esci Magazzino" : "Magazzino"}</Text>
                                    </Pressable>

                                    {warehouseMode ? (
                                        <Pressable
                                            onPress={() => onSaveWarehouseForClient(item)}
                                            disabled={busy}
                                            style={{ padding: 10, borderRadius: 8, backgroundColor: "black", opacity: busy ? 0.6 : 1 }}
                                        >
                                            <Text style={{ color: "white", fontWeight: "700" }}>
                                                {busy ? "Salvo..." : "Salva Magazzino"}
                                            </Text>
                                        </Pressable>
                                    ) : null}
                                </View>
                            ) : null}

                            {item.materials.map((m) => (
                                <View key={m.materialLabel} style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1 }}>
                                    <Text style={{ fontWeight: "700" }}>
                                        {m.materialLabel} — {m.items.length} pezzi
                                    </Text>

                                    {m.items.map((p) => {
                                        const checked = selected.has(p.id);
                                        return (
                                            <View
                                                key={p.id}
                                                style={{
                                                    marginTop: 8,
                                                    borderWidth: 1,
                                                    borderRadius: 10,
                                                    padding: 10,
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    gap: 10,
                                                }}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <Text>• {p.serialNumber}</Text>
                                                    <Text style={{ opacity: 0.7 }}>Inizio: {fmtLoanDate(p.loanStartMs)}</Text>
                                                </View>

                                                {isEditing && warehouseMode ? (
                                                    <Pressable
                                                        onPress={() => toggleSelected(p.id)}
                                                        disabled={busy}
                                                        style={{
                                                            paddingVertical: 8,
                                                            paddingHorizontal: 12,
                                                            borderRadius: 8,
                                                            backgroundColor: "black",
                                                            opacity: busy ? 0.6 : 1,
                                                        }}
                                                    >
                                                        <Text style={{ color: "white", fontWeight: "800" }}>{checked ? "☑" : "☐"}</Text>
                                                    </Pressable>
                                                ) : null}

                                                {isEditing && !warehouseMode ? (
                                                    <Pressable
                                                        onPress={() => onDeletePiece(p)}
                                                        disabled={busy}
                                                        style={{
                                                            paddingVertical: 8,
                                                            paddingHorizontal: 12,
                                                            borderRadius: 8,
                                                            backgroundColor: "red",
                                                            opacity: busy ? 0.6 : 1,
                                                        }}
                                                    >
                                                        <Text style={{ color: "white", fontWeight: "700" }}>Elimina</Text>
                                                    </Pressable>
                                                ) : null}
                                            </View>
                                        );
                                    })}
                                </View>
                            ))}
                        </View>
                    );
                }}
                ListEmptyComponent={<Text>Nessun pezzo in prestito</Text>}
            />
        </View>
    );
}
