import { useMemo, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import type { OrderPurchaseStage, OrderStatus } from "@/lib/models/order";

import { Select } from "@/lib/ui/components/Select";
import { ClientSmartSearch, type ClientLite } from "@/lib/ui/components/ClientSmartSearch";
import { OrderMotionCard } from "@/lib/ui/components/OrderMotionCard";
import { Screen } from "@/lib/ui/kit/Screen";
import { SectionHeader } from "@/lib/ui/kit/SectionHeader";
import { Chip } from "@/lib/ui/kit/Chip";
import { Card } from "@/lib/ui/kit/Card";
import { theme } from "@/lib/ui/theme";

type FulfillmentType = "receive" | "pickup";

type ItemVM = {
    id: string;
    quantity: number;
    fulfillmentType: FulfillmentType;
    boughtFlags: boolean[];
    receivedFlags: boolean[];
};

type StatusFilter = "all" | OrderStatus | OrderPurchaseStage | "da_ordinare" | "da_ricevere" | "da_ritirare";

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

    let stage: OrderPurchaseStage = "ordine_nuovo";
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

function niceStage(x: OrderPurchaseStage) {
    if (x === "ordine_nuovo") return "ordine nuovo";
    if (x === "in_lavorazione") return "in lavorazione";
    return "concluso";
}

function isBaseStatus(v: StatusFilter): v is OrderStatus {
    return v === "ordinato" || v === "arrivato" || v === "venduto" || v === "in_prestito";
}

export default function OrdiniTab() {
    const { orders } = useOrders();

    const [clientIdFilter, setClientIdFilter] = useState<string | null>(null);
    const [clientText, setClientText] = useState("");

    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [q, setQ] = useState("");

    const statusOptions = useMemo(() => {
        return [
            { label: "Tutti", value: "all" },

            { label: "Ordinato (base)", value: "ordinato" },
            { label: "Arrivato", value: "arrivato" },
            { label: "Venduto", value: "venduto" },
            { label: "In prestito", value: "in_prestito" },

            { label: "Ordine nuovo", value: "ordine_nuovo" },
            { label: "In lavorazione", value: "in_lavorazione" },
            { label: "Concluso", value: "concluso" },

            { label: "Da ordinare", value: "da_ordinare" },
            { label: "Da ricevere", value: "da_ricevere" },
            { label: "Da ritirare", value: "da_ritirare" },
        ];
    }, []);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        const clientNeedle = clientText.trim().toLowerCase();

        return orders.filter((o) => {
            const items = normalizeItems(o as any);
            const c = getCounts(items);

            const allBought = c.toBuy === 0 && c.totalQty > 0;
            const pending = allBought ? getPending(items) : { receive: 0, pickup: 0, total: 0 };

            const okStatus = (() => {
                if (statusFilter === "all") return true;

                if (isBaseStatus(statusFilter)) return o.status === statusFilter;
                if (o.status !== "ordinato") return false;

                if (statusFilter === "ordine_nuovo") return c.stage === "ordine_nuovo";
                if (statusFilter === "in_lavorazione") return c.stage === "in_lavorazione";
                if (statusFilter === "concluso") return c.stage === "concluso";

                if (statusFilter === "da_ordinare") return c.toBuy > 0;
                if (statusFilter === "da_ricevere") return allBought && pending.receive > 0;
                if (statusFilter === "da_ritirare") return allBought && pending.pickup > 0;

                return true;
            })();

            const okClient = (() => {
                if (clientIdFilter) return o.clientId === clientIdFilter;
                if (!clientNeedle) return true;
                const rs = String(o.ragioneSociale ?? "").toLowerCase();
                return rs.includes(clientNeedle);
            })();

            if (!needle) return okClient && okStatus;

            const hay = [
                o.ragioneSociale,
                (o as any).materialName,
                (o as any).materialType,
                String((o as any).totalPrice ?? ""),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return okClient && okStatus && hay.includes(needle);
        });
    }, [orders, clientIdFilter, clientText, statusFilter, q]);

    const hasFilters =
        clientIdFilter !== null || clientText.trim().length > 0 || statusFilter !== "all" || q.trim().length > 0;

    function resetFilters() {
        setClientIdFilter(null);
        setClientText("");
        setStatusFilter("all");
        setQ("");
    }

    function onPickClient(c: ClientLite) {
        setClientIdFilter(c.id);
        setClientText(c.ragioneSociale);
    }

    return (
        <Screen scroll={false} contentStyle={{ paddingBottom: 0 }}>
            <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.2 }}>
                            Ordini
                        </Text>
                        <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                            Totali: {orders.length} • Visibili: {filtered.length}
                        </Text>
                    </View>

                    <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {hasFilters ? <Chip label="Reset" onPress={resetFilters} /> : null}
                        <Chip label="Nuovo" tone="primary" onPress={() => router.push("/ordini/nuovo" as any)} />
                    </View>
                </View>

                <Card>
                    <SectionHeader title="Filtri" />
                    <View style={{ gap: 12 }}>
                        <ClientSmartSearch
                            label="Ragione sociale (cliente)"
                            value={clientText}
                            onChangeValue={(t) => {
                                setClientText(t);
                                setClientIdFilter(null); // se scrive libero, non blocchiamo per id
                            }}
                            selectedId={clientIdFilter}
                            onSelect={onPickClient}
                            onClear={() => {
                                setClientIdFilter(null);
                                setClientText("");
                            }}
                            maxRecent={10}
                            maxResults={20}
                        />

                        <Select label="Stato" value={statusFilter} options={statusOptions} onChange={(v) => setStatusFilter(v as any)} />

                        <View style={{ gap: 8 }}>
                            <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>Cerca</Text>
                            <TextInput
                                value={q}
                                onChangeText={setQ}
                                placeholder="Materiale, totale..."
                                placeholderTextColor={theme.colors.muted}
                                style={{
                                    backgroundColor: theme.colors.surface2,
                                    borderWidth: 1,
                                    borderColor: theme.colors.border,
                                    borderRadius: theme.radius.lg,
                                    paddingVertical: 12,
                                    paddingHorizontal: 12,
                                    color: theme.colors.text,
                                    fontWeight: "900",
                                }}
                            />
                        </View>
                    </View>
                </Card>
            </View>

            <FlatList
                style={{ flex: 1 }}
                data={filtered}
                keyExtractor={(x) => x.id}
                contentContainerStyle={{ paddingTop: 14, paddingBottom: 110 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item, index }) => {
                    const st: OrderStatus = (item as any).status;

                    const items = normalizeItems(item as any);
                    const c = getCounts(items);

                    const allBought = c.toBuy === 0 && c.totalQty > 0;
                    const pending = allBought ? getPending(items) : { receive: 0, pickup: 0, total: 0 };
                    const fullyDone = allBought && pending.total === 0;

                    const chips: string[] = [];
                    if (st === "ordinato" && c.toBuy > 0) chips.push(`Da ordinare ${c.toBuy}`);
                    if (st === "ordinato" && allBought && pending.receive > 0) chips.push(`Da ricevere ${pending.receive}`);
                    if (st === "ordinato" && allBought && pending.pickup > 0) chips.push(`Da ritirare ${pending.pickup}`);

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
                                ...(st === "ordinato" ? [{ label: "Ordine:", value: niceStage(c.stage) }] : []),
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
                ListEmptyComponent={<Text style={{ color: theme.colors.muted, fontWeight: "900" }}>Nessun ordine</Text>}
            />
        </Screen>
    );
}
