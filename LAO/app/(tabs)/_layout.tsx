import { Tabs } from "expo-router";
import { useAuth } from "@/lib/providers/AuthProvider";
import { Redirect } from "expo-router";

export default function TabsLayout() {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Redirect href="/(auth)" />;

    return (
        <Tabs>
            <Tabs.Screen name="ordini" options={{ title: "Ordini" }} />
            <Tabs.Screen name="configurazione" options={{ title: "Configurazione" }} />
            <Tabs.Screen name="index" options={{ title: "Home" }} />
            <Tabs.Screen name="magazzino" options={{ title: "Magazzino" }} />
            <Tabs.Screen name="settings" options={{ title: "Settings" }} />
        </Tabs>
    );
}
