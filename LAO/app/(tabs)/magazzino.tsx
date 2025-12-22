import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

export default function MagazzinoScreen() {
    return (
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 24, fontWeight: "bold" }}>Magazzino</Text>

            <Pressable
                onPress={() => router.push("/ordini/nuovo")}
                style={{ padding: 12, borderRadius: 8, backgroundColor: "black", alignSelf: "flex-start" }}
            >
                <Text style={{ color: "white", fontWeight: "700" }}>Nuovo Ordine</Text>
            </Pressable>

            <Pressable
                onPress={() => router.push("/magazzino/aggiungi")}
                style={{ padding: 12, borderRadius: 8, backgroundColor: "black", alignSelf: "flex-start" }}
            >
                <Text style={{ color: "white", fontWeight: "700" }}>Aggiungi in Magazzino</Text>
            </Pressable>
        </View>
    );
}
