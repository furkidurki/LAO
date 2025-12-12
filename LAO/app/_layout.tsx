import { Stack } from "expo-router";
//laoyt di tutte le pagine
export default function RootLayout() {
    return (
        <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="magazzino/aggiungi" options={{ title: "Aggiungi" }} />
        </Stack>
    );
}
