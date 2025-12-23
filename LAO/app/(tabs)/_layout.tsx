import { Tabs } from "expo-router";
import { useAuth } from "@/lib/providers/AuthProvider";
import { Redirect } from "expo-router";
import { theme } from "@/lib/ui/theme";

export default function TabsLayout() {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Redirect href="/(auth)" />;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.border,
                    height: 64,
                    paddingTop: 8,
                    paddingBottom: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: "700",
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.muted,
            }}
        >
            <Tabs.Screen name="index" options={{ title: "Home" }} />
            <Tabs.Screen name="ordini" options={{ title: "Ordini" }} />
            <Tabs.Screen name="configurazione" options={{ title: "Configurazione" }} />
            <Tabs.Screen name="venduto" options={{ title: "Venduto" }} />
            <Tabs.Screen name="prestito" options={{ title: "Prestito" }} />
            <Tabs.Screen name="magazzino" options={{ title: "Magazzino" }} />
            <Tabs.Screen name="settings" options={{ title: "Settings" }} />
        </Tabs>
    );
}
