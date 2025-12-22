import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

export default function Home() {
    return (
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 24, fontWeight: "700" }}>Home</Text>

            <Pressable
                onPress={() => router.push("/ordini/nuovo")}
                style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}
            >
                <Text style={{ color: "white", fontWeight: "700" }}>Nuovo Ordine</Text>
            </Pressable>

            <Pressable
                onPress={() => router.push("/magazzino/aggiungi")}
                style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}
            >
                <Text style={{ color: "white", fontWeight: "700" }}>Aggiungi Magazzino</Text>
            </Pressable>

            <Pressable
                onPress={() => router.push("/settings/editDistributori")}
                style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}
            >
                <Text style={{ color: "white", fontWeight: "700" }}>Gestisci Distributori</Text>
            </Pressable>
        </View>
    );
}
