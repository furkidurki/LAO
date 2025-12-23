import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import { useClients } from "@/lib/providers/ClientsProvider";
import type { OrderStatus } from "@/lib/models/order";

function niceStatus(s: OrderStatus) {
    if (s === "in_prestito") return "in prestito";
    return s;
}

export default function OrdiniTab() {
    const { orders } = useOrders();
    const { clients } = useClients();

    const [clientFilter, setClientFilter] = useState<string | "all">("all");
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

    const filtered = useMemo(() => {
        return orders
            .filter((o) => (clientFilter === "all" ? true : o.clientId === clientFilter))
            .filter((o) => (statusFilter === "all" ? true : o.status === statusFilter));
    }, [orders, clientFilter, statusFilter]);

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
                <Picker.Item label="ordinato" value="ordinato" />
                <Picker.Item label="arrivato" value="arrivato" />
                <Picker.Item label="venduto" value="venduto" />
                <Picker.Item label="in prestito" value="in_prestito" />
            </Picker>

            <FlatList
                data={filtered}
                keyExtractor={(x) => x.id}
                renderItem={({ item }) => {
                    const canEdit = item.status === "ordinato";

                    return (
                        <View style={{ borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 }}>
                            <Text style={{ fontWeight: "800" }}>{item.ragioneSociale}</Text>
                            <Text>Stato: {niceStatus(item.status)}</Text>
                            <Text>Materiale: {item.materialName ?? item.materialType}</Text>
                            <Text>Quantità: {item.quantity}</Text>
                            <Text>Totale: {item.totalPrice}</Text>

                            {item.description ? <Text>Descrizione: {item.description}</Text> : null}

                            <View style={{ flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                                {canEdit ? (
                                    <Pressable
                                        onPress={() =>
                                            router.push(
                                                { pathname: "/ordini/modifica" as any, params: { id: item.id } } as any
                                            )
                                        }
                                        style={{ padding: 10, borderRadius: 8, backgroundColor: "black" }}
                                    >
                                        <Text style={{ color: "white", fontWeight: "700" }}>Modifica</Text>
                                    </Pressable>
                                ) : (
                                    <Pressable
                                        onPress={() =>
                                            router.push(
                                                { pathname: "/ordini/visualizza" as any, params: { id: item.id } } as any
                                            )
                                        }
                                        style={{ padding: 10, borderRadius: 8, backgroundColor: "black" }}
                                    >
                                        <Text style={{ color: "white", fontWeight: "700" }}>Visualizza</Text>
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={<Text>Nessun ordine</Text>}
            />
        </View>
    );
}
