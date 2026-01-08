import { useEffect } from "react";
import { Stack } from "expo-router";
import { AppProviders } from "@/lib/providers/AppProviders";

import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
    const [fontsLoaded, fontError] = useFonts({
        ...Ionicons.font,
    });

    useEffect(() => {
        if (fontsLoaded || fontError) {
            SplashScreen.hideAsync().catch(() => {});
        }
    }, [fontsLoaded, fontError]);

    if (!fontsLoaded && !fontError) {
        return null;
    }

    return (
        <AppProviders>
            <Stack screenOptions={{ headerShown: false }} />
        </AppProviders>
    );
}
