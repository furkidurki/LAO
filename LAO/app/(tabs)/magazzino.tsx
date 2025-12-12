import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";

export default function MagazzinoScreen() {
    return (
        <View style={{ flex: 1, padding: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
                Magazzino
            </Text>

            <Pressable
                onPress={() => router.push("/magazzino/aggiungi")}
                style={{
                    padding: 12,
                    borderRadius: 8,
                    alignSelf: "flex-start",
                    backgroundColor: "#2563eb",
                }}
            >
                <Text style={{ color: "white", fontWeight: "600" }}>Aggiungi</Text>
            </Pressable>
        </View>
    );
}
