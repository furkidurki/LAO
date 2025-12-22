import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, Alert, Platform } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import { useClients } from "@/lib/providers/ClientsProvider";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/models/order";
import { deleteOrder } from "@/lib/repos/orders.repo";

async function confirmDelete(): Promise<boolean> {
    if (Platform.OS === "web") return window.confirm("Vuoi eliminare questo ordine?");
    return await new Promise<boolean>((resolve) => {
        Alert.alert("Conferma", "Vuoi eliminare questo ordine?", [
            { text: "No", style: "cancel", onPress: () => resolve(false) },
            { text: "Sì", style: "destructive", onPress: () => resolve(true) },
        ]);
    });
}

export default function OrdiniTab() {
    const { orders } = useOrders();
    const { clients } = useClients();

    const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
    const [clientFilter, setClientFilter] = useState<string | "all">("all"); // clientId

    const filtered = useMemo(() => {
        return orders
            .filter((o) => o.status !== "magazzino") // ✅ qui: solo NON-magazzino
            .filter((o) => (statusFilter === "all" ? true : o.status === statusFilter))
            .filter((o) => (clientFilter === "all" ? true : o.clientId === clientFilter));
    }, [orders, statusFilter, clientFilter]);

    return (
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Ordini</Text>

            <Text>Filtra ragione sociale</Text>
            <Picker selectedValue={clientFilter} onValueChange={(v) => setClientFilter(v as any)}>
                <Picker.Item label="Tutti" value="all" />
                {clients.map((c) => (
                    <Picker.Item key={c.id} label={c.ragioneSociale} value={c.id} />
                ))}
            </Picker>

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

                        <View style={{ flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                            <Pressable
                                onPress={() =>
                                    router.push({ pathname: "/ordini/modifica" as any, params: { id: item.id } } as any)
                                }
                                style={{ padding: 10, borderRadius: 8, backgroundColor: "black" }}
                            >
                                <Text style={{ color: "white", fontWeight: "700" }}>Modifica</Text>
                            </Pressable>

                            <Pressable
                                onPress={async () => {
                                    const ok = await confirmDelete();
                                    if (!ok) return;

                                    try {
                                        await deleteOrder(item.id);
                                    } catch (e) {
                                        console.log(e);
                                        Alert.alert("Errore", "Non riesco a eliminare");
                                    }
                                }}
                                style={{ padding: 10, borderRadius: 8, backgroundColor: "red" }}
                            >
                                <Text style={{ color: "white", fontWeight: "700" }}>Elimina</Text>
                            </Pressable>
                        </View>
                    </View>
                )}
                ListEmptyComponent={<Text>Nessun ordine</Text>}
            />
        </View>
    );
}
