import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { router } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import { useClients } from "@/lib/providers/ClientsProvider";
import type { OrderStatus } from "@/lib/models/order";

import { Select } from "@/lib/ui/components/Select";
import { s } from "@/lib/ui/tabs.styles";

type FulfillmentType = "receive" | "pickup";

type ItemVM = {
    id: string;
    quantity: number;
    fulfillmentType: FulfillmentType;
    boughtFlags: boolean[];
    receivedFlags: boolean[];
};

function ensureBoolArray(v: any, len: number) {
    const out = Array.from({ length: Math.max(0, len) }, () => false);
    if (!Array.isArray(v)) return out;
    for (let i = 0; i < out.length; i++) out[i] = Boolean(v[i]);
    return out;
}

function normalizeItems(ord: any): ItemVM[] {
    const rawItems = Array.isArray(ord?.items) ? ord.items : null;

    if (rawItems && rawItems.length > 0) {
        return rawItems.map((it: any, idx: number) => {
            const quantity = Math.max(0, parseInt(String(it?.quantity ?? 0), 10) || 0);
            const ft: FulfillmentType = it?.fulfillmentType === "pickup" ? "pickup" : "receive";

            return {
                id: String(it?.id ?? `item-${idx}`),
                quantity,
                fulfillmentType: ft,
                boughtFlags: ensureBoolArray(it?.boughtFlags, quantity),
                receivedFlags: ensureBoolArray(it?.receivedFlags, quantity),
            };
        });
    }

    const quantity = Math.max(0, parseInt(String(ord?.quantity ?? 0), 10) || 0);
    const ft: FulfillmentType = Boolean(ord?.flagToPickup) ? "pickup" : "receive";

    return [
        {
            id: "legacy",
            quantity,
            fulfillmentType: ft,
            boughtFlags: ensureBoolArray(ord?.boughtFlags, quantity),
            receivedFlags: ensureBoolArray(ord?.receivedFlags, quantity),
        },
    ];
}

function getCounts(items: ItemVM[]) {
    let totalQty = 0;
    let bought = 0;

    for (const it of items) {
        totalQty += Math.max(0, it.quantity || 0);
        for (const f of it.boughtFlags) if (f) bought++;
    }

    const toBuy = Math.max(0, totalQty - bought);

    let stage: "ordine_nuovo" | "in_lavorazione" | "concluso" = "ordine_nuovo";
    if (totalQty > 0 && bought > 0 && bought < totalQty) stage = "in_lavorazione";
    if (totalQty > 0 && bought === totalQty) stage = "concluso";

    return { totalQty, bought, toBuy, stage };
}

function getPending(items: ItemVM[]) {
    let receive = 0;
    let pickup = 0;

    for (const it of items) {
        for (let i = 0; i < it.quantity; i++) {
            const isBought = Boolean(it.boughtFlags[i]);
            const isReceived = Boolean(it.receivedFlags[i]);
            if (isBought && !isReceived) {
                if (it.fulfillmentType === "pickup") pickup++;
                else receive++;
            }
        }
    }

    return { receive, pickup, total: receive + pickup };
}

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
                <Select label="Filtra stato" value={statusFilter} options={statusOptions} onChange={(v) => setStatusFilter(v as any)} />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(x) => x.id}
                contentContainerStyle={s.listContent}
                renderItem={({ item }) => {
                    const st: OrderStatus = (item as any).status;

                    const items = normalizeItems(item as any);
                    const c = getCounts(items);

                    const allBought = c.toBuy === 0 && c.totalQty > 0;
                    const pending = allBought ? getPending(items) : { receive: 0, pickup: 0, total: 0 };
                    const fullyDone = allBought && pending.total === 0;

                    const showDaOrdinare = st === "ordinato" && c.toBuy > 0;
                    const showDaRicevere = st === "ordinato" && allBought && pending.receive > 0;
                    const showDaRitirare = st === "ordinato" && allBought && pending.pickup > 0;

                    const actionPath = fullyDone ? "/ordini/visualizza" : "/ordini/modifica";
                    const actionLabel = fullyDone ? "Visualizza" : "Modifica";

                    return (
                        <View style={s.card}>
                            <Text style={s.cardTitle}>{item.ragioneSociale}</Text>

                            <Text style={s.lineMuted}>
                                Stato: <Text style={s.lineStrong}>{niceStatus(st)}</Text>
                            </Text>

                            {st === "ordinato" ? (
                                <Text style={s.lineMuted}>
                                    Ordine: <Text style={s.lineStrong}>{c.stage}</Text>
                                </Text>
                            ) : null}

                            <Text style={s.lineMuted}>
                                Comprati:{" "}
                                <Text style={s.lineStrong}>
                                    {c.bought}/{c.totalQty}
                                </Text>
                            </Text>

                            <View style={s.row}>
                                {showDaOrdinare ? (
                                    <View style={s.badge}>
                                        <Text style={s.badgeText}>Da ordinare {c.toBuy}</Text>
                                    </View>
                                ) : null}

                                {showDaRicevere ? (
                                    <View style={s.badge}>
                                        <Text style={s.badgeText}>Da ricevere {pending.receive}</Text>
                                    </View>
                                ) : null}

                                {showDaRitirare ? (
                                    <View style={s.badge}>
                                        <Text style={s.badgeText}>Da ritirare {pending.pickup}</Text>
                                    </View>
                                ) : null}
                            </View>

                            <View style={s.row}>
                                <Pressable
                                    onPress={() => router.push({ pathname: actionPath as any, params: { id: item.id } } as any)}
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
