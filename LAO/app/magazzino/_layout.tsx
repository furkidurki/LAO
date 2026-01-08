import { Stack, router } from "expo-router";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/ui/theme";

export default function OrdiniLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerTitle: "",
                headerShadowVisible: false,
                headerStyle: { backgroundColor: theme.colors.bg },
                headerLeft: () => (
                    <Pressable
                        onPress={() => router.back()}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 999,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: theme.colors.surface2,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Indietro"
                    >
                        <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
                    </Pressable>
                ),
            }}
        />
    );
}
