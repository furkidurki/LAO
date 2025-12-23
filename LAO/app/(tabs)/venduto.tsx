import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, TextInput } from "react-native";
import { router } from "expo-router";

import { useClients } from "@/lib/providers/ClientsProvider";
import type { OrderPiece } from "@/lib/models/piece";
import { subscribePiecesByStatus } from "@/lib/repos/pieces.repo";

import { Select } from "@/lib/ui/components/Select";
import { s } from "./tabs.styles";

export default function VendutoTab() {
    const { clients } = useClients();

    const [pieces, setPieces] = useState<OrderPiece[]>([]);
    const [clientFilter, setClientFilter] = useState<string | "all">("all");
    const [q, setQ] = useState("");

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
                const hay = [p.ragioneSociale, p.code, p.materialName, p.materialType, p.serialNumber, p.distributorName]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return hay.includes(sQ);
            });
    }, [pieces, clientFilter, q]);

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
                                onPress={() => router.push({ pathname: "/venduto/modifica" as any, params: { id: item.id } } as any)}
                                style={s.btnPrimary}
                            >
                                <Text style={s.btnPrimaryText}>Modifica</Text>
                            </Pressable>
                        </View>
                    </View>
                )}
                ListEmptyComponent={<Text style={s.empty}>Nessun pezzo venduto</Text>}
            />
        </View>
    );
}
