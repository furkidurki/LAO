import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/providers/AuthProvider";

export default function Settings() {
    const auth = useAuth();

    const user = (auth as any).user;
    const loading = (auth as any).loading;

    // ✅ prende la prima funzione che esiste tra questi nomi
    const doSignOut =
        (auth as any).signOutUser ||
        (auth as any).signOut ||
        (auth as any).logout ||
        null;

    if (loading) {
        return (
            <View style={{ flex: 1, padding: 16, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator />
                <Text style={{ marginTop: 10 }}>Loading...</Text>
            </View>
        );
    }

    const isLogged = !!user;

    return (
        <View style={{ flex: 1, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 24, fontWeight: "700" }}>Settings</Text>

            {isLogged ? (
                <>
                    <Text>Loggato come: {user?.email ?? "utente"}</Text>

                    <Pressable
                        onPress={async () => {
                            if (!doSignOut) {
                                Alert.alert("Errore", "Nel tuo AuthProvider manca la funzione di logout");
                                return;
                            }
                            await doSignOut();
                        }}
                        style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}
                    >
                        <Text style={{ color: "white", fontWeight: "700" }}>Logout</Text>
                    </Pressable>
                </>
            ) : (
                <Pressable
                    onPress={() => router.push("/(auth)/index" as any)}
                    style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}
                >
                    <Text style={{ color: "white", fontWeight: "700" }}>Login</Text>
                </Pressable>
            )}
        </View>
    );
}
