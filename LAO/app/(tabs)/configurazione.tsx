import { useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import { useClients } from "@/lib/providers/ClientsProvider";

import { Select } from "@/lib/ui/components/Select";
import { Screen } from "@/lib/ui/kit/Screen";
import { Card } from "@/lib/ui/kit/Card";
import { Chip } from "@/lib/ui/kit/Chip";
import { theme } from "@/lib/ui/theme";

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
        <Screen scroll={false} contentStyle={{ paddingBottom: 0 }}>
            <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.2 }}>
                            Configurazione
                        </Text>
                        <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                            Da configurare: {ready.length}
                        </Text>
                    </View>
                </View>

                <Card>
                    <Select
                        label="Ragione sociale"
                        value={clientFilter}
                        options={clientOptions}
                        onChange={(v) => setClientFilter(v as any)}
                        searchable
                    />
                </Card>
            </View>

            <FlatList
                style={{ flex: 1 }}
                data={ready}
                keyExtractor={(x) => x.id}
                contentContainerStyle={{ paddingTop: 14, paddingBottom: 110 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                    <Card>
                        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
                            {item.ragioneSociale}
                        </Text>

                        <View style={{ gap: 6, marginTop: 10 }}>
                            <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                                Materiale: <Text style={{ color: theme.colors.text }}>{item.materialName ?? item.materialType}</Text>
                            </Text>
                            <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                                Quantità: <Text style={{ color: theme.colors.text }}>{item.quantity}</Text>
                            </Text>
                            <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                                Totale: <Text style={{ color: theme.colors.text }}>{item.totalPrice}</Text>
                            </Text>
                        </View>

                        <View style={{ marginTop: 12 }}>
                            <Chip
                                label="Configura"
                                tone="primary"
                                onPress={() =>
                                    router.push({ pathname: "/configurazione/dettaglio" as any, params: { id: item.id } } as any)
                                }
                            />
                        </View>
                    </Card>
                )}
                ListEmptyComponent={<Text style={{ color: theme.colors.muted, fontWeight: "900" }}>Nessun ordine da configurare</Text>}
            />
        </Screen>
    );
}
