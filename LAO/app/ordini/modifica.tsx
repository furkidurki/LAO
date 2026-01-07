import { useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, TextInput, Pressable, Alert } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router, useLocalSearchParams } from "expo-router";

import { useOrders } from "@/lib/providers/OrdersProvider";
import { useDistributors } from "@/lib/providers/DistributorsProvider";
import { useMaterials } from "@/lib/providers/MaterialsProvider";
import type { OrderItem, OrderStatus } from "@/lib/models/order";
import * as OrderModel from "@/lib/models/order";
import { updateOrder } from "@/lib/repos/orders.repo";
import { s } from "./ordini.styles";

const EDITABLE_STATUSES: OrderStatus[] = ["ordinato", "arrivato"];
const ADD = "__add__";

type DraftItem = {
    id: string;
    materialType: string;
    description: string;
    quantityStr: string;
    unitPriceStr: string;
    distributorId: string;
};

function uid() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function money(n: number) {
    if (!isFinite(n)) return "0";
    return String(Math.round(n * 100) / 100);
}

function parseIntSafe(x: string) {
    const n = parseInt(x || "0", 10);
    if (!Number.isFinite(n)) return 0;
    return n;
}

function parseFloatSafe(x: string) {
    const n = parseFloat(x || "0");
    if (!Number.isFinite(n)) return 0;
    return n;
}

function toDraftItem(it: OrderItem): DraftItem {
    return {
        id: it.id || uid(),
        materialType: it.materialType || "",
        description: it.description || "",
        quantityStr: String(it.quantity ?? 0),
        unitPriceStr: String(it.unitPrice ?? 0),
        distributorId: it.distributorId || "",
    };
}

function newDraftItem(): DraftItem {
    return {
        id: uid(),
        materialType: "",
        description: "",
        quantityStr: "1",
        unitPriceStr: "0",
        distributorId: "",
    };
}

export default function ModificaOrdine() {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const orderId = String(id || "");

    const { orders } = useOrders();
    const { distributors } = useDistributors();
    const { materials } = useMaterials();

    const ord = useMemo(() => orders.find((o) => o.id === orderId) ?? null, [orders, orderId]);
    const boughtCount = useMemo(() => (ord ? OrderModel.getOrderBoughtCount(ord) : 0), [ord]);

    const [code, setCode] = useState("");
    const [ragioneSociale, setRagioneSociale] = useState("");
    const [status, setStatus] = useState<OrderStatus>("ordinato");

    const [items, setItems] = useState<DraftItem[]>([newDraftItem()]);

    useEffect(() => {
        if (!ord) return;

        setCode(ord.code ?? "");
        setRagioneSociale(ord.ragioneSociale ?? "");
        setStatus(ord.status === "ordinato" || ord.status === "arrivato" ? ord.status : "ordinato");

        const normalizedItems = OrderModel.getOrderItems(ord);
        setItems(normalizedItems.map(toDraftItem));
    }, [ord]);

    const computed = useMemo(() => {
        const lines = items.map((it) => {
            const quantity = Math.max(0, parseIntSafe(it.quantityStr));
            const unitPrice = Math.max(0, parseFloatSafe(it.unitPriceStr));
            const totalPrice = Math.round(quantity * unitPrice * 100) / 100;

            const materialName = materials.find((m) => m.id === it.materialType)?.name ?? "";
            const distributorName = distributors.find((d) => d.id === it.distributorId)?.name ?? "";

            return { ...it, quantity, unitPrice, totalPrice, materialName, distributorName };
        });

        const totalPrice = Math.round(lines.reduce((acc, x) => acc + (Number(x.totalPrice) || 0), 0) * 100) / 100;
        const totalQty = lines.reduce((acc, x) => acc + (Number(x.quantity) || 0), 0);

        return { lines, totalPrice, totalQty };
    }, [items, materials, distributors]);

    function setItem<K extends keyof DraftItem>(id: string, key: K, value: DraftItem[K]) {
        setItems((prev) => prev.map((x) => (x.id === id ? { ...x, [key]: value } : x)));
    }

    function onPickMaterial(itemId: string, v: string) {
        if (v === ADD) {
            router.push({ pathname: "/settings/editMaterials" as any, params: { openAdd: "1" } } as any);
            return;
        }
        setItem(itemId, "materialType", v);
    }

    function onPickDistributor(itemId: string, v: string) {
        if (v === ADD) {
            router.push({ pathname: "/settings/editDistributori" as any, params: { openAdd: "1" } } as any);
            return;
        }
        setItem(itemId, "distributorId", v);
    }

    function addLine() {
        setItems((prev) => [...prev, newDraftItem()]);
    }

    function removeLine(id: string) {
        setItems((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.id !== id)));
    }

    async function onSave() {
        if (!orderId) return Alert.alert("Errore", "Manca id ordine");
        if (!code.trim()) return Alert.alert("Errore", "Metti codice cliente");
        if (!ragioneSociale.trim()) return Alert.alert("Errore", "Metti ragione sociale");
        if (computed.lines.length === 0) return Alert.alert("Errore", "Aggiungi almeno un articolo");

        for (let i = 0; i < computed.lines.length; i++) {
            const it = computed.lines[i];
            if (!it.materialType) return Alert.alert("Errore", `Articolo #${i + 1}: seleziona un tipo materiale`);
            if (!it.distributorId) return Alert.alert("Errore", `Articolo #${i + 1}: seleziona un distributore`);
            if (it.quantity <= 0) return Alert.alert("Errore", `Articolo #${i + 1}: quantità non valida`);
        }

        const orderItems: OrderItem[] = computed.lines.map((x) => {
            const cleanDesc = x.description.trim();
            return {
                id: x.id,
                materialType: x.materialType,
                materialName: x.materialName,
                description: cleanDesc.length > 0 ? cleanDesc : undefined,
                quantity: x.quantity,
                distributorId: x.distributorId,
                distributorName: x.distributorName,
                unitPrice: x.unitPrice,
                totalPrice: x.totalPrice,
                boughtFlags: Array.from({ length: Math.max(0, x.quantity) }, () => false),
                boughtAtMs: Array.from({ length: Math.max(0, x.quantity) }, () => null),
                receivedFlags: Array.from({ length: Math.max(0, x.quantity) }, () => false),
                receivedAtMs: Array.from({ length: Math.max(0, x.quantity) }, () => null),
            };
        });

        const first = orderItems[0];
        const legacyQuantity = computed.totalQty;
        const legacyUnitPrice = legacyQuantity > 0 ? computed.totalPrice / legacyQuantity : 0;

        const patch: any = {
            code: code.trim(),
            ragioneSociale: ragioneSociale.trim(),

            // legacy
            materialType: first.materialType,
            materialName: first.materialName,
            description: null,
            quantity: legacyQuantity,
            distributorId: first.distributorId,
            distributorName: first.distributorName,
            unitPrice: Math.round(legacyUnitPrice * 100) / 100,
            totalPrice: computed.totalPrice,

            // new
            items: orderItems,

            status,

            flagToReceive: Boolean(ord?.flagToReceive),
            flagToPickup: Boolean(ord?.flagToPickup),
        };

        try {
            await updateOrder(orderId, patch);
            Alert.alert("Ok", "Ordine aggiornato");
            router.back();
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare modifiche");
        }
    }

    if (!orderId) {
        return (
            <View style={{ flex: 1, padding: 16 }}>
                <Text>Errore: manca id ordine</Text>
            </View>
        );
    }

    if (!ord) {
        return (
            <View style={{ flex: 1, padding: 16 }}>
                <Text>Caricamento ordine...</Text>
                <Pressable onPress={() => router.back()} style={{ marginTop: 10 }}>
                    <Text style={{ textDecorationLine: "underline" }}>Indietro</Text>
                </Pressable>
            </View>
        );
    }

    // se c'è anche 1 pezzo comprato -> solo Visualizza
    if (boughtCount > 0) {
        return (
            <View style={{ flex: 1, padding: 16, gap: 12 }}>
                <Text style={{ fontWeight: "900" }}>Questo ordine ha articoli comprati.</Text>
                <Text>Per sicurezza non si può modificare. Usa Visualizza.</Text>

                <Pressable
                    onPress={() => router.replace({ pathname: "/ordini/visualizza" as any, params: { id: orderId } } as any)}
                    style={[s.btnPrimary, { alignItems: "center" }]}
                >
                    <Text style={s.btnPrimaryText}>Visualizza</Text>
                </Pressable>

                <Pressable onPress={() => router.back()} style={[s.btnMuted, { alignItems: "center" }]}>
                    <Text style={s.btnMutedText}>Indietro</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={s.page}>
            <Text style={s.title}>Modifica Ordine</Text>

            <View style={s.card}>
                <Text style={s.label}>Codice cliente</Text>
                <TextInput value={code} onChangeText={setCode} style={s.input} />

                <Text style={s.label}>Ragione sociale</Text>
                <TextInput value={ragioneSociale} onChangeText={setRagioneSociale} style={s.input} />

                <Text style={s.label}>Stato ordine</Text>
                <View style={s.pickerBox}>
                    <Picker selectedValue={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
                        {EDITABLE_STATUSES.map((x) => (
                            <Picker.Item key={x} label={x} value={x} />
                        ))}
                    </Picker>
                </View>
            </View>

            <View style={s.card}>
                <Text style={s.label}>Articoli nell'ordine</Text>

                {computed.lines.map((it, idx) => (
                    <View
                        key={it.id}
                        style={{
                            backgroundColor: "rgba(255,255,255,0.04)",
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.12)",
                            borderRadius: 16,
                            padding: 12,
                            gap: 10,
                        }}
                    >
                        <Text style={{ color: "white", fontWeight: "900" }}>Articolo #{idx + 1}</Text>

                        <Text style={s.label}>Tipo di materiale</Text>
                        <View style={s.pickerBox}>
                            <Picker selectedValue={it.materialType} onValueChange={(v) => onPickMaterial(it.id, String(v))}>
                                <Picker.Item label="Seleziona..." value="" />
                                <Picker.Item label="+ Aggiungi materiale..." value={ADD} />
                                {materials.map((m) => (
                                    <Picker.Item key={m.id} label={m.name} value={m.id} />
                                ))}
                            </Picker>
                        </View>

                        <Text style={s.label}>Descrizione (opzionale)</Text>
                        <TextInput
                            value={it.description}
                            onChangeText={(t) => setItem(it.id, "description", t)}
                            placeholder="Testo..."
                            placeholderTextColor={"rgba(229,231,235,0.70)"}
                            multiline
                            style={[s.input, { minHeight: 70, textAlignVertical: "top" }]}
                        />

                        <View style={s.row}>
                            <View style={{ flex: 1, minWidth: 140, gap: 8 }}>
                                <Text style={s.label}>Quantità</Text>
                                <TextInput
                                    value={it.quantityStr}
                                    onChangeText={(t) => setItem(it.id, "quantityStr", t)}
                                    keyboardType="number-pad"
                                    style={s.input}
                                />
                            </View>

                            <View style={{ flex: 1, minWidth: 140, gap: 8 }}>
                                <Text style={s.label}>Prezzo singolo</Text>
                                <TextInput
                                    value={it.unitPriceStr}
                                    onChangeText={(t) => setItem(it.id, "unitPriceStr", t)}
                                    keyboardType="decimal-pad"
                                    style={s.input}
                                />
                            </View>
                        </View>

                        <Text style={s.label}>Distributore</Text>
                        <View style={s.pickerBox}>
                            <Picker selectedValue={it.distributorId} onValueChange={(v) => onPickDistributor(it.id, String(v))}>
                                <Picker.Item label="Seleziona..." value="" />
                                <Picker.Item label="+ Aggiungi distributore..." value={ADD} />
                                {distributors.map((d) => (
                                    <Picker.Item key={d.id} label={d.name} value={d.id} />
                                ))}
                            </Picker>
                        </View>

                        <Text style={s.help}>Totale articolo: {money(it.totalPrice)}</Text>

                        <View style={s.row}>
                            <Pressable onPress={() => removeLine(it.id)} style={s.btnMuted}>
                                <Text style={s.btnMutedText}>Rimuovi articolo</Text>
                            </Pressable>
                        </View>
                    </View>
                ))}

                <Pressable onPress={addLine} style={s.btnMuted}>
                    <Text style={s.btnMutedText}>+ Aggiungi articolo</Text>
                </Pressable>
            </View>

            <View style={s.card}>
                <Text style={s.label}>Riepilogo</Text>
                <Text style={s.help}>Pezzi totali: {computed.totalQty}</Text>
                <Text style={s.help}>Totale ordine: {money(computed.totalPrice)}</Text>

                <Pressable onPress={onSave} style={s.btnPrimary}>
                    <Text style={s.btnPrimaryText}>Salva Modifiche</Text>
                </Pressable>

                <Pressable onPress={() => router.back()} style={s.btnMuted}>
                    <Text style={s.btnMutedText}>Annulla</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}
