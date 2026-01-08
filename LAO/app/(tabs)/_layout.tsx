import { Tabs } from "expo-router";
import { Redirect } from "expo-router";

import { useAuth } from "@/lib/providers/AuthProvider";
import { FancyTabBar } from "@/lib/ui/nav/FancyTabBar";

export default function TabsLayout() {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Redirect href="/(auth)" />;

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
            }}
            tabBar={(props) => <FancyTabBar {...props} />}
        >
            <Tabs.Screen name="index" options={{ title: "Home" }} />
            <Tabs.Screen name="ordini" options={{ title: "Ordini" }} />
            <Tabs.Screen name="configurazione" options={{ title: "Config" }} />
            <Tabs.Screen name="venduto" options={{ title: "Venduto" }} />
            <Tabs.Screen name="prestito" options={{ title: "Prestito" }} />
            <Tabs.Screen name="magazzino" options={{ title: "Magazzino" }} />
            <Tabs.Screen name="settings" options={{ title: "Settings" }} />
        </Tabs>
    );
}
