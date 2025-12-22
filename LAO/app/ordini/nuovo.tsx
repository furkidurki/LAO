import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, Linking, FlatList } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";

import { useDistributors } from "@/lib/providers/DistributorsProvider";
import { MATERIAL_TYPES } from "@/lib/constants/materials";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/models/order";
import { addOrder } from "@/lib/repos/orders.repo";
import { searchClientsByRagione } from "@/lib/repos/clients.repo";

function money(n: number) {
    if (!isFinite(n)) return "0";
    return String(n);
}

function buildMailto(to: string, subject: string, body: string) {
    const s = encodeURIComponent(subject);
    const b = encodeURIComponent(body);
    return `mailto:${to}?subject=${s}&body=${b}`;
}

export default function NuovoOrdine() {
    const { distributors } = useDistributors();

    const [code, setCode] = useState("");
    const [ragioneInput, setRagioneInput] = useState("");
    const [ragioneSociale, setRagioneSociale] = useState("");

    const [clientResults, setClientResults] = useState<
        { id: string; code: string; ragioneSociale: string; email?: string }[]
    >([]);

    const [materialType, setMaterialType] = useState(MATERIAL_TYPES[0]);
    const [description, setDescription] = useState("");

    const [quantityStr, setQuantityStr] = useState("1");
    const [unitPriceStr, setUnitPriceStr] = useState("0");

    const [distributorId, setDistributorId] = useState("");
    const distributorName = useMemo(() => {
        return distributors.find((d) => d.id === distributorId)?.name ?? "";
    }, [distributorId, distributors]);

    const [status, setStatus] = useState<OrderStatus>("in_consegna");

    const [emailTo, setEmailTo] = useState("");

    const quantity = Math.max(0, parseInt(quantityStr || "0", 10) || 0);
    const unitPrice = Math.max(0, parseFloat(unitPriceStr || "0") || 0);
    const totalPrice = quantity * unitPrice;

    // ricerca ragione sociale dopo 3 lettere
    useEffect(() => {
        let alive = true;

        (async () => {
            if (ragioneInput.trim().length < 3) {
                setClientResults([]);
                return;
            }
            try {
                const res = await searchClientsByRagione(ragioneInput);
                if (!alive) return;
                setClientResults(res);
            } catch (e) {
                // se non hai clients o manca index, ti avvisa in console
                console.log("searchClientsByRagione error:", e);
                if (!alive) return;
                setClientResults([]);
            }
        })();

        return () => {
            alive = false;
        };
    }, [ragioneInput]);

    function pickClient(c: { code: string; ragioneSociale: string; email?: string }) {
        setCode(c.code);
        setRagioneSociale(c.ragioneSociale);
        setRagioneInput(c.ragioneSociale);
        if (c.email) setEmailTo(c.email);
        setClientResults([]);
    }

    function makeEmailBody() {
        return [
            `Codice cliente: ${code}`,
            `Ragione sociale: ${ragioneSociale}`,
            `Tipo materiale: ${materialType}`,
            `Descrizione: ${description}`,
            `Quantità: ${quantity}`,
            `Distributore: ${distributorName}`,
            `Prezzo singolo: ${unitPrice}`,
            `Prezzo totale: ${totalPrice}`,
            `Stato: ${status}`,
        ].join("\n");
    }

    async function onSave(alsoEmail: boolean) {
        if (!code.trim()) return Alert.alert("Errore", "Metti il codice cliente");
        if (!ragioneSociale.trim()) return Alert.alert("Errore", "Metti la ragione sociale");
        if (!distributorId) return Alert.alert("Errore", "Seleziona un distributore");

        const payload = {
            code: code.trim(),
            ragioneSociale: ragioneSociale.trim(),
            materialType,
            description: description.trim(),
            quantity,
            distributorId,
            distributorName,
            unitPrice,
            totalPrice,
            status,
            emailTo: emailTo.trim() || undefined,
        };

        try {
            await addOrder(payload);

            Alert.alert("Ok", "Ordine salvato");

            if (alsoEmail) {
                await onEmail();
            } else {
                router.back();
            }
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare l'ordine");
        }
    }

    async function onEmail() {
        if (!emailTo.trim()) {
            Alert.alert("Errore", "Metti una email destinatario");
            return;
        }

        const subject = `Ordine cliente ${code || ""}`;
        const body = makeEmailBody();
        const url = buildMailto(emailTo.trim(), subject, body);

        try {
            const ok = await Linking.canOpenURL(url);
            if (!ok) return Alert.alert("Errore", "Non posso aprire l'app email");
            await Linking.openURL(url);
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Invio email fallito");
        }
    }

    return (
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Nuovo Ordine</Text>

            <Text>Codice cliente</Text>
            <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Es. 12345"
                style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
            />

            <Text>Ragione sociale (scrivi 3 lettere)</Text>
            <TextInput
                value={ragioneInput}
                onChangeText={(t) => {
                    setRagioneInput(t);
                    setRagioneSociale(t); // se non scegli suggerimento, salva quello scritto
                }}
                placeholder="Es. azi..."
                style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
            />

            {clientResults.length > 0 && (
                <View style={{ borderWidth: 1, borderRadius: 8, overflow: "hidden" }}>
                    <FlatList
                        data={clientResults}
                        keyExtractor={(x) => x.id}
                        renderItem={({ item }) => (
                            <Pressable
                                onPress={() => pickClient(item)}
                                style={{ padding: 10, borderBottomWidth: 1 }}
                            >
                                <Text style={{ fontWeight: "700" }}>{item.ragioneSociale}</Text>
                                <Text>Codice: {item.code}</Text>
                            </Pressable>
                        )}
                    />
                </View>
            )}

            <Text>Tipo materiale</Text>
            <Picker selectedValue={materialType} onValueChange={setMaterialType}>
                {MATERIAL_TYPES.map((t) => (
                    <Picker.Item key={t} label={t} value={t} />
                ))}
            </Picker>

            <Text>Descrizione</Text>
            <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Testo..."
                multiline
                style={{ borderWidth: 1, padding: 10, borderRadius: 8, minHeight: 70 }}
            />

            <Text>Quantità</Text>
            <TextInput
                value={quantityStr}
                onChangeText={setQuantityStr}
                keyboardType="number-pad"
                style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
            />

            <Text>Distributore</Text>
            <Picker selectedValue={distributorId} onValueChange={setDistributorId}>
                <Picker.Item label="Seleziona..." value="" />
                {distributors.map((d) => (
                    <Picker.Item key={d.id} label={d.name} value={d.id} />
                ))}
            </Picker>

            <Text>Prezzo singolo</Text>
            <TextInput
                value={unitPriceStr}
                onChangeText={setUnitPriceStr}
                keyboardType="decimal-pad"
                style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
            />

            <Text>Prezzo totale (auto)</Text>
            <TextInput
                value={money(totalPrice)}
                editable={false}
                style={{ borderWidth: 1, padding: 10, borderRadius: 8, opacity: 0.7 }}
            />

            <Text>Stato ordine</Text>
            <Picker selectedValue={status} onValueChange={(v) => setStatus(v)}>
                {ORDER_STATUSES.map((s) => (
                    <Picker.Item key={s} label={s} value={s} />
                ))}
            </Picker>

            <Text>Email destinatario</Text>
            <TextInput
                value={emailTo}
                onChangeText={setEmailTo}
                placeholder="esempio@mail.com"
                autoCapitalize="none"
                style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
            />

            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Pressable
                    onPress={() => onSave(false)}
                    style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}
                >
                    <Text style={{ color: "white", fontWeight: "700" }}>Salva</Text>
                </Pressable>

                <Pressable
                    onPress={onEmail}
                    style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}
                >
                    <Text style={{ color: "white", fontWeight: "700" }}>Invio (mail)</Text>
                </Pressable>

                <Pressable
                    onPress={() => onSave(true)}
                    style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}
                >
                    <Text style={{ color: "white", fontWeight: "700" }}>Salva + Email</Text>
                </Pressable>
            </View>
        </View>
    );
}
