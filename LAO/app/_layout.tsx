import { Stack } from "expo-router";
import { AppProviders } from "@/lib/providers/AppProviders";

export default function RootLayout() {
    return (
        <AppProviders>
            <Stack />
        </AppProviders>
    );
}
