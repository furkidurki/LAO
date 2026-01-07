import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { router } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import { useClients } from "@/lib/providers/ClientsProvider";
import type { OrderStatus } from "@/lib/models/order";
import { formatOrderPurchaseStage, formatDayFromMs, getOrderBoughtCount, getOrderPurchaseStage } from "@/lib/models/order";

import { Select } from "@/lib/ui/components/Select";
import { s } from "@/lib/ui/tabs.styles";

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
                    const boughtCount = getOrderBoughtCount(item);
                    const purchaseStage = getOrderPurchaseStage(item);

                    const canEdit = item.status === "ordinato" && boughtCount === 0;

                    const showPurchaseInfo = item.status === "ordinato";
                    const showDaOrdinare = showPurchaseInfo && boughtCount < Math.max(0, item.quantity || 0);
                    const showDaRicevere = Boolean(item.flagToReceive);
                    const showDaRitirare = Boolean(item.flagToPickup);

                    return (
                        <View style={s.card}>
                            <Text style={s.cardTitle}>{item.ragioneSociale}</Text>

                            <Text style={s.lineMuted}>
                                Stato: <Text style={s.lineStrong}>{niceStatus(item.status)}</Text>
                            </Text>

                            {showPurchaseInfo ? (
                                <Text style={s.lineMuted}>
                                    Acquisto: <Text style={s.lineStrong}>{formatOrderPurchaseStage(purchaseStage)}</Text>
                                </Text>
                            ) : null}

                            {item.orderDateMs ? (
                                <Text style={s.lineMuted}>
                                    Data ordine: <Text style={s.lineStrong}>{formatDayFromMs(item.orderDateMs)}</Text>
                                </Text>
                            ) : null}

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
                                {showDaOrdinare ? (
                                    <View style={s.badge}>
                                        <Text style={s.badgeText}>Da ordinare</Text>
                                    </View>
                                ) : null}
                                {showDaRicevere ? (
                                    <View style={s.badge}>
                                        <Text style={s.badgeText}>Da ricevere</Text>
                                    </View>
                                ) : null}
                                {showDaRitirare ? (
                                    <View style={s.badge}>
                                        <Text style={s.badgeText}>Da ritirare</Text>
                                    </View>
                                ) : null}
                            </View>

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
