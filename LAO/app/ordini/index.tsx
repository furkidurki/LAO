import { useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import { useOrders } from "@/lib/providers/OrdersProvider";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/models/order";

export default function OrdiniList() {
    const { orders } = useOrders();
    const [q, setQ] = useState("");
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();

        return orders
            .filter((o) => o.status !== "magazzino") // ✅ qui
            .filter((o) => {
                const matchesText = s.length < 2 ? true : (o.ragioneSociale ?? "").toLowerCase().includes(s);
                const matchesStatus = statusFilter === "all" ? true : o.status === statusFilter;
                return matchesText && matchesStatus;
            });
    }, [orders, q, statusFilter]);

    return (
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Ordini</Text>

            <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Cerca ragione sociale... (min 2)"
                style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
            />

            <Text>Filtra stato</Text>
            <Picker selectedValue={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <Picker.Item label="Tutti" value="all" />
                {ORDER_STATUSES.filter((s) => s !== "magazzino").map((s) => (
                    <Picker.Item key={s} label={s} value={s} />
                ))}
            </Picker>

            <FlatList
                data={filtered}
                keyExtractor={(x) => x.id}
                renderItem={({ item }) => (
                    <View style={{ borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                        <Text style={{ fontWeight: "800" }}>{item.ragioneSociale}</Text>
                        <Text>Stato: {item.status}</Text>
                        <Text>Materiale: {item.materialName ?? item.materialType}</Text>

                        <Pressable
                            onPress={() =>
                                router.push({ pathname: "/ordini/modifica" as any, params: { id: item.id } } as any)
                            }
                            style={{ marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: "black", alignSelf: "flex-start" }}
                        >
                            <Text style={{ color: "white", fontWeight: "700" }}>Modifica</Text>
                        </Pressable>
                    </View>
                )}
                ListEmptyComponent={<Text>Nessun ordine trovato</Text>}
            />
        </View>
    );
}
