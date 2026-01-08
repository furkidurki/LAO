import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import type { OrderPiece } from "@/lib/models/piece";
import { subscribePiecesByStatus, deletePieceOnly } from "@/lib/repos/pieces.repo";
import { movePiecesToWarehouse } from "@/lib/repos/warehouse.repo";

import { Screen } from "@/lib/ui/kit/Screen";
import { Card } from "@/lib/ui/kit/Card";
import { Chip } from "@/lib/ui/kit/Chip";
import { MotionPressable } from "@/lib/ui/kit/MotionPressable";
import { theme } from "@/lib/ui/theme";

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

            Alert.alert("Ok", "Spostati in magazzino.");
            router.replace("/(tabs)/magazzino" as any);
        } catch (e: any) {
            console.log(e);
            Alert.alert("Errore", String(e?.message || "Non riesco a salvare in magazzino."));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Screen scroll={false} contentStyle={{ paddingBottom: 0 }}>
            <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.2 }}>
                            Prestito
                        </Text>
                        <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>Totale pezzi: {pieces.length}</Text>
                    </View>
                </View>
            </View>

            <FlatList
                style={{ flex: 1 }}
                data={grouped}
                keyExtractor={(x) => x.ragioneSociale}
                contentContainerStyle={{ paddingTop: 14, paddingBottom: 110 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                    const isEditing = editingClient === item.ragioneSociale;

                    return (
                        <Card>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                                <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16, flex: 1 }} numberOfLines={1}>
                                    {item.ragioneSociale}
                                </Text>

                                <Chip
                                    label={isEditing ? "Chiudi" : "Modifica"}
                                    tone={isEditing ? "neutral" : "primary"}
                                    onPress={() => toggleEditClient(item.ragioneSociale)}
                                />
                            </View>

                            {isEditing ? (
                                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                                    <Chip
                                        label={warehouseMode ? "Esci magazzino" : "Magazzino"}
                                        tone={warehouseMode ? "primary" : "neutral"}
                                        onPress={() => {
                                            setWarehouseMode((x) => !x);
                                            setSelected(new Set());
                                        }}
                                    />
                                    {warehouseMode ? (
                                        <Chip
                                            label={busy ? "Salvo..." : `Salva (${selected.size})`}
                                            tone="primary"
                                            onPress={() => onSaveWarehouseForClient(item)}
                                        />
                                    ) : null}
                                </View>
                            ) : null}

                            {item.materials.map((m) => (
                                <View key={m.materialLabel} style={{ marginTop: 14, gap: 10 }}>
                                    <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                                        {m.materialLabel} • {m.items.length} pezzi
                                    </Text>

                                    {m.items.map((p) => {
                                        const checked = selected.has(p.id);

                                        return (
                                            <View
                                                key={p.id}
                                                style={{
                                                    borderWidth: 1,
                                                    borderColor: theme.colors.border,
                                                    borderRadius: theme.radius.lg,
                                                    padding: 12,
                                                    backgroundColor: theme.colors.surface2,
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    gap: 10,
                                                }}
                                            >
                                                <View style={{ flex: 1, gap: 4 }}>
                                                    <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                                                        {p.serialNumber}
                                                    </Text>
                                                    <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                                                        Inizio: {fmtLoanDate(p.loanStartMs)}
                                                    </Text>
                                                </View>

                                                {isEditing && warehouseMode ? (
                                                    <MotionPressable
                                                        onPress={() => toggleSelected(p.id)}
                                                        disabled={busy}
                                                        haptic="light"
                                                        style={{
                                                            width: 44,
                                                            height: 40,
                                                            borderRadius: 14,
                                                            backgroundColor: theme.colors.surface,
                                                            borderWidth: 1,
                                                            borderColor: theme.colors.border,
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                        }}
                                                    >
                                                        <Ionicons
                                                            name={checked ? "checkbox" : "square-outline"}
                                                            size={22}
                                                            color={checked ? theme.colors.primary2 : "rgba(11,16,32,0.55)"}
                                                        />
                                                    </MotionPressable>
                                                ) : null}

                                                {isEditing && !warehouseMode ? (
                                                    <Chip label="Elimina" tone="primary" onPress={() => onDeletePiece(p)} />
                                                ) : null}
                                            </View>
                                        );
                                    })}
                                </View>
                            ))}
                        </Card>
                    );
                }}
                ListEmptyComponent={<Text style={{ color: theme.colors.muted, fontWeight: "900" }}>Nessun pezzo in prestito</Text>}
            />
        </Screen>
    );
}
