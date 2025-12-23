import { useMemo } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { router } from "expo-router";
import { useOrders } from "@/lib/providers/OrdersProvider";
import type { OrderStatus } from "@/lib/models/order";
import { s } from "./magazzino.styles";

function niceStatus(st: OrderStatus) {
    if (st === "in_prestito") return "in prestito";
    return st;
}

export default function MagazzinoIndex() {
    const { orders } = useOrders();

    const data = useMemo(() => {
        return orders.filter((o) => o.status === "in_prestito");
    }, [orders]);

    return (
        <View style={s.page}>
            <Text style={s.title}>Magazzino</Text>
            <Text style={s.subtitle}>Vista temporanea</Text>

            <FlatList
                data={data}
                keyExtractor={(x) => x.id}
                contentContainerStyle={s.listContent}
                renderItem={({ item }) => (
                    <View style={s.card}>
                        <Text style={s.lineStrong}>{item.ragioneSociale}</Text>

                        <Text style={s.lineMuted}>
                            Stato: <Text style={s.lineStrong}>{niceStatus(item.status)}</Text>
                        </Text>

                        <Text style={s.lineMuted}>
                            Materiale: <Text style={s.lineStrong}>{item.materialName ?? item.materialType}</Text>
                        </Text>

                        <Pressable
                            onPress={() => router.push({ pathname: "/ordini/visualizza" as any, params: { id: item.id } } as any)}
                            style={s.btnPrimary}
                        >
                            <Text style={s.btnPrimaryText}>Visualizza</Text>
                        </Pressable>
                    </View>
                )}
                ListEmptyComponent={<Text style={s.empty}>Nessun ordine in prestito</Text>}
            />
        </View>
    );
}
