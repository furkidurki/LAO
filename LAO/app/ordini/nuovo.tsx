import { useMemo, useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    Alert,
    Linking,
    Platform,
    ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";

import { useDistributors } from "@/lib/providers/DistributorsProvider";
import { useMaterials } from "@/lib/providers/MaterialsProvider";
import { useClients } from "@/lib/providers/ClientsProvider";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/models/order";
import { addOrder } from "@/lib/repos/orders.repo";

function money(n: number) {
    if (!isFinite(n)) return "0";
    return String(Math.round(n * 100) / 100);
}

function buildMailto(to: string, subject: string, body: string) {
    const s = encodeURIComponent(subject);
    const b = encodeURIComponent(body);
    return `mailto:${to}?subject=${s}&body=${b}`;
}

function showAlert(title: string, msg: string) {
    if (Platform.OS === "web") window.alert(`${title}\n\n${msg}`);
    else Alert.alert(title, msg);
}

function formatDate(ms: number) {
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

// accetta "YYYY-MM-DD"
function parseYYYYMMDD(s: string): number | null {
    const t = s.trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    if (!match) return null;

    const y = Number(match[1]);
    const mo = Number(match[2]);
    const da = Number(match[3]);

    if (!y || mo < 1 || mo > 12 || da < 1 || da > 31) return null;

    return new Date(y, mo - 1, da, 0, 0, 0, 0).getTime();
}

// ✅ aggiunge mesi in modo corretto (non in giorni)
function addMonthsMs(baseMs: number, months: number) {
    const d = new Date(baseMs);
    d.setMonth(d.getMonth() + months);
    return d.getTime();
}

export default function NuovoOrdine() {
    const { distributors } = useDistributors();
    const { materials } = useMaterials();
    const { clients } = useClients();

    const [clientId, setClientId] = useState("");
    const selectedClient = useMemo(
        () => clients.find((c) => c.id === clientId) ?? null,
        [clientId, clients]
    );

    const [materialType, setMaterialType] = useState("");
    const materialName = useMemo(
        () => materials.find((m) => m.id === materialType)?.name ?? "",
        [materialType, materials]
    );

    const [description, setDescription] = useState("");
    const [quantityStr, setQuantityStr] = useState("1");
    const [unitPriceStr, setUnitPriceStr] = useState("0");

    const [distributorId, setDistributorId] = useState("");
    const distributorName = useMemo(
        () => distributors.find((d) => d.id === distributorId)?.name ?? "",
        [distributorId, distributors]
    );

    const [status, setStatus] = useState<OrderStatus>("in_consegna");

    // ✅ nuovi input
    const [orderDateStr, setOrderDateStr] = useState(formatDate(Date.now()));
    const [loanMonthsStr, setLoanMonthsStr] = useState("1"); // default 1 mese

    // email beta: opzionale, NON si salva
    const [emailTo, setEmailTo] = useState("");

    const quantity = Math.max(0, parseInt(quantityStr || "0", 10) || 0);
    const unitPrice = Math.max(0, parseFloat(unitPriceStr || "0") || 0);
    const totalPrice = quantity * unitPrice;

    const parsedOrderDate = parseYYYYMMDD(orderDateStr);
    const orderDateMs = parsedOrderDate ?? Date.now();

    const loanMonthsPlanned = Math.max(0, parseInt(loanMonthsStr || "0", 10) || 0);

    const loanDueMs =
        status === "in_prestito" ? addMonthsMs(orderDateMs, loanMonthsPlanned) : undefined;

    function makeEmailBody() {
        const code = selectedClient?.code ?? "";
        const ragione = selectedClient?.ragioneSociale ?? "";

        return [
            `Data ordine: ${formatDate(orderDateMs)}`,
            `Codice cliente: ${code}`,
            `Ragione sociale: ${ragione}`,
            `Tipo materiale: ${materialName || materialType}`,
            `Descrizione: ${description}`,
            `Quantità: ${quantity}`,
            `Distributore: ${distributorName}`,
            `Prezzo singolo: ${unitPrice}`,
            `Prezzo totale: ${totalPrice}`,
            `Stato: ${status}`,
            status === "in_prestito"
                ? `Prestito: ${loanMonthsPlanned} mesi (scade ${loanDueMs ? formatDate(loanDueMs) : ""})`
                : "",
        ]
            .filter(Boolean)
            .join("\n");
    }

    async function onSave(alsoEmail: boolean) {
        if (!selectedClient) return showAlert("Errore", "Seleziona una ragione sociale (cliente)");
        if (!materialType) return showAlert("Errore", "Seleziona un tipo materiale");
        if (!distributorId) return showAlert("Errore", "Seleziona un distributore");

        if (!parseYYYYMMDD(orderDateStr))
            return showAlert("Errore", "Data ordine non valida (usa YYYY-MM-DD)");

        if (status === "in_prestito" && loanMonthsPlanned <= 0) {
            return showAlert("Errore", "Inserisci il periodo prestito (mesi)");
        }

        const payload: any = {
            clientId: selectedClient.id,
            code: selectedClient.code,
            ragioneSociale: selectedClient.ragioneSociale,

            materialType,
            materialName,

            description: description.trim(),
            quantity,

            distributorId,
            distributorName,

            unitPrice,
            totalPrice,

            status,

            orderDateMs,
        };

        if (status === "in_prestito") {
            payload.loanMonthsPlanned = loanMonthsPlanned;
            payload.loanDueMs = loanDueMs;
            payload.loanStartMs = Date.now();
        }

        try {
            await addOrder(payload);

            showAlert("Ok", "Ordine salvato");

            if (alsoEmail) await onEmail();

            router.replace("/" as any);
        } catch (e) {
            console.log(e);
            showAlert("Errore", "Non riesco a salvare l'ordine");
        }
    }

    async function onEmail() {
        if (!emailTo.trim()) {
            showAlert("Info", "Email vuota: serve solo se vuoi aprire Gmail (beta).");
            return;
        }

        const subject = `Ordine cliente ${selectedClient?.code ?? ""}`;
        const body = makeEmailBody();
        const url = buildMailto(emailTo.trim(), subject, body);

        try {
            const ok = await Linking.canOpenURL(url);
            if (!ok) return showAlert("Errore", "Non posso aprire l'app email");
            await Linking.openURL(url);
        } catch (e) {
            console.log(e);
            showAlert("Errore", "Invio email fallito");
        }
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Nuovo Ordine</Text>

            <Text>Data ordine (YYYY-MM-DD)</Text>
            <TextInput
                value={orderDateStr}
                onChangeText={setOrderDateStr}
                placeholder="2025-12-22"
                autoCapitalize="none"
                style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
            />

            <Text>Ragione sociale (cliente)</Text>
            <Picker selectedValue={clientId} onValueChange={(v) => setClientId(String(v))}>
                <Picker.Item label="Seleziona..." value="" />
                {clients.map((c) => (
                    <Picker.Item key={c.id} label={c.ragioneSociale} value={c.id} />
                ))}
            </Picker>

            <Text>Codice cliente (auto)</Text>
            <TextInput
                value={selectedClient?.code ?? ""}
                editable={false}
                style={{ borderWidth: 1, padding: 10, borderRadius: 8, opacity: 0.7 }}
            />

            <Text>Tipo di materiale</Text>
            <Picker selectedValue={materialType} onValueChange={(v) => setMaterialType(String(v))}>
                <Picker.Item label="Seleziona..." value="" />
                {materials.map((m) => (
                    <Picker.Item key={m.id} label={m.name} value={m.id} />
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
            <Picker selectedValue={distributorId} onValueChange={(v) => setDistributorId(String(v))}>
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
            <Picker selectedValue={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
                {ORDER_STATUSES.map((s) => (
                    <Picker.Item key={s} label={s} value={s} />
                ))}
            </Picker>

            {status === "in_prestito" && (
                <>
                    <Text>Periodo prestito (mesi)</Text>
                    <TextInput
                        value={loanMonthsStr}
                        onChangeText={setLoanMonthsStr}
                        keyboardType="number-pad"
                        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
                    />
                    <Text>Scadenza: {loanDueMs ? formatDate(loanDueMs) : "-"}</Text>
                </>
            )}

            <Text>Email destinatario (beta, opzionale)</Text>
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
        </ScrollView>
    );
}
