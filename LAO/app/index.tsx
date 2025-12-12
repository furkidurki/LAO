import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";

export default function App() {
    const [codiceCliente, setCodiceCliente] = useState("");

    const salvaCodice = () => {
        console.log("Codice cliente:", codiceCliente);
        // qui poi lo userai per salvarlo su Firebase / inviarlo / ecc.
    };

    return (
        <View >
            <Text >Codice cliente</Text>

            <TextInput

                placeholder="Es. 12345"
                value={codiceCliente}
                onChangeText={setCodiceCliente}
                keyboardType="number-pad" // se vuoi solo numeri
                maxLength={10} // massimo 10 caratteri (cambia se vuoi)
            />

            <Pressable onPress={salvaCodice}>
                <Text >Salva</Text>
            </Pressable>

            <Text >Valore attuale: {codiceCliente}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", padding: 16, gap: 10 },
    label: { fontSize: 16 },
    input: { borderWidth: 1, borderRadius: 8, padding: 12 },
    button: { backgroundColor: "black", padding: 12, borderRadius: 8, alignItems: "center" },
    buttonText: { color: "white", fontWeight: "700" },
    preview: { marginTop: 10 },
});
