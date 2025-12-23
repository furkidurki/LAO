import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, TextInput, Alert, Platform } from "react-native";

import { useClients } from "@/lib/providers/ClientsProvider";
import type { OrderPiece } from "@/lib/models/piece";
import { subscribePiecesByStatus, deletePieceAndSerial } from "@/lib/repos/pieces.repo";

import { Select } from "@/lib/ui/components/Select";
import { s } from "./tabs.styles";

function showConfirm(title: string, message: string, onYes: () => void) {
    if (Platform.OS === "web") {
        // web confirm semplice
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
    const { clients } = useClients();

    const [pieces, setPieces] = useState<OrderPiece[]>([]);
    const [clientFilter, setClientFilter] = useState<string | "all">("all");
    const [q, setQ] = useState("");
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        return subscribePiecesByStatus("venduto", setPieces);
    }, []);

    const clientOptions = useMemo(() => {
        return [{ label: "Tutti", value: "all" }, ...clients.map((c) => ({ label: c.ragioneSociale, value: c.id }))];
    }, [clients]);

    const filtered = useMemo(() => {
        const sQ = q.trim().toLowerCase();

        return pieces
            .filter((p) => (clientFilter === "all" ? true : p.clientId === clientFilter))
            .filter((p) => {
                if (!sQ) return true;
                const hay = [
                    p.ragioneSociale,
                    p.code,
                    p.materialName,
                    p.materialType,
                    p.serialNumber,
                    p.distributorName,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return hay.includes(sQ);
            });
    }, [pieces, clientFilter, q]);

    async function onDeletePiece(item: OrderPiece) {
        if (busyId) return;

        const serialLower = (item as any).serialLower as string | undefined;
        if (!serialLower) {
            Alert.alert("Errore", "Manca serialLower sul pezzo. Non posso liberare il seriale.");
            return;
        }

        showConfirm(
            "Elimina pezzo venduto",
            `Sei sicuro?\n\nCliente: ${item.ragioneSociale}\nSeriale: ${item.serialNumber}`,
            async () => {
                try {
                    setBusyId(item.id);
                    await deletePieceAndSerial({ pieceId: item.id, serialLower });
                } catch (e) {
                    console.log(e);
                    Alert.alert("Errore", "Non riesco a eliminare il pezzo.");
                } finally {
                    setBusyId(null);
                }
            }
        );
    }

    return (
        <View style={s.page}>
            <Text style={s.title}>Venduto</Text>

            <Select
                label="Filtra ragione sociale"
                value={clientFilter}
                options={clientOptions}
                onChange={(v) => setClientFilter(v as any)}
                searchable
            />

            <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Cerca (seriale, cliente, materiale...)"
                placeholderTextColor={"rgba(229,231,235,0.70)"}
                style={s.input}
            />

            <FlatList
                data={filtered}
                keyExtractor={(x) => x.id}
                contentContainerStyle={s.listContent}
                renderItem={({ item }) => (
                    <View style={s.card}>
                        <View style={s.rowBetween}>
                            <Text style={s.cardTitle}>{item.ragioneSociale}</Text>
                            <View style={s.badge}>
                                <Text style={s.badgeText}>VENDUTO</Text>
                            </View>
                        </View>

                        <Text style={s.lineMuted}>
                            Seriale: <Text style={s.lineStrong}>{item.serialNumber}</Text>
                        </Text>

                        <Text style={s.lineMuted}>
                            Materiale: <Text style={s.lineStrong}>{item.materialName ?? item.materialType}</Text>
                        </Text>

                        {item.distributorName ? (
                            <Text style={s.lineMuted}>
                                Distributore: <Text style={s.lineStrong}>{item.distributorName}</Text>
                            </Text>
                        ) : null}

                        <View style={s.row}>
                            <Pressable
                                onPress={() => onDeletePiece(item)}
                                style={s.btnDanger}
                                disabled={busyId === item.id}
                            >
                                <Text style={s.btnDangerText}>{busyId === item.id ? "Elimino..." : "Elimina"}</Text>
                            </Pressable>
                        </View>
                    </View>
                )}
                ListEmptyComponent={<Text style={s.empty}>Nessun pezzo venduto</Text>}
            />
        </View>
    );
}
