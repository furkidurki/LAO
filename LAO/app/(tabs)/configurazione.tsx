import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { router } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import { useClients } from "@/lib/providers/ClientsProvider";

import { Select } from "@/lib/ui/components/Select";
import { s } from "@/lib/ui/tabs.styles";

export default function ConfigurazioneTab() {
    const { orders } = useOrders();
    const { clients } = useClients();

    const [clientFilter, setClientFilter] = useState<string | "all">("all");

    const ready = useMemo(() => {
        return orders
            .filter((o) => o.status === "arrivato")
            .filter((o) => (clientFilter === "all" ? true : o.clientId === clientFilter));
    }, [orders, clientFilter]);

    const clientOptions = useMemo(() => {
        return [{ label: "Tutti", value: "all" }, ...clients.map((c) => ({ label: c.ragioneSociale, value: c.id }))];
    }, [clients]);

    return (
        <View style={s.page}>
            <Text style={s.title}>Configurazione</Text>

            <Select
                label="Filtra ragione sociale"
                value={clientFilter}
                options={clientOptions}
                onChange={(v) => setClientFilter(v as any)}
                searchable
            />

            <FlatList
                data={ready}
                keyExtractor={(x) => x.id}
                contentContainerStyle={s.listContent}
                renderItem={({ item }) => (
                    <View style={s.card}>
                        <Text style={s.cardTitle}>{item.ragioneSociale}</Text>

                        <Text style={s.lineMuted}>
                            Materiale: <Text style={s.lineStrong}>{item.materialName ?? item.materialType}</Text>
                        </Text>

                        <Text style={s.lineMuted}>
                            Quantità: <Text style={s.lineStrong}>{item.quantity}</Text>
                        </Text>

                        <Text style={s.lineMuted}>
                            Totale: <Text style={s.lineStrong}>{item.totalPrice}</Text>
                        </Text>

                        <View style={s.row}>
                            <Pressable
                                onPress={() =>
                                    router.push({ pathname: "/configurazione/dettaglio" as any, params: { id: item.id } } as any)
                                }
                                style={s.btnPrimary}
                            >
                                <Text style={s.btnPrimaryText}>Configura</Text>
                            </Pressable>
                        </View>
                    </View>
                )}
                ListEmptyComponent={<Text style={s.empty}>Nessun ordine da configurare</Text>}
            />
        </View>
    );
}
