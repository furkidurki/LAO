import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList } from "react-native";

import type { WarehouseItem } from "@/lib/models/warehouse";
import { subscribeWarehouseItems } from "@/lib/repos/warehouse.repo";

type MaterialGroup = {
    materialLabel: string;
    items: WarehouseItem[];
};

export default function MagazzinoTab() {
    const [items, setItems] = useState<WarehouseItem[]>([]);

    useEffect(() => {
        return subscribeWarehouseItems(setItems);
    }, []);

    const grouped: MaterialGroup[] = useMemo(() => {
        const byMat = new Map<string, WarehouseItem[]>();

        for (const it of items) {
            const key = (it.materialLabel || "Materiale").trim();
            if (!byMat.has(key)) byMat.set(key, []);
            byMat.get(key)!.push(it);
        }

        const out: MaterialGroup[] = Array.from(byMat.entries())
            .map(([materialLabel, arr]) => ({
                materialLabel,
                items: arr.slice().sort((a, b) => (a.serialNumber || "").localeCompare(b.serialNumber || "")),
            }))
            .sort((a, b) => a.materialLabel.localeCompare(b.materialLabel));

        return out;
    }, [items]);

    return (
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Magazzino</Text>
            <Text style={{ opacity: 0.7 }}>Totale pezzi: {items.length}</Text>

            <FlatList
                data={grouped}
                keyExtractor={(x) => x.materialLabel}
                renderItem={({ item }) => (
                    <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                        <Text style={{ fontWeight: "800", fontSize: 16 }}>
                            {item.materialLabel} — {item.items.length}
                        </Text>

                        {item.items.map((x) => (
                            <Text key={x.id} style={{ marginTop: 6 }}>
                                • {x.serialNumber}
                            </Text>
                        ))}
                    </View>
                )}
                ListEmptyComponent={<Text>Nessun oggetto in magazzino</Text>}
            />
        </View>
    );
}
