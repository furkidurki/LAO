import { Stack } from "expo-router";
import { DistributorsProvider} from "@/lib/providers/DistributorsProvider";

export default function RootLayout() {
    return (
        <DistributorsProvider>
            <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
        </DistributorsProvider>
    );
}
