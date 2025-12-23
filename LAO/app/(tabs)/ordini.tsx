import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { router } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import { useClients } from "@/lib/providers/ClientsProvider";
import type { OrderStatus } from "@/lib/models/order";

import { Select } from "@/lib/ui/components/Select";
import { s } from "./tabs.styles";

function niceStatus(st: OrderStatus) {
    if (st === "in_prestito") return "in prestito";
    return st;
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

    const clientOptions = useMemo(() => {
        return [{ label: "Tutti", value: "all" }, ...clients.map((c) => ({ label: c.ragioneSociale, value: c.id }))];
    }, [clients]);

    const statusOptions = useMemo(() => {
        return [
            { label: "Tutti", value: "all" },
            { label: "Ordinato", value: "ordinato" },
            { label: "Arrivato", value: "arrivato" },
            { label: "Venduto", value: "venduto" },
            { label: "In prestito", value: "in_prestito" },
        ];
    }, []);

    return (
        <View style={s.page}>
            <Text style={s.title}>Ordini</Text>

            <View style={{ gap: 12 }}>
                <Select
                    label="Filtra ragione sociale"
                    value={clientFilter}
                    options={clientOptions}
                    onChange={(v) => setClientFilter(v as any)}
                    searchable
                />
                <Select
                    label="Filtra stato"
                    value={statusFilter}
                    options={statusOptions}
                    onChange={(v) => setStatusFilter(v as any)}
                />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(x) => x.id}
                contentContainerStyle={s.listContent}
                renderItem={({ item }) => {
                    const canEdit = item.status === "ordinato";

                    return (
                        <View style={s.card}>
                            <Text style={s.cardTitle}>{item.ragioneSociale}</Text>

                            <Text style={s.lineMuted}>
                                Stato: <Text style={s.lineStrong}>{niceStatus(item.status)}</Text>
                            </Text>

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
                                        router.push(
                                            {
                                                pathname: canEdit ? "/ordini/modifica" : "/ordini/visualizza",
                                                params: { id: item.id },
                                            } as any
                                        )
                                    }
                                    style={s.btnPrimary}
                                >
                                    <Text style={s.btnPrimaryText}>{canEdit ? "Modifica" : "Visualizza"}</Text>
                                </Pressable>
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={<Text style={s.empty}>Nessun ordine</Text>}
            />
        </View>
    );
}
