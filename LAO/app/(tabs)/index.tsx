import { useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, TextInput } from "react-native";
import { router } from "expo-router";
import { useOrders } from "@/lib/providers/OrdersProvider";

export default function Home() {
    const { orders } = useOrders();

    const [q, setQ] = useState("");

    // ✅ ricerca: parte già da 2 lettere, contiene (non match esatto), senza invio
    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (s.length < 2) return orders;

        return orders.filter((o) =>
            (o.ragioneSociale ?? "").toLowerCase().includes(s)
        );
    }, [q, orders]);

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

            {/* ✅ Search bar */}
            <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Cerca ragione sociale... (min 2 lettere)"
                style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
                autoCapitalize="none"
            />

            <FlatList
                data={filtered}
                keyExtractor={(x) => x.id}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                renderItem={({ item }) => (
                    <View style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}>
                        <Text style={{ fontWeight: "800", fontSize: 16 }}>{item.ragioneSociale}</Text>
                        <Text>Stato: {item.status}</Text>
                        <Text>Materiale: {item.materialName ? item.materialName : item.materialType}</Text>

                        <Pressable
                            onPress={() =>
                                router.push({
                                    pathname: "/ordini/modifica" as any,
                                    params: { id: item.id },
                                } as any)
                            }
                            style={{
                                marginTop: 8,
                                padding: 10,
                                borderRadius: 8,
                                backgroundColor: "black",
                                alignSelf: "flex-start",
                            }}
                        >
                            <Text style={{ color: "white", fontWeight: "700" }}>Modifica</Text>
                        </Pressable>
                    </View>
                )}
                ListEmptyComponent={
                    <Text>
                        {q.trim().length >= 2 ? "Nessun ordine trovato" : "Nessun ordine"}
                    </Text>
                }
            />
        </View>
    );
}
