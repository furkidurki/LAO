import { useMemo, useState } from "react";
import { Text, TextInput, Pressable, Alert, Platform, ScrollView, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";

import { useDistributors } from "@/lib/providers/DistributorsProvider";
import { useMaterials } from "@/lib/providers/MaterialsProvider";
import { useClients } from "@/lib/providers/ClientsProvider";
import type { OrderItem } from "@/lib/models/order";
import { addOrder } from "@/lib/repos/orders.repo";
import { s } from "./ordini.styles";

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

function showAlert(title: string, msg: string) {
    if (Platform.OS === "web") window.alert(`${title}\n\n${msg}`);
    else Alert.alert(title, msg);
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

export default function NuovoOrdine() {
    const { distributors } = useDistributors();
    const { materials } = useMaterials();
    const { clients } = useClients();

    const [clientId, setClientId] = useState("");
    const selectedClient = useMemo(() => clients.find((c) => c.id === clientId) ?? null, [clientId, clients]);

    const [items, setItems] = useState<DraftItem[]>([newDraftItem()]);

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

    function onPickClient(v: string) {
        if (v === ADD) {
            setClientId("");
            router.push({ pathname: "/settings/editClienti" as any, params: { openAdd: "1" } } as any);
            return;
        }
        setClientId(v);
    }

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
        if (!selectedClient) return showAlert("Errore", "Seleziona una ragione sociale (cliente)");
        if (computed.lines.length === 0) return showAlert("Errore", "Aggiungi almeno un articolo");

        for (let i = 0; i < computed.lines.length; i++) {
            const it = computed.lines[i];
            if (!it.materialType) return showAlert("Errore", `Articolo #${i + 1}: seleziona un tipo materiale`);
            if (!it.distributorId) return showAlert("Errore", `Articolo #${i + 1}: seleziona un distributore`);
            if (it.quantity <= 0) return showAlert("Errore", `Articolo #${i + 1}: quantità non valida`);
        }

        const orderDateMs = Date.now();

        const orderItems: OrderItem[] = computed.lines.map((x) => {
            const cleanDesc = x.description.trim();
            const materialNameClean = (x.materialName || "").trim();

            return {
                id: x.id,
                materialType: x.materialType,
                materialName: materialNameClean.length > 0 ? materialNameClean : undefined,
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

        // legacy fields (compatibilità)
        const first = orderItems[0];
        const legacyQuantity = computed.totalQty;
        const legacyUnitPrice = legacyQuantity > 0 ? computed.totalPrice / legacyQuantity : 0;

        const payload: any = {
            clientId: selectedClient.id,
            code: selectedClient.code,
            ragioneSociale: selectedClient.ragioneSociale,

            // legacy
            materialType: first.materialType,
            materialName: first.materialName,
            description: null, // NON undefined
            quantity: legacyQuantity,
            distributorId: first.distributorId,
            distributorName: first.distributorName,
            unitPrice: Math.round(legacyUnitPrice * 100) / 100,
            totalPrice: computed.totalPrice,

            // new
            items: orderItems,

            status: "ordinato",
            orderDateMs,
            flagToReceive: false,
            flagToPickup: false,
        };

        try {
            await addOrder(payload);
            showAlert("Ok", "Ordine salvato");
            router.replace("/(tabs)/ordini" as any);
        } catch (e: any) {
            console.log(e);
            const msg = String(e?.message ?? e ?? "Errore sconosciuto");
            showAlert("Errore", `Non riesco a salvare l'ordine\n\n${msg}`);
        }
    }

    return (
        <ScrollView contentContainerStyle={s.page}>
            <Text style={s.title}>Nuovo Ordine</Text>

            <View style={s.card}>
                <Text style={s.label}>Ragione sociale (cliente)</Text>
                <View style={s.pickerBox}>
                    <Picker selectedValue={clientId} onValueChange={(v) => onPickClient(String(v))}>
                        <Picker.Item label="Seleziona..." value="" />
                        <Picker.Item label="+ Aggiungi cliente..." value={ADD} />
                        {clients.map((c) => (
                            <Picker.Item key={c.id} label={c.ragioneSociale} value={c.id} />
                        ))}
                    </Picker>
                </View>

                <Text style={s.label}>Codice cliente (auto)</Text>
                <TextInput value={selectedClient?.code ?? ""} editable={false} style={[s.input, s.inputDisabled]} />
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
                    <Text style={s.btnPrimaryText}>Salva</Text>
                </Pressable>

                <Pressable onPress={() => router.back()} style={s.btnMuted}>
                    <Text style={s.btnMutedText}>Annulla</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}
