import { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import type { OrderStatus } from "@/lib/models/order";
import { s } from "@/lib/ui/tabs.styles";


function niceStatus(st: OrderStatus) {
    if (st === "in_prestito") return "in prestito";
    return st;
}

export default function HomeTab() {
    const { orders } = useOrders();

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

    return (
        <View style={s.page}>
            <Text style={s.title}>Home</Text>
            <Text style={s.subtitle}>Dashboard veloce</Text>

            <View style={s.grid}>
                <View style={s.statCard}>
                    <Text style={s.statValue}>{stats.total}</Text>
                    <Text style={s.statLabel}>Ordini totali</Text>
                </View>
                <View style={s.statCard}>
                    <Text style={s.statValue}>{stats.ordinato}</Text>
                    <Text style={s.statLabel}>Ordinati</Text>
                </View>
                <View style={s.statCard}>
                    <Text style={s.statValue}>{stats.arrivato}</Text>
                    <Text style={s.statLabel}>Arrivati</Text>
                </View>
                <View style={s.statCard}>
                    <Text style={s.statValue}>{stats.venduto}</Text>
                    <Text style={s.statLabel}>Venduti</Text>
                </View>
                <View style={s.statCard}>
                    <Text style={s.statValue}>{stats.prestito}</Text>
                    <Text style={s.statLabel}>In prestito</Text>
                </View>
                <View style={s.statCard}>
                    <Text style={s.statValue}>{Math.round(stats.totalValue * 100) / 100}</Text>
                    <Text style={s.statLabel}>Totale €</Text>
                </View>
            </View>

            <Text style={s.sectionTitle}>Azioni rapide</Text>
            <View style={s.row}>
                <Pressable onPress={() => router.push("/ordini/nuovo" as any)} style={s.btnPrimary}>
                    <Text style={s.btnPrimaryText}>+ Nuovo ordine</Text>
                </Pressable>
                <Pressable onPress={() => router.push("/(tabs)/ordini" as any)} style={s.btnMuted}>
                    <Text style={s.btnMutedText}>Ordini</Text>
                </Pressable>
                <Pressable onPress={() => router.push("/(tabs)/configurazione" as any)} style={s.btnMuted}>
                    <Text style={s.btnMutedText}>Configurazione</Text>
                </Pressable>
                <Pressable onPress={() => router.push("/(tabs)/venduto" as any)} style={s.btnMuted}>
                    <Text style={s.btnMutedText}>Venduto</Text>
                </Pressable>
                <Pressable onPress={() => router.push("/(tabs)/prestito" as any)} style={s.btnMuted}>
                    <Text style={s.btnMutedText}>Prestito</Text>
                </Pressable>
                <Pressable onPress={() => router.push("/(tabs)/magazzino" as any)} style={s.btnMuted}>
                    <Text style={s.btnMutedText}>Magazzino</Text>
                </Pressable>
            </View>

            <Text style={s.sectionTitle}>Ultimi ordini</Text>
            <View style={s.card}>
                {lastOrders.length === 0 ? (
                    <Text style={s.empty}>Nessun ordine</Text>
                ) : (
                    lastOrders.map((o) => (
                        <Pressable
                            key={o.id}
                            onPress={() =>
                                router.push(
                                    {
                                        pathname: o.status === "ordinato" ? "/ordini/modifica" : "/ordini/visualizza",
                                        params: { id: o.id },
                                    } as any
                                )
                            }
                            style={s.rowBetween}
                        >
                            <View style={{ flex: 1, gap: 4 }}>
                                <Text style={s.lineStrong}>{o.ragioneSociale}</Text>
                                <Text style={s.lineMuted}>
                                    {o.materialName ?? o.materialType} • Qta {o.quantity} • Tot {o.totalPrice}
                                </Text>
                            </View>

                            <View style={s.badge}>
                                <Text style={s.badgeText}>{niceStatus(o.status).toUpperCase()}</Text>
                            </View>
                        </Pressable>
                    ))
                )}
            </View>
        </View>
    );
}
