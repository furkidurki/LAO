import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { router } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import { useClients } from "@/lib/providers/ClientsProvider";
import type { OrderStatus } from "@/lib/models/order";

import { Select } from "@/lib/ui/components/Select";
import { s } from "@/lib/ui/tabs.styles";
import { OrderMotionCard } from "@/lib/ui/components/OrderMotionCard";

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
            const q = Number(it?.quantity) || 0;
            const ft: FulfillmentType = it?.fulfillmentType === "pickup" ? "pickup" : "receive";

            return {
                id: String(it?.id ?? `item-${idx}`),
                quantity: q,
                fulfillmentType: ft,
                boughtFlags: ensureBoolArray(it?.boughtFlags, q),
                receivedFlags: ensureBoolArray(it?.receivedFlags, q),
            };
        });
    }

    // fallback legacy format
    const quantity = Number(ord?.quantity) || 0;
    const ft: FulfillmentType = ord?.fulfillmentType === "pickup" ? "pickup" : "receive";

    return [
        {
            id: String(ord?.id ?? "legacy"),
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
            const bought = Boolean(it.boughtFlags[i]);
            const received = Boolean(it.receivedFlags[i]);

            if (!bought) continue;
            if (received) continue;

            if (it.fulfillmentType === "pickup") pickup++;
            else receive++;
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

    const [clientFilter, setClientFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

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

    const filtered = useMemo(() => {
        return orders.filter((o) => {
            const okClient = clientFilter === "all" ? true : o.clientId === clientFilter;
            const okStatus = statusFilter === "all" ? true : o.status === statusFilter;
            return okClient && okStatus;
        });
    }, [orders, clientFilter, statusFilter]);

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
                renderItem={({ item, index }) => {
                    const st: OrderStatus = (item as any).status;

                    const items = normalizeItems(item as any);
                    const c = getCounts(items);

                    const allBought = c.toBuy === 0 && c.totalQty > 0;
                    const pending = allBought ? getPending(items) : { receive: 0, pickup: 0, total: 0 };
                    const fullyDone = allBought && pending.total === 0;

                    const showDaOrdinare = st === "ordinato" && c.toBuy > 0;
                    const showDaRicevere = st === "ordinato" && allBought && pending.receive > 0;
                    const showDaRitirare = st === "ordinato" && allBought && pending.pickup > 0;

                    const chips: string[] = [];
                    if (showDaOrdinare) chips.push(`Da ordinare ${c.toBuy}`);
                    if (showDaRicevere) chips.push(`Da ricevere ${pending.receive}`);
                    if (showDaRitirare) chips.push(`Da ritirare ${pending.pickup}`);

                    const actionPath = fullyDone ? "/ordini/visualizza" : "/ordini/modifica";
                    const actionLabel = fullyDone ? "Visualizza" : "Modifica";

                    return (
                        <OrderMotionCard
                            index={index}
                            status={st}
                            title={item.ragioneSociale}
                            meta={`Qta ${c.totalQty} • Comprati ${c.bought}/${c.totalQty}`}
                            badge={niceStatus(st)}
                            lines={[
                                { label: "Stato:", value: niceStatus(st) },
                                ...(st === "ordinato" ? [{ label: "Ordine:", value: c.stage }] : []),
                            ]}
                            chips={chips}
                            action={{
                                label: actionLabel,
                                onPress: () =>
                                    router.push(
                                        {
                                            pathname: actionPath as any,
                                            params: { id: item.id },
                                        } as any
                                    ),
                            }}
                        />
                    );
                }}
                ListEmptyComponent={<Text style={s.empty}>Nessun ordine</Text>}
            />
        </View>
    );
}
