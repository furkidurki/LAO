import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Platform, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { OrderPiece } from "@/lib/models/piece";
import { subscribePiecesByStatus, deletePieceAndSerial } from "@/lib/repos/pieces.repo";

import { ClientSmartSearch } from "@/lib/ui/components/ClientSmartSearch";
import { Screen } from "@/lib/ui/kit/Screen";
import { Card } from "@/lib/ui/kit/Card";
import { Chip } from "@/lib/ui/kit/Chip";
import { theme } from "@/lib/ui/theme";

function showConfirm(title: string, message: string, onYes: () => void) {
    if (Platform.OS === "web") {
        // eslint-disable-next-line no-alert
        const ok = window.confirm(`${title}\n\n${message}`);
        if (ok) onYes();
        return;
    }

    Alert.alert(title, message, [
        { text: "Annulla", style: "cancel" },
        { text: "Elimina", style: "destructive", onPress: onYes },
    ]);
}

export default function VendutoTab() {
    const [pieces, setPieces] = useState<OrderPiece[]>([]);
    const [clientText, setClientText] = useState("");
    const [q, setQ] = useState("");
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        return subscribePiecesByStatus("venduto", setPieces);
    }, []);

    const filtered = useMemo(() => {
        const sQ = q.trim().toLowerCase();
        const cQ = clientText.trim().toLowerCase();

        return pieces
            .filter((p) => {
                if (!cQ) return true;
                const rs = String(p.ragioneSociale ?? "").toLowerCase();
                return rs.includes(cQ);
            })
            .filter((p) => {
                if (!sQ) return true;
                const hay = [p.ragioneSociale, p.code, p.materialName, p.materialType, p.serialNumber, p.distributorName]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return hay.includes(sQ);
            });
    }, [pieces, clientText, q]);

    async function onDeletePiece(item: OrderPiece) {
        if (busyId) return;

        const serialLower = (item as any).serialLower as string | undefined;
        if (!serialLower) {
            Alert.alert("Errore", "Manca serialLower sul pezzo. Non posso liberare il seriale.");
            return;
        }

        showConfirm("Elimina pezzo venduto", `Cliente: ${item.ragioneSociale}\nSeriale: ${item.serialNumber}`, async () => {
            try {
                setBusyId(item.id);
                await deletePieceAndSerial({ pieceId: item.id, serialLower });
            } catch (e) {
                console.log(e);
                Alert.alert("Errore", "Non riesco a eliminare il pezzo.");
            } finally {
                setBusyId(null);
            }
        });
    }

    return (
        <Screen scroll={false} contentStyle={{ paddingBottom: 0 }}>
            <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.2 }}>
                            Venduto
                        </Text>
                        <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                            Totale: {pieces.length} • Visibili: {filtered.length}
                        </Text>
                    </View>
                </View>

                <Card>
                    <ClientSmartSearch
                        label="Ragione sociale (cliente)"
                        value={clientText}
                        onChangeValue={setClientText}
                        selectedId={clientText.trim().length > 0 ? "x" : null}
                        onSelect={(c) => setClientText(c.ragioneSociale)}
                        onClear={() => setClientText("")}
                        maxRecent={10}
                        maxResults={20}
                    />

                    <View style={{ gap: 8, marginTop: 12 }}>
                        <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>Cerca</Text>
                        <TextInput
                            value={q}
                            onChangeText={setQ}
                            placeholder="Seriale, cliente, materiale..."
                            placeholderTextColor={theme.colors.muted}
                            style={{
                                backgroundColor: theme.colors.surface2,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                borderRadius: theme.radius.lg,
                                paddingVertical: 12,
                                paddingHorizontal: 12,
                                color: theme.colors.text,
                                fontWeight: "900",
                            }}
                        />
                    </View>
                </Card>
            </View>

            <FlatList
                style={{ flex: 1 }}
                data={filtered}
                keyExtractor={(x) => x.id}
                contentContainerStyle={{ paddingTop: 14, paddingBottom: 110 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                    <Card>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                            <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16, flex: 1 }} numberOfLines={1}>
                                {item.ragioneSociale}
                            </Text>

                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 6,
                                    backgroundColor: "rgba(245,197,66,0.20)",
                                    borderColor: "rgba(245,197,66,0.30)",
                                    borderWidth: 1,
                                    paddingVertical: 6,
                                    paddingHorizontal: 10,
                                    borderRadius: 999,
                                }}
                            >
                                <Ionicons name="checkmark-circle" size={14} color={theme.colors.text} />
                                <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 12 }}>VENDUTO</Text>
                            </View>
                        </View>

                        <View style={{ gap: 6, marginTop: 10 }}>
                            <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                                Seriale: <Text style={{ color: theme.colors.text }}>{item.serialNumber}</Text>
                            </Text>

                            <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                                Materiale: <Text style={{ color: theme.colors.text }}>{item.materialName ?? item.materialType}</Text>
                            </Text>

                            {item.distributorName ? (
                                <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                                    Distributore: <Text style={{ color: theme.colors.text }}>{item.distributorName}</Text>
                                </Text>
                            ) : null}
                        </View>

                        <View style={{ marginTop: 12 }}>
                            <Chip label={busyId === item.id ? "Elimino..." : "Elimina"} tone="primary" onPress={() => onDeletePiece(item)} />
                        </View>
                    </Card>
                )}
                ListEmptyComponent={<Text style={{ color: theme.colors.muted, fontWeight: "900" }}>Nessun pezzo venduto</Text>}
            />
        </Screen>
    );
}
