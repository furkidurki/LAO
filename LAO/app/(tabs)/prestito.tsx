import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, Alert } from "react-native";
import { router } from "expo-router";

import type { OrderPiece } from "@/lib/models/piece";
import { subscribePiecesByStatus, deletePieceOnly } from "@/lib/repos/pieces.repo";
import { movePiecesToWarehouse } from "@/lib/repos/warehouse.repo";

import { s } from "./tabs.styles";

function fmtLoanDate(ms?: number) {
    if (!ms) return "-";
    const d = new Date(ms);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

type MaterialGroup = { materialLabel: string; items: OrderPiece[] };
type ClientGroup = { ragioneSociale: string; materials: MaterialGroup[] };

export default function PrestitoTab() {
    const [pieces, setPieces] = useState<OrderPiece[]>([]);

    const [editingClient, setEditingClient] = useState<string | null>(null);
    const [warehouseMode, setWarehouseMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        return subscribePiecesByStatus("in_prestito", setPieces);
    }, []);

    const grouped: ClientGroup[] = useMemo(() => {
        const byClient = new Map<string, Map<string, OrderPiece[]>>();

        for (const p of pieces) {
            const clientKey = (p.ragioneSociale || "Senza ragione sociale").trim();
            const materialLabel = p.materialName && p.materialName.trim().length > 0 ? p.materialName : p.materialType;

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

        const clientPieces = client.materials.flatMap((m) => m.items);
        const selectedPieces = clientPieces.filter((p) => selected.has(p.id));

        if (selectedPieces.length === 0) {
            Alert.alert("Errore", "Hai selezionato pezzi di un altro cliente.");
            return;
        }

        const materialLabelByPieceId: Record<string, string> = {};
        for (const m of client.materials) {
            for (const p of m.items) materialLabelByPieceId[p.id] = m.materialLabel;
        }

        try {
            setBusy(true);

            await movePiecesToWarehouse({
                pieces: selectedPieces,
                materialLabelByPieceId,
            });

            setSelected(new Set());
            setWarehouseMode(false);

            Alert.alert("Ok", "Spostati in magazzino!");
            router.replace("/(tabs)/magazzino" as any);
        } catch (e: any) {
            console.log(e);
            Alert.alert("Errore", String(e?.message || "Non riesco a salvare in magazzino."));
        } finally {
            setBusy(false);
        }
    }

    return (
        <View style={s.page}>
            <Text style={s.title}>Prestito</Text>
            <Text style={s.subtitle}>Totale pezzi: {pieces.length}</Text>

            <FlatList
                data={grouped}
                keyExtractor={(x) => x.ragioneSociale}
                contentContainerStyle={s.listContent}
                renderItem={({ item }) => {
                    const isEditing = editingClient === item.ragioneSociale;

                    return (
                        <View style={s.groupCard}>
                            <View style={s.rowBetween}>
                                <Text style={s.groupTitle}>{item.ragioneSociale}</Text>

                                <Pressable
                                    onPress={() => toggleEditClient(item.ragioneSociale)}
                                    style={isEditing ? s.btnMuted : s.btnPrimary}
                                    disabled={busy}
                                >
                                    <Text style={isEditing ? s.btnMutedText : s.btnPrimaryText}>{isEditing ? "Chiudi" : "Modifica"}</Text>
                                </Pressable>
                            </View>

                            {isEditing ? (
                                <View style={s.row}>
                                    <Pressable
                                        onPress={() => {
                                            setWarehouseMode((x) => !x);
                                            setSelected(new Set());
                                        }}
                                        disabled={busy}
                                        style={warehouseMode ? s.btnMuted : s.btnPrimary}
                                    >
                                        <Text style={warehouseMode ? s.btnMutedText : s.btnPrimaryText}>
                                            {warehouseMode ? "Esci Magazzino" : "Magazzino"}
                                        </Text>
                                    </Pressable>

                                    {warehouseMode ? (
                                        <Pressable onPress={() => onSaveWarehouseForClient(item)} disabled={busy} style={s.btnPrimary}>
                                            <Text style={s.btnPrimaryText}>
                                                {busy ? "Salvo..." : `Salva Magazzino (${selected.size})`}
                                            </Text>
                                        </Pressable>
                                    ) : null}
                                </View>
                            ) : null}

                            {item.materials.map((m) => (
                                <View key={m.materialLabel} style={s.block}>
                                    <Text style={s.blockTitle}>
                                        {m.materialLabel} — {m.items.length} pezzi
                                    </Text>

                                    {m.items.map((p) => {
                                        const checked = selected.has(p.id);

                                        return (
                                            <View key={p.id} style={s.pieceRow}>
                                                <View style={s.pieceLeft}>
                                                    <Text style={s.serial}>• {p.serialNumber}</Text>
                                                    <Text style={s.smallMuted}>Inizio: {fmtLoanDate(p.loanStartMs)}</Text>
                                                </View>

                                                {isEditing && warehouseMode ? (
                                                    <Pressable onPress={() => toggleSelected(p.id)} disabled={busy} style={s.miniBtn}>
                                                        <Text style={s.miniBtnText}>{checked ? "☑" : "☐"}</Text>
                                                    </Pressable>
                                                ) : null}

                                                {isEditing && !warehouseMode ? (
                                                    <Pressable onPress={() => onDeletePiece(p)} disabled={busy} style={s.btnDanger}>
                                                        <Text style={s.btnDangerText}>Elimina</Text>
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
                ListEmptyComponent={<Text style={s.empty}>Nessun pezzo in prestito</Text>}
            />
        </View>
    );
}
