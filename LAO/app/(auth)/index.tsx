import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, Platform } from "react-native";
import { useAuth } from "@/lib/providers/AuthProvider";
import { router } from "expo-router";

function showAlert(title: string, msg: string) {//messaggio di allerta
    if (Platform.OS === "web") {
        // su web Alert.alert a volte non si vede
        window.alert(`${title}\n\n${msg}`);
    } else {
        Alert.alert(title, msg);
    }
}

export default function AuthIndex() {//richiamo le funzioni da authprovider
    const { login, register, resetPassword } = useAuth();

    const [mode, setMode] = useState<"login" | "register">("login");//lo stato dei bottoni
    const [email, setEmail] = useState("");//lo stato di qunaod scrive
    const [password, setPassword] = useState("");//lo stato di qunaod scrive

    const [busy, setBusy] = useState(false);//il server di firebase
    const [errorText, setErrorText] = useState("");

    const onSubmit = async () => {
        console.log("CLICK", mode, email);

        const e = email.trim();//elimino i spazi dalla email
        const p = password;

        if (!e) {//verifico se lemail e stata messa
            setErrorText("Metti email");
            return showAlert("Errore", "Metti email");
        }
        if (!p) {//verifico se passowrd e stata messa
            setErrorText("Metti password");
            return showAlert("Errore", "Metti password");
        }

        setBusy(true);
        setErrorText("");

        try {
            if (mode === "login") await login(e, p);
            else await register(e, p);

            console.log("AUTH OK");
            //messaggi di errori
            router.replace("/");
        } catch (err: any) {
            console.log("AUTH ERROR", err);
            const msg =
                err?.code ? `${err.code} - ${err.message ?? ""}` : (err?.message ?? "Auth fallita");
            setErrorText(msg);
            showAlert("Errore", msg);
        } finally {
            setBusy(false);
        }
    };

    const onForgot = async () => {
        const e = email.trim();
        if (!e) {
            setErrorText("Scrivi prima l'email");
            return showAlert("Errore", "Scrivi prima l'email");
        }

        setBusy(true);
        setErrorText("");
        try {
            await resetPassword(e);
            showAlert("Ok", "Email di reset inviata");
        } catch (err: any) {
            console.log("RESET ERROR", err);
            const msg = err?.message ?? "Reset fallito";
            setErrorText(msg);
            showAlert("Errore", msg);
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={{ flex: 1, padding: 16, gap: 10, justifyContent: "center" }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>
                {mode === "login" ? "Login" : "Registrati"}
            </Text>

            {!!errorText && <Text style={{ color: "red" }}>{errorText}</Text>}

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

            <Pressable
                onPress={busy ? undefined : onSubmit}
                style={{ padding: 12, borderRadius: 8, backgroundColor: "black", opacity: busy ? 0.6 : 1 }}
            >
                <Text style={{ color: "white", fontWeight: "700" }}>
                    {busy ? "Attendi..." : mode === "login" ? "Entra" : "Crea account"}
                </Text>
            </Pressable>

            <Pressable onPress={busy ? undefined : () => setMode(m => (m === "login" ? "register" : "login"))}>
                <Text style={{ textDecorationLine: "underline" }}>
                    {mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Login"}
                </Text>
            </Pressable>


        </View>
    );
}
