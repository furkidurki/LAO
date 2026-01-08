import { useMemo } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { router } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import type { OrderStatus } from "@/lib/models/order";
import { theme } from "@/lib/ui/theme";
import { AnimatedIn, Chip, Screen, SectionHeader } from "@/lib/ui/kit";
import { OrderMotionCard } from "@/lib/ui/components/OrderMotionCard";

function niceStatus(st: OrderStatus) {
    if (st === "in_prestito") return "in prestito";
    return st;
}

function formatMoney(n: number) {
    const x = Math.round(n * 100) / 100;
    return x.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function HomeTab() {
    const { orders } = useOrders();
    const { width } = useWindowDimensions();

    const stats = useMemo(() => {
        const total = orders.length;

        const ordinato = orders.filter((o) => o.status === "ordinato").length;
        const arrivato = orders.filter((o) => o.status === "arrivato").length;
        const venduto = orders.filter((o) => o.status === "venduto").length;
        const prestito = orders.filter((o) => o.status === "in_prestito").length;

        const totalValue = orders.reduce((acc, o) => acc + (Number(o.totalPrice) || 0), 0);

        return { total, ordinato, arrivato, venduto, prestito, totalValue };
    }, [orders]);

    const lastOrders = useMemo(() => orders.slice(0, 6), [orders]);

    // Responsive grid width (no % strings, no vertical text)
    const grid = useMemo(() => {
        const contentMax = Math.min(width, 980);
        const paddingX = theme.spacing.xl * 2;
        const gap = 12;
        const usable = Math.max(320, contentMax - paddingX);

        let cols = 1;
        if (usable >= 520) cols = 2;
        if (usable >= 820) cols = 3;
        if (usable >= 1040) cols = 4;

        const itemW = Math.floor((usable - gap * (cols - 1)) / cols);
        return { cols, itemW, gap };
    }, [width]);

    const tiles = [
        { label: "Ordini totali", value: String(stats.total), tone: "neutral" as const },
        { label: "Ordinati", value: String(stats.ordinato), tone: "primary" as const },
        { label: "Arrivati", value: String(stats.arrivato), tone: "neutral" as const },
        { label: "Venduti", value: String(stats.venduto), tone: "neutral" as const },
        { label: "In prestito", value: String(stats.prestito), tone: "neutral" as const },
        { label: "Totale €", value: formatMoney(stats.totalValue), tone: "primary" as const },
    ];

    return (
        <Screen>
            <AnimatedIn fromY={14}>
                <View style={{ gap: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
                        <View style={{ flex: 1, gap: 6 }}>
                            <Text
                                style={{
                                    color: theme.colors.text,
                                    fontSize: theme.typography.title.fontSize,
                                    fontWeight: theme.typography.title.fontWeight,
                                    letterSpacing: theme.typography.title.letterSpacing,
                                }}
                            >
                                Dashboard
                            </Text>
                            <Text style={{ color: theme.colors.muted, fontWeight: "800" }}>
                                Stato ordini e scorciatoie rapide
                            </Text>
                        </View>

                        <Chip
                            label={`€ ${formatMoney(stats.totalValue)}`}
                            tone="primary"
                            onPress={() => router.push("/(tabs)/ordini" as any)}
                        />
                    </View>

                    <View style={{ height: 1, backgroundColor: theme.colors.border }} />
                </View>
            </AnimatedIn>

            <SectionHeader
                title="Panoramica"
                right={<Chip label="Apri ordini" onPress={() => router.push("/(tabs)/ordini" as any)} />}
            />

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: grid.gap }}>
                {tiles.map((t, idx) => (
                    <AnimatedIn key={t.label} delayMs={60 + idx * 60} fromY={10}>
                        <View style={{ width: grid.itemW }}>
                            <View
                                style={{
                                    backgroundColor: theme.colors.surface,
                                    borderWidth: 1,
                                    borderColor:
                                        t.tone === "primary" ? "rgba(0,183,194,0.35)" : theme.colors.border,
                                    borderRadius: theme.radius.lg,
                                    padding: theme.spacing.lg,
                                    overflow: "hidden",
                                    ...theme.shadow.card,
                                }}
                            >
                                {/* small accent bar */}
                                <View
                                    pointerEvents="none"
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: 4,
                                        backgroundColor: t.tone === "primary" ? theme.colors.primary : "rgba(46,91,255,0.20)",
                                    }}
                                />

                                <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 22 }}>
                                    {t.value}
                                </Text>
                                <Text style={{ color: theme.colors.muted, fontWeight: "800", marginTop: 6 }}>
                                    {t.label}
                                </Text>
                            </View>
                        </View>
                    </AnimatedIn>
                ))}
            </View>

            <SectionHeader title="Azioni rapide" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <Chip label="Nuovo ordine" tone="primary" onPress={() => router.push("/ordini/nuovo" as any)} />
                <Chip label="Ordini" onPress={() => router.push("/(tabs)/ordini" as any)} />
                <Chip label="Magazzino" onPress={() => router.push("/(tabs)/magazzino" as any)} />
                <Chip label="Venduto" onPress={() => router.push("/(tabs)/venduto" as any)} />
                <Chip label="Prestito" onPress={() => router.push("/(tabs)/prestito" as any)} />
                <Chip label="Configurazione" onPress={() => router.push("/(tabs)/configurazione" as any)} />
            </View>

            <SectionHeader
                title="Ultimi ordini"
                right={<Chip label="Vedi tutti" onPress={() => router.push("/(tabs)/ordini" as any)} />}
            />

            {lastOrders.length === 0 ? (
                <AnimatedIn delayMs={80}>
                    <Text style={{ color: theme.colors.muted, fontWeight: "800" }}>Nessun ordine</Text>
                </AnimatedIn>
            ) : (
                <View style={{ gap: 12 }}>
                    {lastOrders.map((o, index) => (
                        <OrderMotionCard
                            key={o.id}
                            index={index}
                            status={o.status}
                            title={o.ragioneSociale}
                            meta={`${o.materialName ?? o.materialType} • Qta ${o.quantity} • Tot ${o.totalPrice}`}
                            badge={niceStatus(o.status)}
                            onPress={() =>
                                router.push(
                                    {
                                        pathname: o.status === "ordinato" ? "/ordini/modifica" : "/ordini/visualizza",
                                        params: { id: o.id },
                                    } as any
                                )
                            }
                        />
                    ))}
                </View>
            )}
        </Screen>
    );
}
