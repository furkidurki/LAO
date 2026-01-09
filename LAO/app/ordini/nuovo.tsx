import { useEffect, useMemo, useState } from "react";
import {
    Text,
    TextInput,
    Pressable,
    Alert,
    Platform,
    ScrollView,
    View,
    FlatList,
    Modal,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useOrders } from "@/lib/providers/OrdersProvider";
import { useDistributors } from "@/lib/providers/DistributorsProvider";
import { useMaterials } from "@/lib/providers/MaterialsProvider";
import { useClients } from "@/lib/providers/ClientsProvider";
import type { OrderItem } from "@/lib/models/order";
import { addOrder } from "@/lib/repos/orders.repo";
import { s } from "./ordini.styles";
import { theme } from "@/lib/ui/theme";

type DraftItem = {
    id: string;
    materialType: string; // materialId
    quantityStr: string;
    unitPriceStr: string;
    note: string;
    distributorId: string;
};

function newDraftItem(): DraftItem {
    return {
        id: String(Date.now()) + "-" + String(Math.random()).slice(2),
        materialType: "",
        quantityStr: "1",
        unitPriceStr: "",
        note: "",
        distributorId: "",
    };
}

function parseIntSafe(s: string) {
    const v = parseInt(String(s || "").replace(/[^\d]/g, ""), 10);
    return Number.isFinite(v) ? v : 0;
}

function parseFloatSafe(s: string) {
    const cleaned = String(s || "").replace(",", ".").replace(/[^\d.]/g, "");
    const v = parseFloat(cleaned);
    return Number.isFinite(v) ? v : 0;
}

function money(x: number) {
    const n = Number.isFinite(x) ? x : 0;
    return n.toFixed(2) + "€";
}

function showAlert(title: string, message: string) {
    if (Platform.OS === "web") {
        // eslint-disable-next-line no-alert
        alert(`${title}\n\n${message}`);
        return;
    }
    Alert.alert(title, message);
}

function uniqStrings(arr: string[]) {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const x of arr) {
        const v = String(x || "");
        if (!v) continue;
        if (seen.has(v)) continue;
        seen.add(v);
        out.push(v);
    }
    return out;
}

type PickerMode = "material" | "distributor";

export default function NuovoOrdine() {
    const { distributors } = useDistributors();
    const { materials } = useMaterials();
    const { clients } = useClients();

    // --- CLIENT SEARCH ---
    const [clientId, setClientId] = useState("");
    const [clientQuery, setClientQuery] = useState("");
    const [clientSearchOpen, setClientSearchOpen] = useState(false);

    // ✅ se vuoi cambiare soglia: metti 1 o 2
    const MIN_CLIENT_CHARS = 2;
    const { refresh } = useOrders();

    function closeClientDropdown() {
        setClientSearchOpen(false);
    }
    const { refresh: refreshOrders } = useOrders();

    const selectedClient = useMemo(() => clients.find((c) => c.id === clientId) ?? null, [clientId, clients]);

    const filteredClients = useMemo(() => {
        const q = clientQuery.trim().toLowerCase();

        // ✅ niente lista se non scrivi abbastanza
        if (q.length < MIN_CLIENT_CHARS) return [];

        return clients
            .filter((c) => {
                const rs = (c.ragioneSociale || "").toLowerCase();
                const code = (c.code || "").toLowerCase();
                return rs.includes(q) || code.includes(q);
            })
            .slice(0, 25);
    }, [clients, clientQuery]);

    // --- ORDER ITEMS ---
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

    function setItem<K extends keyof DraftItem>(id: string, key: K, value: DraftItem[K]) {
        setItems((prev) => prev.map((x) => (x.id === id ? { ...x, [key]: value } : x)));
    }

    function onPickMaterial(itemId: string, v: string) {
        setItem(itemId, "materialType", v);
    }

    function onPickDistributor(itemId: string, v: string) {
        setItem(itemId, "distributorId", v);
    }

    function addLine() {
        setItems((prev) => [...prev, newDraftItem()]);
    }

    function removeLine(id: string) {
        setItems((prev) => prev.filter((x) => x.id !== id));
    }

    function clearClientSearch() {
        setClientId("");
        setClientQuery("");
        setClientSearchOpen(false);
    }

    function selectClient(id: string) {
        const c = clients.find((x) => x.id === id);
        if (!c) return;
        setClientId(c.id);
        setClientQuery(c.ragioneSociale);
        setClientSearchOpen(false);
    }

    // ------------------------------
    // SMART PICKER (Materials / Distributors)
    // ------------------------------
    const RECENT_MATERIALS_KEY = "@lao/recentMaterials/v1";
    const RECENT_DISTRIBUTORS_KEY = "@lao/recentDistributors/v1";

    const [recentMaterialIds, setRecentMaterialIds] = useState<string[]>([]);
    const [recentDistributorIds, setRecentDistributorIds] = useState<string[]>([]);

    const [smartPicker, setSmartPicker] = useState<{
        open: boolean;
        mode: PickerMode;
        itemId: string | null;
        query: string;
    }>({ open: false, mode: "material", itemId: null, query: "" });

    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [debounceTick, setDebounceTick] = useState(0);

    useEffect(() => {
        (async () => {
            try {
                const a = await AsyncStorage.getItem(RECENT_MATERIALS_KEY);
                if (a) setRecentMaterialIds(uniqStrings(JSON.parse(a)).slice(0, 10));
            } catch {}
            try {
                const b = await AsyncStorage.getItem(RECENT_DISTRIBUTORS_KEY);
                if (b) setRecentDistributorIds(uniqStrings(JSON.parse(b)).slice(0, 10));
            } catch {}
        })();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(smartPicker.query), 250);
        return () => clearTimeout(t);
    }, [smartPicker.query, debounceTick]);

    function openMaterialPicker(itemId: string) {
        // ✅ chiudi subito dropdown clienti
        closeClientDropdown();

        setSmartPicker({ open: true, mode: "material", itemId, query: "" });
        setDebouncedQuery("");
        setDebounceTick((x) => x + 1);
    }

    function openDistributorPicker(itemId: string) {
        // ✅ chiudi subito dropdown clienti
        closeClientDropdown();

        setSmartPicker({ open: true, mode: "distributor", itemId, query: "" });
        setDebouncedQuery("");
        setDebounceTick((x) => x + 1);
    }

    async function pushRecentMaterial(id: string) {
        const next = uniqStrings([id, ...recentMaterialIds]).slice(0, 10);
        setRecentMaterialIds(next);
        try {
            await AsyncStorage.setItem(RECENT_MATERIALS_KEY, JSON.stringify(next));
        } catch {}
    }

    async function pushRecentDistributor(id: string) {
        const next = uniqStrings([id, ...recentDistributorIds]).slice(0, 10);
        setRecentDistributorIds(next);
        try {
            await AsyncStorage.setItem(RECENT_DISTRIBUTORS_KEY, JSON.stringify(next));
        } catch {}
    }

    const pickerTitle = smartPicker.mode === "material" ? "Seleziona materiale" : "Seleziona distributore";

    const pickerRows = useMemo(() => {
        const q = (debouncedQuery || "").trim().toLowerCase();

        if (smartPicker.mode === "material") {
            const all = materials.slice();
            const byId = new Map(all.map((m) => [m.id, m]));
            const recent = recentMaterialIds.map((id) => byId.get(id)).filter(Boolean);

            if (!q) {
                const allCap = all.slice(0, 200);
                const merged = [...recent, ...allCap.filter((m) => !recentMaterialIds.includes(m.id))];
                return merged;
            }

            return all.filter((m) => (m.name || "").toLowerCase().includes(q)).slice(0, 50);
        }

        const all = distributors.slice();
        const byId = new Map(all.map((d) => [d.id, d]));
        const recent = recentDistributorIds.map((id) => byId.get(id)).filter(Boolean);

        if (!q) {
            const allCap = all.slice(0, 200);
            const merged = [...recent, ...allCap.filter((d) => !recentDistributorIds.includes(d.id))];
            return merged;
        }

        return all.filter((d) => (d.name || "").toLowerCase().includes(q)).slice(0, 50);
    }, [smartPicker.mode, debouncedQuery, materials, distributors, recentMaterialIds, recentDistributorIds]);

    async function selectFromSmartPicker(selectedId: string) {
        if (!smartPicker.itemId) return;

        if (smartPicker.mode === "material") {
            onPickMaterial(smartPicker.itemId, selectedId);
            await pushRecentMaterial(selectedId);
        } else {
            onPickDistributor(smartPicker.itemId, selectedId);
            await pushRecentDistributor(selectedId);
        }

        setSmartPicker({ open: false, mode: smartPicker.mode, itemId: null, query: "" });
        setDebouncedQuery("");
    }

    function closeSmartPicker() {
        setSmartPicker({ open: false, mode: smartPicker.mode, itemId: null, query: "" });
        setDebouncedQuery("");
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

        const orderItems: OrderItem[] = computed.lines.map((it) => {
            const quantity = it.quantity;
            const unitPrice = it.unitPrice;
            const totalPrice = Math.round(quantity * unitPrice * 100) / 100;

            return {
                id: it.id,
                materialType: it.materialType,
                materialName: it.materialName || undefined,
                quantity,

                distributorId: it.distributorId,
                distributorName: it.distributorName || "",

                unitPrice,
                totalPrice,

                boughtFlags: Array.from({ length: quantity }, () => false),
                boughtAtMs: Array.from({ length: quantity }, () => null),

                fulfillmentType: "receive",

                receivedFlags: Array.from({ length: quantity }, () => false),
                receivedAtMs: Array.from({ length: quantity }, () => null),
            };
        });

        const first = orderItems[0];
        if (!first) {
            showAlert("Errore", "Aggiungi almeno un articolo");
            return;
        }

        try {
            await addOrder({
                clientId: selectedClient.id,
                ragioneSociale: selectedClient.ragioneSociale,
                code: selectedClient.code || "",

                materialType: first.materialType,
                materialName: first.materialName,
                description: first.description,
                quantity: computed.totalQty,
                distributorId: first.distributorId,
                distributorName: first.distributorName,
                unitPrice: first.unitPrice,
                totalPrice: computed.totalPrice,

                items: orderItems,

                status: "ordinato",
                orderDateMs,
            });
            await refreshOrders();

            showAlert("Ok", "Ordine salvato");
            router.back();
        } catch (e) {
            console.log(e);
            showAlert("Errore", "Non riesco a salvare l'ordine");
        }
    }

    return (
        <>
            {/* SMART PICKER MODAL */}
            <Modal visible={smartPicker.open} animationType="slide" onRequestClose={closeSmartPicker}>
                <View style={[s.page, { paddingTop: 18, backgroundColor: theme.colors.bg }]}>
                    <Text style={[s.title, { marginBottom: 6 }]}>{pickerTitle}</Text>

                    <Text style={[s.help, { marginBottom: 10 }]}>
                        {smartPicker.mode === "material" ? "Recenti (quando vuoto) + ricerca" : "Recenti (quando vuoto) + ricerca"}
                    </Text>

                    <View style={s.card}>
                        <Text style={s.label}>Cerca</Text>
                        <TextInput
                            value={smartPicker.query}
                            onChangeText={(t) => setSmartPicker((p) => ({ ...p, query: t }))}
                            placeholder={smartPicker.mode === "material" ? "Scrivi nome materiale..." : "Scrivi nome distributore..."}
                            placeholderTextColor={theme.colors.muted}
                            style={s.input}
                            autoFocus
                        />

                        <View style={[s.row, { marginTop: 10 }]}>
                            <Pressable onPress={closeSmartPicker} style={s.btnMuted}>
                                <Text style={s.btnMutedText}>Chiudi</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => {
                                    closeSmartPicker();
                                    if (smartPicker.mode === "material") {
                                        router.push({ pathname: "/settings/editMaterials" as any, params: { openAdd: "1" } } as any);
                                    } else {
                                        router.push({ pathname: "/settings/editDistributori" as any, params: { openAdd: "1" } } as any);
                                    }
                                }}
                                style={s.btnPrimary}
                            >
                                <Text style={s.btnPrimaryText}>
                                    {smartPicker.mode === "material" ? "+ Aggiungi materiale" : "+ Aggiungi distributore"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    <View style={[s.card, { padding: 0 }]}>
                        <FlatList
                            keyboardShouldPersistTaps="handled"
                            data={pickerRows}
                            keyExtractor={(x: any) => x.id}
                            renderItem={({ item, index }) => {
                                if (!item) return null;

                                const label = item.name;
                                const isLast = index === pickerRows.length - 1;

                                return (
                                    <Pressable
                                        onPress={() => selectFromSmartPicker(item.id)}
                                        style={{
                                            paddingVertical: 12,
                                            paddingHorizontal: 12,
                                            borderBottomWidth: isLast ? 0 : 1,
                                            borderBottomColor: theme.colors.border,
                                            backgroundColor: theme.colors.surface,
                                        }}
                                    >
                                        <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
                                            {label}
                                        </Text>
                                        <Text style={{ color: theme.colors.muted, fontWeight: "900", marginTop: 2 }}>
                                            ID: {item.id}
                                        </Text>
                                    </Pressable>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={{ padding: 12 }}>
                                    <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>Nessun risultato</Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            </Modal>

            {/* MAIN PAGE */}
            <ScrollView
                contentContainerStyle={s.page}
                keyboardShouldPersistTaps="handled"
            >

            <Text style={s.title}>Nuovo Ordine</Text>

                <View style={s.card}>
                    <Text style={s.label}>Ragione sociale (cliente)</Text>

                    <TextInput
                        value={clientQuery}
                        onChangeText={(t) => {
                            setClientQuery(t);
                            setClientId("");

                            const open = t.trim().length >= MIN_CLIENT_CHARS;
                            setClientSearchOpen(open);
                        }}
                        onFocus={() => {
                            if (clientQuery.trim().length >= MIN_CLIENT_CHARS) setClientSearchOpen(true);
                            else setClientSearchOpen(false);
                        }}
                        placeholder={`Scrivi almeno ${MIN_CLIENT_CHARS} lettere...`}
                        placeholderTextColor={theme.colors.muted}
                        style={s.input}
                    />


                    <View style={s.row}>
                        <Pressable
                            onPress={() => router.push({ pathname: "/settings/editClienti" as any, params: { openAdd: "1" } } as any)}
                            style={s.btnMuted}
                        >
                            <Text style={s.btnMutedText}>+ Aggiungi cliente</Text>
                        </Pressable>

                        <Pressable onPress={clearClientSearch} style={s.btnMuted}>
                            <Text style={s.btnMutedText}>Pulisci</Text>
                        </Pressable>

                        <Pressable
                            onPress={() => {
                                if (clientQuery.trim().length >= MIN_CLIENT_CHARS) setClientSearchOpen(true);
                                else showAlert("Info", `Scrivi almeno ${MIN_CLIENT_CHARS} lettere per cercare.`);
                            }}
                            style={s.btnMuted}
                        >
                            <Text style={s.btnMutedText}>Cerca</Text>
                        </Pressable>
                    </View>

                    {clientSearchOpen ? (
                        <View style={[s.pickerBox, { marginTop: 12, maxHeight: 260 }]}>
                            <FlatList
                                keyboardShouldPersistTaps="handled"
                                data={filteredClients}
                                keyExtractor={(x) => x.id}
                                renderItem={({ item, index }) => (
                                    <Pressable
                                        onPress={() => selectClient(item.id)}
                                        style={{
                                            paddingVertical: 12,
                                            paddingHorizontal: 12,
                                            borderBottomWidth: index === filteredClients.length - 1 ? 0 : 1,
                                            borderBottomColor: theme.colors.border,
                                            backgroundColor: theme.colors.surface,
                                        }}
                                    >
                                        <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
                                            {item.ragioneSociale}
                                        </Text>
                                        <Text style={{ color: theme.colors.muted, fontWeight: "900", marginTop: 2 }}>
                                            Codice: {item.code || "-"}
                                        </Text>
                                    </Pressable>
                                )}
                                ListEmptyComponent={
                                    <View style={{ padding: 12 }}>
                                        <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                                            {clientQuery.trim().length < MIN_CLIENT_CHARS
                                                ? `Scrivi almeno ${MIN_CLIENT_CHARS} lettere`
                                                : "Nessun risultato"}
                                        </Text>
                                    </View>
                                }
                            />
                        </View>
                    ) : null}

                    <Text style={[s.label, { marginTop: 10 }]}>Codice cliente (auto)</Text>
                    <TextInput value={selectedClient?.code ?? ""} editable={false} style={[s.input, s.inputDisabled]} />
                </View>

                <View style={s.card}>
                    <Text style={s.label}>Articoli nell'ordine</Text>

                    {computed.lines.map((it, idx) => (
                        <View
                            key={it.id}
                            style={{
                                backgroundColor: theme.colors.surface2,
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                borderRadius: theme.radius.lg,
                                padding: 12,
                                gap: 10,
                                marginTop: 12,
                            }}
                        >
                            <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Articolo #{idx + 1}</Text>

                            <Text style={s.label}>Tipo di materiale</Text>
                            <Pressable onPress={() => openMaterialPicker(it.id)} style={[s.input, { justifyContent: "center" }]}>
                                <Text style={{ color: it.materialType ? theme.colors.text : theme.colors.muted, fontWeight: "900" }}>
                                    {it.materialType ? materials.find((m) => m.id === it.materialType)?.name || "Selezionato" : "Seleziona..."}
                                </Text>
                            </Pressable>

                            <Text style={s.label}>Note</Text>
                            <TextInput
                                value={it.note}
                                onChangeText={(t) => setItem(it.id, "note", t)}
                                placeholder="Note (opzionale)"
                                placeholderTextColor={theme.colors.muted}
                                style={[s.input, { minHeight: 70, textAlignVertical: "top" }]}
                                multiline
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
                            <Pressable onPress={() => openDistributorPicker(it.id)} style={[s.input, { justifyContent: "center" }]}>
                                <Text style={{ color: it.distributorId ? theme.colors.text : theme.colors.muted, fontWeight: "900" }}>
                                    {it.distributorId ? distributors.find((d) => d.id === it.distributorId)?.name || "Selezionato" : "Seleziona..."}
                                </Text>
                            </Pressable>

                            <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                                Totale articolo: <Text style={{ color: theme.colors.text }}>{money(it.totalPrice)}</Text>
                            </Text>

                            <View style={s.row}>
                                <Pressable onPress={() => removeLine(it.id)} style={s.btnMuted}>
                                    <Text style={s.btnMutedText}>Rimuovi articolo</Text>
                                </Pressable>
                            </View>
                        </View>
                    ))}

                    <Pressable onPress={addLine} style={[s.btnMuted, { marginTop: 12 }]}>
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
        </>
    );
}
