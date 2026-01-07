import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { router } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import { useClients } from "@/lib/providers/ClientsProvider";
import type { OrderStatus } from "@/lib/models/order";
import {
    formatOrderPurchaseStage,
    formatDayFromMs,
    getOrderBoughtCount,
    getOrderItemsTitle,
    getOrderPurchaseStage,
    getOrderToBuyCount,
    getOrderTotalQuantity,
    getOrderTotalPriceFromItems,
    getOrderPendingFulfillmentCounts,
    getOrderIsFullyFulfilled,
} from "@/lib/models/order";

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
                    const totalQty = getOrderTotalQuantity(item);
                    const boughtCount = getOrderBoughtCount(item);

                    const toBuyCount = getOrderToBuyCount(item);
                    const purchaseStage = getOrderPurchaseStage(item);

                    const fulfill = getOrderPendingFulfillmentCounts(item);
                    const allBought = toBuyCount === 0;
                    const fullyDone = getOrderIsFullyFulfilled(item);

                    // bottoni
                    let actionLabel = "Gestisci";
                    let actionPath: any = "/ordini/visualizza";

                    if (boughtCount === 0) {
                        actionLabel = "Modifica";
                        actionPath = "/ordini/modifica";
                    } else if (!allBought) {
                        actionLabel = "Gestisci";
                        actionPath = "/ordini/visualizza";
                    } else if (allBought && !fullyDone) {
                        actionLabel = "Consegna";
                        actionPath = "/ordini/visualizza";
                    } else {
                        actionLabel = "Visualizza";
                        actionPath = "/ordini/visualizza";
                    }

                    return (
                        <View style={s.card}>
                            <Text style={s.cardTitle}>{item.ragioneSociale}</Text>

                            <Text style={s.lineMuted}>
                                Stato: <Text style={s.lineStrong}>{niceStatus(item.status)}</Text>
                            </Text>

                            {item.orderDateMs ? (
                                <Text style={s.lineMuted}>
                                    Data: <Text style={s.lineStrong}>{formatDayFromMs(item.orderDateMs)}</Text>
                                </Text>
                            ) : null}

                            <Text style={s.lineMuted}>
                                Articoli: <Text style={s.lineStrong}>{getOrderItemsTitle(item)}</Text>
                            </Text>

                            <Text style={s.lineMuted}>
                                Totale: <Text style={s.lineStrong}>{getOrderTotalPriceFromItems(item)}</Text>
                            </Text>

                            {item.status === "ordinato" ? (
                                <>
                                    <Text style={s.lineMuted}>
                                        Ordine: <Text style={s.lineStrong}>{formatOrderPurchaseStage(purchaseStage)}</Text>
                                    </Text>

                                    <Text style={s.lineMuted}>
                                        Comprati:{" "}
                                        <Text style={s.lineStrong}>
                                            {boughtCount}/{Math.max(0, totalQty)}
                                        </Text>
                                    </Text>
                                </>
                            ) : null}

                            <View style={s.row}>
                                {/* FASE 1: da ordinare */}
                                {item.status === "ordinato" && toBuyCount > 0 ? (
                                    <View style={s.badge}>
                                        <Text style={s.badgeText}>Da ordinare {toBuyCount}</Text>
                                    </View>
                                ) : null}

                                {/* FASE 2: solo dopo che è tutto comprato */}
                                {item.status === "ordinato" && allBought && fulfill.receive > 0 ? (
                                    <View style={s.badge}>
                                        <Text style={s.badgeText}>Da ricevere {fulfill.receive}</Text>
                                    </View>
                                ) : null}

                                {item.status === "ordinato" && allBought && fulfill.pickup > 0 ? (
                                    <View style={s.badge}>
                                        <Text style={s.badgeText}>Da ritirare {fulfill.pickup}</Text>
                                    </View>
                                ) : null}
                            </View>

                            <View style={s.row}>
                                <Pressable
                                    onPress={() =>
                                        router.push({ pathname: actionPath, params: { id: item.id } } as any)
                                    }
                                    style={s.btnPrimary}
                                >
                                    <Text style={s.btnPrimaryText}>{actionLabel}</Text>
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
