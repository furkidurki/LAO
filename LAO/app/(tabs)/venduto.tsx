import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { router } from "expo-router";

import type { OrderPiece } from "@/lib/models/piece";
import { subscribePiecesByStatus } from "@/lib/repos/pieces.repo";

export default function VendutoTab() {
    const [pieces, setPieces] = useState<OrderPiece[]>([]);

    useEffect(() => {
        return subscribePiecesByStatus("venduto", setPieces);
    }, []);

    return (
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Venduto</Text>

            <FlatList
                data={pieces}
                keyExtractor={(x) => x.id}
                renderItem={({ item }) => (
                    <View style={{ borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                        <Text style={{ fontWeight: "800" }}>{item.ragioneSociale}</Text>
                        <Text>Seriale: {item.serialNumber}</Text>
                        <Text>Materiale: {item.materialName ?? item.materialType}</Text>

                        <Pressable
                            onPress={() =>
                                router.push({ pathname: "/ordini/visualizza" as any, params: { id: item.orderId } } as any)
                            }
                            style={{ marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: "black", alignSelf: "flex-start" }}
                        >
                            <Text style={{ color: "white", fontWeight: "700" }}>Visualizza ordine</Text>
                        </Pressable>
                    </View>
                )}
                ListEmptyComponent={<Text>Nessun pezzo venduto</Text>}
            />
        </View>
    );
}
