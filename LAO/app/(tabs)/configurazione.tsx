import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import { useClients } from "@/lib/providers/ClientsProvider";

export default function ConfigurazioneTab() {
    const { orders } = useOrders();
    const { clients } = useClients();

    const [clientFilter, setClientFilter] = useState<string | "all">("all");

    const filtered = useMemo(() => {
        return orders
            .filter((o) => o.status === "arrivato")
            .filter((o) => (clientFilter === "all" ? true : o.clientId === clientFilter));
    }, [orders, clientFilter]);

    return (
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Configurazione (arrivato)</Text>

            <Text>Filtra ragione sociale</Text>
            <Picker selectedValue={clientFilter} onValueChange={(v) => setClientFilter(v as any)}>
                <Picker.Item label="Tutti" value="all" />
                {clients.map((c) => (
                    <Picker.Item key={c.id} label={c.ragioneSociale} value={c.id} />
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

                        <Pressable
                            onPress={() =>
                                router.push({ pathname: "/configurazione/dettaglio" as any, params: { id: item.id } } as any)
                            }
                            style={{ marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: "black", alignSelf: "flex-start" }}
                        >
                            <Text style={{ color: "white", fontWeight: "700" }}>Apri</Text>
                        </Pressable>
                    </View>
                )}
                ListEmptyComponent={<Text>Nessun ordine arrivato</Text>}
            />
        </View>
    );
}
