import { ScrollView, View, Text, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { getAuth, signOut } from "firebase/auth";

function RowButton(props: { title: string; subtitle?: string; onPress: () => void }) {
    return (
        <Pressable
            onPress={props.onPress}
            style={{
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                gap: 6,
            }}
        >
            <Text style={{ fontWeight: "800", fontSize: 16 }}>{props.title}</Text>
            {props.subtitle ? <Text style={{ opacity: 0.7 }}>{props.subtitle}</Text> : null}
        </Pressable>
    );
}

export default function SettingsTab() {
    async function onLogout() {
        try {
            await signOut(getAuth());
            // se hai una schermata auth, qui basta tornare indietro / root
            router.replace("/" as any);
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a fare logout.");
        }
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Settings</Text>

            <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: "800" }}>Gestione</Text>

                <RowButton
                    title="Clienti"
                    subtitle="Aggiungi / modifica clienti"
                    onPress={() => router.push("/settings/editClienti" as any)}
                />

                <RowButton
                    title="Distributori"
                    subtitle="Aggiungi / modifica distributori"
                    onPress={() => router.push("/settings/editDistributori" as any)}
                />

                <RowButton
                    title="Materiali"
                    subtitle="Aggiungi / modifica materiali"
                    onPress={() => router.push("/settings/editMaterials" as any)}
                />
            </View>

            <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: "800" }}>Account</Text>

                <Pressable
                    onPress={onLogout}
                    style={{
                        borderWidth: 1,
                        borderRadius: 12,
                        padding: 12,
                        backgroundColor: "black",
                    }}
                >
                    <Text style={{ color: "white", fontWeight: "800" }}>Logout</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}
