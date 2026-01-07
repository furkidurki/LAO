import { ScrollView, View, Text, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/providers/AuthProvider";
import { s } from "@/lib/ui/tabs.styles";


function RowButton(props: { title: string; subtitle?: string; onPress: () => void }) {
    return (
        <Pressable onPress={props.onPress} style={s.rowBtn}>
            <View style={s.rowTop}>
                <Text style={s.rowTitle}>{props.title}</Text>
                <Text style={s.rowChevron}>›</Text>
            </View>
            {props.subtitle ? <Text style={s.rowSubtitle}>{props.subtitle}</Text> : null}
        </Pressable>
    );
}

export default function SettingsTab() {
    const { user, logout } = useAuth();

    async function onLogout() {
        try {
            await logout();
            router.replace("/(auth)" as any);
        } catch (e) {
            console.log(e);
            Alert.alert("Errore", "Non riesco a fare logout.");
        }
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} style={{ backgroundColor: s.page.backgroundColor as any }}>
            <Text style={s.title}>Settings</Text>
            <Text style={s.subtitle}>{user?.email ? `Account: ${user.email}` : "Account"}</Text>

            <View style={s.sectionCard}>
                <Text style={s.cardTitle}>Gestione</Text>

                <RowButton title="Clienti" subtitle="Aggiungi / modifica clienti" onPress={() => router.push("/settings/editClienti" as any)} />
                <RowButton title="Distributori" subtitle="Aggiungi / modifica distributori" onPress={() => router.push("/settings/editDistributori" as any)} />
                <RowButton title="Materiali" subtitle="Aggiungi / modifica materiali" onPress={() => router.push("/settings/editMaterials" as any)} />
            </View>

            <View style={s.sectionCard}>
                <Text style={s.cardTitle}>Account</Text>

                <Pressable onPress={onLogout} style={s.logoutBtn}>
                    <Text style={s.logoutText}>Logout</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}
