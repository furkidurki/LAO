import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList } from "react-native";

import type { OrderPiece } from "@/lib/models/piece";
import { subscribePiecesByStatus } from "@/lib/repos/pieces.repo";

function fmtDateFromFirestore(ts: any): string {
    if (!ts) return "-";
    // Firestore Timestamp
    if (typeof ts?.toDate === "function") {
        const d = ts.toDate();
        return fmtDate(d);
    }
    // seconds/nanoseconds
    if (typeof ts?.seconds === "number") {
        const d = new Date(ts.seconds * 1000);
        return fmtDate(d);
    }
    // already ms
    if (typeof ts === "number") return fmtDate(new Date(ts));
    // fallback
    return "-";
}

function fmtDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

type MaterialGroup = {
    materialLabel: string;
    items: OrderPiece[];
};

type ClientGroup = {
    ragioneSociale: string;
    materials: MaterialGroup[];
};

export default function VendutoTab() {
    const [pieces, setPieces] = useState<OrderPiece[]>([]);

    useEffect(() => {
        return subscribePiecesByStatus("venduto", setPieces);
    }, []);

    const grouped: ClientGroup[] = useMemo(() => {
        const byClient = new Map<string, Map<string, OrderPiece[]>>();

        for (const p of pieces) {
            const clientKey = (p.ragioneSociale || "Senza ragione sociale").trim();
            const materialLabel = (p.materialName && p.materialName.trim().length > 0)
                ? p.materialName
                : p.materialType;

            if (!byClient.has(clientKey)) byClient.set(clientKey, new Map());
            const byMat = byClient.get(clientKey)!;

            const matKey = materialLabel || "Materiale";
            if (!byMat.has(matKey)) byMat.set(matKey, []);
            byMat.get(matKey)!.push(p);
        }

        const out: ClientGroup[] = [];

        for (const [ragioneSociale, byMat] of byClient.entries()) {
            const materials: MaterialGroup[] = Array.from(byMat.entries())
                .map(([materialLabel, items]) => ({
                    materialLabel,
                    items: items.slice().sort((a, b) => (a.serialNumber || "").localeCompare(b.serialNumber || "")),
                }))
                .sort((a, b) => a.materialLabel.localeCompare(b.materialLabel));

            out.push({ ragioneSociale, materials });
        }

        out.sort((a, b) => a.ragioneSociale.localeCompare(b.ragioneSociale));
        return out;
    }, [pieces]);

    return (
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Venduto</Text>
            <Text style={{ opacity: 0.7 }}>
                Ragione sociale → Materiale → Seriali
            </Text>

            <FlatList
                data={grouped}
                keyExtractor={(x) => x.ragioneSociale}
                renderItem={({ item }) => (
                    <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                        <Text style={{ fontWeight: "800", fontSize: 16 }}>{item.ragioneSociale}</Text>

                        {item.materials.map((m) => (
                            <View key={m.materialLabel} style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1 }}>
                                <Text style={{ fontWeight: "700" }}>
                                    {m.materialLabel} — {m.items.length} pezzi
                                </Text>

                                {m.items.map((p) => (
                                    <Text key={p.id} style={{ marginTop: 4 }}>
                                        • {p.serialNumber}  —  Data: {fmtDateFromFirestore(p.createdAt)}
                                    </Text>
                                ))}
                            </View>
                        ))}
                    </View>
                )}
                ListEmptyComponent={<Text>Nessun pezzo venduto</Text>}
            />
        </View>
    );
}
