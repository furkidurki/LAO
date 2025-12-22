import { View, Text, TextInput } from "react-native";
import { useState } from "react";
import { Picker } from "@react-native-picker/picker";
import { useDistributors} from "@/lib/providers/DistributorsProvider";


export default function AggiungiMagazzino() {
    const { distributors } = useDistributors();
    const [nome, setNome] = useState("");
    const [quantita, setQuantita] = useState("");
    const [distributorId, setDistributorId] = useState("");

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <Text>Nome materiale</Text>
            <TextInput value={nome} onChangeText={setNome} />

            <Text>Quantità</Text>
            <TextInput value={quantita} onChangeText={setQuantita} />

            <Text>Distributore</Text>
            <Picker
                selectedValue={distributorId}
                onValueChange={setDistributorId}
            >
                <Picker.Item label="Seleziona..." value="" />
                {distributors.map((d) => (
                    <Picker.Item key={d.id} label={d.name} value={d.id} />
                ))}
            </Picker>
            <Text>prezzo singolo</Text>
            <Text>prezzo prezzo totale</Text>
        </View>
    );
}
