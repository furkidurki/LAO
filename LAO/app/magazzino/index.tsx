import { useMemo } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { router } from "expo-router";
import { useOrders } from "@/lib/providers/OrdersProvider";
import type { OrderStatus } from "@/lib/models/order";

function niceStatus(s: OrderStatus) {
    if (s === "in_prestito") return "in prestito";
    return s;
}

export default function MagazzinoIndex() {
    const { orders } = useOrders();

    const data = useMemo(() => {
        return orders.filter((o) => o.status === "in_prestito");
    }, [orders]);

    return (
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Magazzino (index temporaneo)</Text>

            <FlatList
                data={data}
                keyExtractor={(x) => x.id}
                renderItem={({ item }) => (
                    <View style={{ borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                        <Text style={{ fontWeight: "800" }}>{item.ragioneSociale}</Text>
                        <Text>Stato: {niceStatus(item.status)}</Text>
                        <Text>Materiale: {item.materialName ?? item.materialType}</Text>

                        <Pressable
                            onPress={() =>
                                router.push({ pathname: "/ordini/visualizza" as any, params: { id: item.id } } as any)
                            }
                            style={{ marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: "black", alignSelf: "flex-start" }}
                        >
                            <Text style={{ color: "white", fontWeight: "700" }}>Visualizza</Text>
                        </Pressable>
                    </View>
                )}
                ListEmptyComponent={<Text>Nessun ordine in prestito</Text>}
            />
        </View>
    );
}
