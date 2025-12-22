import { View, Text, Pressable, FlatList } from "react-native";
import { router } from "expo-router";
import { useOrders } from "@/lib/providers/OrdersProvider";

export default function Home() {
    const { orders } = useOrders(); // ✅ qui, prima del return

    return (
        <View style={{ flex: 1, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 24, fontWeight: "700" }}>Home</Text>

            <Pressable
                onPress={() => router.push("/ordini/nuovo")}
                style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}
            >
                <Text style={{ color: "white", fontWeight: "700" }}>Nuovo Ordine</Text>
            </Pressable>

            <Pressable
                onPress={() => router.push("/magazzino/aggiungi")}
                style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}
            >
                <Text style={{ color: "white", fontWeight: "700" }}>Aggiungi Magazzino</Text>
            </Pressable>

            <Pressable
                onPress={() => router.push("/settings/editDistributori")}
                style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}
            >
                <Text style={{ color: "white", fontWeight: "700" }}>Gestisci Distributori</Text>
            </Pressable>

            <Text style={{ fontSize: 22, fontWeight: "700", marginTop: 10 }}>Ordini</Text>

            <FlatList
                data={orders}
                keyExtractor={(x) => x.id}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                renderItem={({ item }) => (
                    <View style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}>
                        <Text style={{ fontWeight: "800", fontSize: 16 }}>{item.ragioneSociale}</Text>
                        <Text>Stato: {item.status}</Text>
                        <Text>Materiale: {item.materialName ? item.materialName : item.materialType}</Text>
                    </View>
                )}
                ListEmptyComponent={<Text>Nessun ordine</Text>}
            />
        </View>
    );
}
