import { View, Text, Pressable, FlatList, Alert } from "react-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";

import { s } from "./settings.styles";
import { useRole } from "@/lib/providers/RoleProvider";
import type { AppRole, AppUserDoc } from "@/lib/models/user";
import { subscribeAllUsers, setUserRole } from "@/lib/repos/users.repo";

function RoleChip(props: { label: string; active?: boolean; onPress: () => void }) {
    return (
        <Pressable onPress={props.onPress} style={props.active ? s.btnPrimary : s.btnMuted}>
            <Text style={props.active ? s.btnPrimaryText : s.btnMutedText}>{props.label}</Text>
        </Pressable>
    );
}

export default function UsersScreen() {
    const { isAdmin, loadingRole } = useRole();
    const [users, setUsers] = useState<Array<AppUserDoc & { id: string }>>([]);

    useEffect(() => {
        if (!isAdmin) return;
        const unsub = subscribeAllUsers(setUsers);
        return unsub;
    }, [isAdmin]);

    if (loadingRole) return null;

    if (!isAdmin) {
        return (
            <View style={s.page}>
                <Text style={s.title}>Utenti</Text>
                <Text style={s.subtitle}>Non autorizzato</Text>

                <Pressable onPress={() => router.back()} style={s.btnMuted}>
                    <Text style={s.btnMutedText}>Indietro</Text>
                </Pressable>
            </View>
        );
    }

    const changeRole = async (uid: string, role: AppRole) => {
        try {
            await setUserRole(uid, role);
        } catch (e: any) {
            Alert.alert("Errore", e?.message ?? "Non riesco a cambiare ruolo");
        }
    };

    const confirmChange = (uid: string, role: AppRole) => {
        Alert.alert("Conferma", `Imposto ruolo: ${role}?`, [
            { text: "Annulla", style: "cancel" },
            { text: "OK", onPress: () => changeRole(uid, role) },
        ]);
    };

    return (
        <View style={s.page}>
            <Text style={s.title}>Utenti</Text>
            <Text style={s.subtitle}>Totale: {users.length}</Text>

            <FlatList
                data={users}
                keyExtractor={(x) => x.id}
                ItemSeparatorComponent={() => <View style={s.sep} />}
                ListEmptyComponent={<Text style={s.empty}>Nessun utente</Text>}
                renderItem={({ item }) => {
                    const r = item.role ?? "viewer";
                    return (
                        <View style={s.listItem}>
                            <View style={s.itemLeft}>
                                <Text style={s.itemTitle}>{item.email || item.id}</Text>
                                <Text style={s.itemMuted}>Role: {r}</Text>
                            </View>

                            <View style={{ gap: 8 }}>
                                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                    <RoleChip label="Admin" active={r === "admin"} onPress={() => confirmChange(item.id, "admin")} />
                                    <RoleChip label="Staff" active={r === "staff"} onPress={() => confirmChange(item.id, "staff")} />
                                    <RoleChip label="Viewer" active={r === "viewer"} onPress={() => confirmChange(item.id, "viewer")} />
                                </View>
                            </View>
                        </View>
                    );
                }}
            />
        </View>
    );
}
