import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { useAuth } from "@/lib/providers/AuthProvider";
import { router } from "expo-router";

export default function AuthScreen() {
    const { login, register, resetPassword } = useAuth();

    const [mode, setMode] = useState<"login" | "register">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const onSubmit = async () => {
        if (!email.trim()) return Alert.alert("Errore", "Metti email");
        if (!password.trim()) return Alert.alert("Errore", "Metti password");

        try {
            if (mode === "login") await login(email, password);
            else await register(email, password);

            // se hai una home in (tabs)
            router.replace("/(tabs)");
        } catch (e: any) {
            console.log(e);
            Alert.alert("Errore", e?.message ?? "Auth fallita");
        }
    };

    const onForgot = async () => {
        if (!email.trim()) return Alert.alert("Errore", "Scrivi prima l'email");
        try {
            await resetPassword(email);
            Alert.alert("Ok", "Email di reset inviata");
        } catch (e: any) {
            console.log(e);
            Alert.alert("Errore", e?.message ?? "Reset fallito");
        }
    };

    return (
        <View style={{ flex: 1, padding: 16, gap: 10, justifyContent: "center" }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>
                {mode === "login" ? "Login" : "Registrati"}
            </Text>

            <Text>Email</Text>
            <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="email@mail.com"
                style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
            />

            <Text>Password</Text>
            <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="password"
                style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
            />

            <Pressable onPress={onSubmit} style={{ padding: 12, borderRadius: 8, backgroundColor: "black" }}>
                <Text style={{ color: "white", fontWeight: "700" }}>
                    {mode === "login" ? "Entra" : "Crea account"}
                </Text>
            </Pressable>

            <Pressable onPress={() => setMode((m) => (m === "login" ? "register" : "login"))}>
                <Text style={{ textDecorationLine: "underline" }}>
                    {mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Login"}
                </Text>
            </Pressable>

            <Pressable onPress={onForgot}>
                <Text style={{ textDecorationLine: "underline" }}>Password dimenticata?</Text>
            </Pressable>
        </View>
    );
}
