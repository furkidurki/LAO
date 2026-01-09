import { View, Text } from "react-native";
import { router } from "expo-router";

import { useAuth } from "@/lib/providers/AuthProvider";

import { Screen } from "@/lib/ui/kit/Screen";
import { Card } from "@/lib/ui/kit/Card";
import { Chip } from "@/lib/ui/kit/Chip";
import { MotionPressable } from "@/lib/ui/kit/MotionPressable";
import { theme } from "@/lib/ui/theme";

function RowButton(props: { title: string; subtitle?: string; onPress: () => void }) {
    return (
        <MotionPressable
            onPress={props.onPress}
            haptic="light"
            style={{
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
                paddingVertical: 12,
                paddingHorizontal: 12,
            }}
        >
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16, flex: 1 }} numberOfLines={1}>
                    {props.title}
                </Text>
                <Text style={{ color: theme.colors.muted, fontWeight: "900", fontSize: 18 }}>›</Text>
            </View>

            {props.subtitle ? (
                <Text style={{ color: theme.colors.muted, fontWeight: "900", marginTop: 6 }}>{props.subtitle}</Text>
            ) : null}
        </MotionPressable>
    );
}

export default function SettingsTab() {
    const { user, logout } = useAuth();

    return (
        <Screen>
            <View style={{ gap: 10 }}>
                <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.2 }}>
                    Settings
                </Text>
                <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                    {user?.email ? `Account: ${user.email}` : "Account"}
                </Text>
            </View>

            <Card>
                <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>Gestione</Text>

                <View style={{ gap: 10, marginTop: 12 }}>
                    <RowButton title="Clienti" subtitle="Aggiungi / modifica clienti" onPress={() => router.push("/settings/editClienti" as any)} />
                    <RowButton title="Distributori" subtitle="Aggiungi / modifica distributori" onPress={() => router.push("/settings/editDistributori" as any)} />
                    <RowButton title="Materiali" subtitle="Aggiungi / modifica materiali" onPress={() => router.push("/settings/editMaterials" as any)} />
                </View>
            </Card>

            <Card>
                <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>Account</Text>

                <View style={{ marginTop: 12 }}>
                    <Chip
                        label="Logout"
                        tone="primary"
                        onPress={async () => {
                            await logout();
                            router.replace("/(auth)" as any);
                        }}
                    />
                </View>
            </Card>
        </Screen>
    );
}
