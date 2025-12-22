import { Stack } from "expo-router";
import { useAuth } from "@/lib/providers/AuthProvider";
import { Redirect } from "expo-router";
//layout della authentication questa pagina appare solo quando user non e mai stato loggato
export default function AuthLayout() {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (user) return <Redirect href="/(tabs)" />;
    return <Stack />;
}
