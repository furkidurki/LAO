import { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ScrollView } from "react-native";
import { Picker } from "@react-native-picker/picker";

import { useDistributors } from "@/lib/providers/DistributorsProvider";//import delle variabili dei import
import { useMaterials } from "@/lib/providers/MaterialsProvider";
import { addInventoryItem } from "@/lib/repos/inventory.repo";
import { getLatestInPrestitoOrder } from "@/lib/repos/orders.repo";

function money(n: number) {//per evitare numeri strani
    if (!isFinite(n)) return "0";
    return String(n);
}

export default function AggiungiMagazzino() {
    const { distributors } = useDistributors();//richiamo i contesti dei dati da inserire nel form per poi salvarli sul database
    const { materials } = useMaterials();
    const [lastClientCode, setLastClientCode] = useState("");
    const [lastClientRagioneSociale, setLastClientRagioneSociale] = useState("");

    const [description, setDescription] = useState("");//aggiornamento dei stati dei dati inseriti
    const [quantityStr, setQuantityStr] = useState("1");
    const [unitPriceStr, setUnitPriceStr] = useState("0");
    const [materialType, setMaterialType] = useState("");
    const [distributorId, setDistributorId] = useState("");

    const distributorName = useMemo(() => {
        return distributors.find((d) => d.id === distributorId)?.name ?? "";
    }, [distributorId, distributors]);

    const quantity = Math.max(0, parseInt(quantityStr || "0", 10) || 0);//calcoli epr contare la quantita dei oggetti
    const unitPrice = Math.max(0, parseFloat(unitPriceStr || "0") || 0);
    const totalPrice = quantity * unitPrice;

    async function loadLastPrestito() {
        try {
            const ord = await getLatestInPrestitoOrder();
            if (!ord) return Alert.alert("Info", "Non c'è nessun ordine in prestito");

            setLastClientCode(ord.code);
            setLastClientRagioneSociale(ord.ragioneSociale);

            // precompilo anche alcune cose (NON FUNZIONA ANCORA)
            setDescription(ord.description || "");
            setQuantityStr(String(ord.quantity ?? 1));
            setUnitPriceStr(String(ord.unitPrice ?? 0));

            // se esiste il distributore in lista, lo seleziono
            if (ord.distributorId) setDistributorId(ord.distributorId);

            Alert.alert("Ok", "Caricato ultimo in prestito");
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a caricare ultimo in prestito");
        }
    }

    async function onSave() {
        if (!lastClientCode.trim()) return Alert.alert("Errore", "Metti codice ultimo cliente");//verifico che i cambi siano aggiunti
        if (!lastClientRagioneSociale.trim()) return Alert.alert("Errore", "Metti ragione sociale");
        if (!distributorId) return Alert.alert("Errore", "Seleziona un distributore");

        try {
            await addInventoryItem({//salva i dati in firebase
                lastClientCode: lastClientCode.trim(),
                lastClientRagioneSociale: lastClientRagioneSociale.trim(),
                materialType,
                description: description.trim(),
                quantity,
                distributorId,
                distributorName,
                unitPrice,
                totalPrice,
            });

            Alert.alert("Ok", "Salvato in magazzino");
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a salvare in magazzino");
        }
    }

    return (
        <ScrollView style={{ flex: 1, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Aggiungi in Magazzino</Text>

            <Pressable
                onPress={loadLastPrestito}
                style={{ padding: 12, borderRadius: 8, backgroundColor: "black", alignSelf: "flex-start" }}
            >
                <Text style={{ color: "white", fontWeight: "700" }}>Carica ultimo in prestito</Text>
            </Pressable>

            <Text>Codice (ultimo cliente prestato)</Text>
            <TextInput
                value={lastClientCode}
                onChangeText={setLastClientCode}
                style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
            />

            <Text>Ragione sociale (ultimo cliente prestato)</Text>
            <TextInput
                value={lastClientRagioneSociale}
                onChangeText={setLastClientRagioneSociale}
                style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
            />

            <Text>tipo di materiale</Text>
            <Picker selectedValue={materialType} onValueChange={setMaterialType}>
                <Picker.Item label="Seleziona..." value="" />
                {distributors.map((d) => (
                    <Picker.Item key={d.id} label={d.name} value={d.id} />
                ))}
            </Picker>

            <Text>Descrizione</Text>
            <TextInput
                value={description}
                onChangeText={setDescription}
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

            <Pressable
                onPress={onSave}
                style={{ padding: 12, borderRadius: 8, backgroundColor: "black", alignSelf: "flex-start" }}
            >
                <Text style={{ color: "white", fontWeight: "700" }}>Salva</Text>
            </Pressable>
        </ScrollView>
    );
}
