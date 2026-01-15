import { useMemo, useState } from "react";
import { Alert, FlatList, Text, TextInput, View, Platform } from "react-native";

import { router } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import type { OrderPurchaseStage, OrderStatus } from "@/lib/models/order";
import { deleteOrderCascade } from "@/lib/repos/orders.repo";

import { Select } from "@/lib/ui/components/Select";
import { ClientSmartSearch, type ClientLite } from "@/lib/ui/components/ClientSmartSearch";
// OrderMotionCard non lo usiamo più per avere più controllo sul layout, ma lascio l'import se serve altrove
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

type StatusFilter =
    | "all"
    | OrderStatus
    | OrderPurchaseStage
    | "da_ordinare"
    | "da_ricevere"
    | "da_ritirare";

function ensureBoolArray(v: any, len: number) {
    const out = Array.from({ length: Math.max(0, len) }, () => false);
    if (!Array.isArray(v)) return out;
    for (let i = 0; i < out.length; i++) out[i] = Boolean(v[i]);
    return out;
}

function normalizeItems(ord: any): ItemVM[] {
    const rawItems = Array.isArray(ord?.items) ? ord.items : null;

    // nuovo schema: items multipli
    if (rawItems && rawItems.length > 0) {
        return rawItems.map((it: any, idx: number) => {
            const q = Number(it?.quantity) || 0;
            const ft: FulfillmentType =
                it?.fulfillmentType === "pickup" ? "pickup" : "receive";

            return {
                id: String(it?.id ?? `item-${idx}`),
                quantity: q,
                fulfillmentType: ft,
                boughtFlags: ensureBoolArray(it?.boughtFlags, q),
                receivedFlags: ensureBoolArray(it?.receivedFlags, q),
            };
        });
    }

    // legacy: ordine singolo
    const quantity = Number(ord?.quantity) || 0;
    const ft: FulfillmentType = ord?.fulfillmentType === "pickup" ? "pickup" : "receive";

    return [
        {
            id: String(ord?.id ?? "legacy-item"),
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
        totalQty += it.quantity;
        for (let i = 0; i < it.quantity; i++) {
            if (it.boughtFlags[i]) bought += 1;
        }
    }

    const stage: OrderPurchaseStage =
        bought <= 0 ? "ordine_nuovo" : bought < totalQty ? "in_lavorazione" : "concluso";

    const toBuy = Math.max(0, totalQty - bought);

    return { totalQty, bought, stage, toBuy };
}

function getPending(items: ItemVM[]) {
    let receiveTotal = 0;
    let pickupTotal = 0;
    let receiveDone = 0;
    let pickupDone = 0;

    for (const it of items) {
        for (let i = 0; i < it.quantity; i++) {
            const done = Boolean(it.receivedFlags[i]);
            if (it.fulfillmentType === "receive") {
                receiveTotal += 1;
                if (done) receiveDone += 1;
            } else {
                pickupTotal += 1;
                if (done) pickupDone += 1;
            }
        }
    }

    const receive = Math.max(0, receiveTotal - receiveDone);
    const pickup = Math.max(0, pickupTotal - pickupDone);
    const total = receive + pickup;

    return { receive, pickup, total };
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
    const { orders, refresh } = useOrders();

    const [clientIdFilter, setClientIdFilter] = useState<string | null>(null);
    const [clientText, setClientText] = useState("");

    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [q, setQ] = useState("");

    const onDeleteOrder = (orderId: string) => {
        const doDelete = async () => {
            try {
                await deleteOrderCascade(orderId);
                await refresh();
            } catch (e: any) {
                const msg = e?.message ?? "Impossibile eliminare l'ordine";
                if (Platform.OS === "web") {
                    // eslint-disable-next-line no-alert
                    alert(msg);
                } else {
                    Alert.alert("Errore", msg);
                }
            }
        };

        if (Platform.OS === "web") {
            // eslint-disable-next-line no-restricted-globals
            const ok = confirm("Vuoi eliminare questo ordine? Verranno eliminati anche tutti i pezzi collegati.");
            if (ok) void doDelete();
            return;
        }

        Alert.alert(
            "Elimina ordine",
            "Vuoi eliminare questo ordine? Verranno eliminati anche tutti i pezzi collegati.",
            [
                { text: "Annulla", style: "cancel" },
                { text: "Elimina", style: "destructive", onPress: () => void doDelete() },
            ]
        );
    };


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
        ] as { label: string; value: StatusFilter }[];
    }, []);

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();

        return (orders ?? [])
            .filter((o: any) => {
                if (clientIdFilter && o?.clientId !== clientIdFilter) return false;

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

                if (!okStatus) return false;

                if (!qq) return true;

                const totalStr = String(o?.total ?? "").toLowerCase();
                const rsStr = String(o?.ragioneSociale ?? "").toLowerCase();

                // prova anche dentro items (materiale/nome/descrizione)
                const itemsStr = Array.isArray(o?.items)
                    ? o.items
                        .map((it: any) => `${it?.materialLabel ?? ""} ${it?.materialName ?? ""} ${it?.note ?? ""}`)
                        .join(" ")
                        .toLowerCase()
                    : "";

                return (
                    rsStr.includes(qq) ||
                    totalStr.includes(qq) ||
                    itemsStr.includes(qq) ||
                    String(o?.code ?? "").toLowerCase().includes(qq)
                );
            })
            .sort((a: any, b: any) => {
                const ax = Number(a?.createdAt?.seconds ?? 0);
                const bx = Number(b?.createdAt?.seconds ?? 0);
                return bx - ax;
            });
    }, [orders, clientIdFilter, q, statusFilter]);

    return (
        <Screen>
            <SectionHeader title="Ordini" />

            {/* Header */}
            <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Chip label="Nuovo" tone="primary" onPress={() => router.push("/ordini/nuovo" as any)} />
                    <Chip label="Mostra tutto" tone="neutral" onPress={() => setClientIdFilter(null)} />
                    {clientIdFilter ? <Chip label={`Filtro cliente attivo`} tone="neutral" /> : null}
                </View>

                <Card>
                    <View style={{ gap: 12 }}>
                        <View style={{ gap: 8 }}>
                            <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>Cliente</Text>

                            <ClientSmartSearch
                                label="Cliente"
                                placeholder="Cerca ragione sociale o codice…"
                                value={clientText}
                                onChangeValue={setClientText}
                                selectedId={clientIdFilter}
                                onSelect={(c) => {
                                    setClientIdFilter(c.id);
                                    setClientText(c.ragioneSociale); // opzionale ma comodo: mette il nome nella barra
                                }}
                                onClear={() => {
                                    setClientIdFilter(null);
                                    setClientText("");
                                }}
                                maxRecent={10}
                                maxResults={20}
                            />


                        </View>

                        <Select
                            label="Stato"
                            value={statusFilter}
                            options={statusOptions}
                            onChange={(v) => setStatusFilter(v as any)}
                        />

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
                                    borderRadius: 12,
                                    paddingVertical: 10,
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
                keyExtractor={(x: any) => x.id}
                contentContainerStyle={{ paddingTop: 14, paddingBottom: 110 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
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
                        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                            <Card>
                                <View style={{ gap: 10 }}>
                                    {/* Header: Nome Cliente e Bottone Azione */}
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            gap: 12,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 18,
                                                fontWeight: "800",
                                                color: theme.colors.text,
                                                flex: 1,
                                                lineHeight: 22,
                                            }}
                                            numberOfLines={2}
                                        >
                                            {item.ragioneSociale || "Cliente sconosciuto"}
                                        </Text>

                                        <Chip
                                            label={actionLabel}
                                            tone={fullyDone ? "neutral" : "primary"}
                                            onPress={() =>
                                                router.push({
                                                    pathname: actionPath as any,
                                                    params: { id: item.id },
                                                } as any)
                                            }
                                        />

                                        <Chip
                                            label="Elimina"
                                            tone="danger"
                                            onPress={() => onDeleteOrder(item.id)}
                                        />
                                    </View>

                                    {/* Griglia Statistiche Responsive */}
                                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
                                        <View>
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    color: theme.colors.muted,
                                                    fontWeight: "700",
                                                    textTransform: "uppercase",
                                                }}
                                            >
                                                Stato
                                            </Text>
                                            <Text style={{ fontSize: 14, color: theme.colors.text, fontWeight: "600" }}>
                                                {niceStatus(st)}
                                            </Text>
                                        </View>

                                        <View>
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    color: theme.colors.muted,
                                                    fontWeight: "700",
                                                    textTransform: "uppercase",
                                                }}
                                            >
                                                Avanzamento
                                            </Text>
                                            <Text style={{ fontSize: 14, color: theme.colors.text, fontWeight: "600" }}>
                                                {c.bought} / {c.totalQty}
                                            </Text>
                                        </View>

                                        {st === "ordinato" && (
                                            <View>
                                                <Text
                                                    style={{
                                                        fontSize: 11,
                                                        color: theme.colors.muted,
                                                        fontWeight: "700",
                                                        textTransform: "uppercase",
                                                    }}
                                                >
                                                    Fase
                                                </Text>
                                                <Text style={{ fontSize: 14, color: theme.colors.text, fontWeight: "600" }}>
                                                    {niceStage(c.stage)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Chips / Warning Footer */}
                                    {chips.length > 0 && (
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                flexWrap: "wrap",
                                                gap: 6,
                                                paddingTop: 10,
                                                borderTopWidth: 1,
                                                borderTopColor: theme.colors.border,
                                            }}
                                        >
                                            {chips.map((chipLabel, i) => (
                                                <View key={`${item.id}-chip-${i}`}>
                                                    <Chip label={chipLabel} />
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </Card>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <Text style={{ color: theme.colors.muted, textAlign: "center", marginTop: 20 }}>
                        Nessun ordine trovato
                    </Text>
                }
            />
        </Screen>
    );
}
