import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { useAuth } from "@/lib/providers/AuthProvider";
import { theme } from "@/lib/ui/theme";
import { Button, Card, Screen } from "@/lib/ui/kit";

function showAlert(title: string, msg: string) {
    if (Platform.OS === "web") window.alert(`${title}\n\n${msg}`);
    else Alert.alert(title, msg);
}

type Mode = "login" | "register";

export default function AuthIndex() {
    const { login, register, resetPassword } = useAuth();

    const [mode, setMode] = useState<Mode>("login");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [errorText, setErrorText] = useState("");

    const ui = useMemo(() => {
        const inputBase = {
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface2,
            borderRadius: theme.radius.md,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: theme.colors.text,
            fontWeight: "900" as const,
        };

        const label = {
            color: theme.colors.muted,
            fontWeight: "900" as const,
            fontSize: 12,
        };

        const title = {
            color: theme.colors.text,
            fontSize: 26,
            fontWeight: "900" as const,
            letterSpacing: -0.2,
        };

        const subtitle = {
            color: theme.colors.muted,
            fontWeight: "800" as const,
        };

        return { inputBase, label, title, subtitle };
    }, []);

    const onSubmit = async () => {
        const e = email.trim();
        const p = password;
        const fn = firstName.trim();
        const ln = lastName.trim();

        if (mode === "register") {
            if (!fn) {
                setErrorText("Metti nome");
                return showAlert("Errore", "Metti nome");
            }
            if (!ln) {
                setErrorText("Metti cognome");
                return showAlert("Errore", "Metti cognome");
            }
        }

        if (!e) {
            setErrorText("Metti email");
            return showAlert("Errore", "Metti email");
        }
        if (!p) {
            setErrorText("Metti password");
            return showAlert("Errore", "Metti password");
        }

        setBusy(true);
        setErrorText("");

        try {
            if (mode === "login") {
                await login(e, p);
            } else {
                await register(e, p, { firstName: fn, lastName: ln });
            }
            router.replace("/");
        } catch (err: any) {
            console.log("AUTH ERROR", err);
            const msg = err?.code ? `${err.code} - ${err.message ?? ""}` : (err?.message ?? "Auth fallita");
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

    const isRegister = mode === "register";

    return (
        <Screen
            scroll={false}
            contentStyle={{
                flex: 1,
                justifyContent: "center",
                paddingTop: theme.spacing.lg,
                paddingBottom: theme.spacing.lg,
            }}
        >
            <View style={{ gap: 10 }}>
                <Text style={ui.title}>LAO</Text>
                <Text style={ui.subtitle}>
                    {isRegister ? "Crea il tuo account" : "Accedi al tuo account"}
                </Text>
            </View>

            <Card style={{ gap: 14 }}>
                {/* Toggle mode */}
                <View
                    style={{
                        flexDirection: "row",
                        gap: 10,
                        backgroundColor: theme.colors.surface2,
                        borderRadius: theme.radius.pill,
                        padding: 6,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                    }}
                >
                    <ModeChip label="Login" active={!isRegister} onPress={() => setMode("login")} disabled={busy} />
                    <ModeChip label="Registrati" active={isRegister} onPress={() => setMode("register")} disabled={busy} />
                </View>

                {!!errorText && (
                    <Text style={{ color: theme.colors.danger, fontWeight: "900" }}>{errorText}</Text>
                )}

                {isRegister ? (
                    <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ flex: 1, gap: 6 }}>
                            <Text style={ui.label}>Nome</Text>
                            <TextInput
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="Mario"
                                placeholderTextColor="rgba(11,16,32,0.35)"
                                style={ui.inputBase}
                            />
                        </View>
                        <View style={{ flex: 1, gap: 6 }}>
                            <Text style={ui.label}>Cognome</Text>
                            <TextInput
                                value={lastName}
                                onChangeText={setLastName}
                                placeholder="Rossi"
                                placeholderTextColor="rgba(11,16,32,0.35)"
                                style={ui.inputBase}
                            />
                        </View>
                    </View>
                ) : null}

                <View style={{ gap: 6 }}>
                    <Text style={ui.label}>Email</Text>
                    <TextInput
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholder="email@mail.com"
                        placeholderTextColor="rgba(11,16,32,0.35)"
                        style={ui.inputBase}
                    />
                </View>

                <View style={{ gap: 6 }}>
                    <Text style={ui.label}>Password</Text>
                    <TextInput
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholder="password"
                        placeholderTextColor="rgba(11,16,32,0.35)"
                        style={ui.inputBase}
                    />
                </View>

                <Button
                    title={busy ? "Attendi..." : isRegister ? "Crea account" : "Entra"}
                    onPress={onSubmit}
                    disabled={busy}
                />

                {!isRegister ? (
                    <Pressable onPress={busy ? undefined : onForgot}>
                        <Text style={{ color: theme.colors.primary2, fontWeight: "900" }}>
                            Password dimenticata?
                        </Text>
                    </Pressable>
                ) : null}

                <Text style={{ color: theme.colors.muted, fontWeight: "800", fontSize: 12 }}>
                    {isRegister ? "Nome e cognome vengono salvati in database per usarli dopo." : ""}
                </Text>
            </Card>
        </Screen>
    );
}

function ModeChip(props: {
    label: string;
    active?: boolean;
    onPress: () => void;
    disabled?: boolean;
}) {
    return (
        <Pressable
            onPress={props.disabled ? undefined : props.onPress}
            style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 10,
                borderRadius: theme.radius.pill,
                backgroundColor: props.active ? theme.colors.primary : "transparent",
            }}
        >
            <Text
                style={{
                    fontWeight: "900",
                    color: props.active ? theme.colors.white : theme.colors.text,
                }}
            >
                {props.label}
            </Text>
        </Pressable>
    );
}
