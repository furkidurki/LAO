import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, Alert, Platform } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import { useClients } from "@/lib/providers/ClientsProvider";
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

export default function MagazzinoTab() {
    const { orders } = useOrders();
    const { clients } = useClients();

    const [ragioneFilter, setRagioneFilter] = useState<string | "all">("all");

    const filtered = useMemo(() => {
        return orders
            .filter((o) => o.status === "consegnato")
            .filter((o) => (ragioneFilter === "all" ? true : o.ragioneSociale === ragioneFilter));
    }, [orders, ragioneFilter]);

    return (
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Consegnati</Text>

            <Text>Filtra ragione sociale</Text>
            <Picker selectedValue={ragioneFilter} onValueChange={(v) => setRagioneFilter(v as any)}>
                <Picker.Item label="Tutti" value="all" />
                {clients.map((c) => (
                    <Picker.Item key={c.id} label={c.ragioneSociale} value={c.ragioneSociale} />
                ))}
            </Picker>

            <FlatList
                data={filtered}
                keyExtractor={(x) => x.id}
                renderItem={({ item }) => (
                    <View style={{ borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                        <Text style={{ fontWeight: "800" }}>{item.ragioneSociale}</Text>
                        <Text>Materiale: {item.materialName ?? item.materialType}</Text>
                        <Text>Quantità: {item.quantity}</Text>
                        <Text>Distributore: {item.distributorName}</Text>
                        <Text>Totale: {item.totalPrice}</Text>

                        {item.description ? <Text>Descrizione: {item.description}</Text> : null}

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
                ListEmptyComponent={<Text>Nessun ordine consegnato</Text>}
            />
        </View>
    );
}
