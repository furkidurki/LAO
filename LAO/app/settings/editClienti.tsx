import { View, Text, TextInput, Pressable, FlatList } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";

import { useClients } from "@/lib/providers/ClientsProvider";
import { s } from "./settings.styles";

export default function EditClienti() {
    const { openAdd } = useLocalSearchParams<{ openAdd?: string }>();
    const { clients, add, remove } = useClients();

    const [code, setCode] = useState("");
    const [ragione, setRagione] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (openAdd === "1") setIsAddOpen(true);
    }, [openAdd]);

    const sorted = useMemo(() => {
        return [...clients].sort((a, b) => (a.ragioneSociale || "").localeCompare(b.ragioneSociale || ""));
    }, [clients]);

    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleDelete = async () => {
        for (const id of selected) await remove(id);
        setSelected(new Set());
        setIsDeleteMode(false);
    };

    const handleAdd = async () => {
        const c = code.trim();
        const r = ragione.trim();
        if (!c || !r) return;
        await add(c, r);
        setCode("");
        setRagione("");
        setIsAddOpen(false);
    };

    return (
        <View style={s.page}>
            <Text style={s.title}>Clienti</Text>
            <Text style={s.subtitle}>Totale: {clients.length}</Text>

            <View style={s.card}>
                <View style={s.row}>
                    <Pressable onPress={() => setIsAddOpen((p) => !p)} style={isAddOpen ? s.btnMuted : s.btnPrimary}>
                        <Text style={isAddOpen ? s.btnMutedText : s.btnPrimaryText}>{isAddOpen ? "Chiudi" : "+ Aggiungi"}</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => {
                            if (isDeleteMode) {
                                setIsDeleteMode(false);
                                setSelected(new Set());
                            } else setIsDeleteMode(true);
                        }}
                        style={isDeleteMode ? s.btnMuted : s.btnDanger}
                    >
                        <Text style={isDeleteMode ? s.btnMutedText : s.btnDangerText}>
                            {isDeleteMode ? "Chiudi elimina" : "Elimina"}
                        </Text>
                    </Pressable>

                    {isDeleteMode ? (
                        <Pressable onPress={handleDelete} style={s.btnDanger}>
                            <Text style={s.btnDangerText}>Conferma ({selected.size})</Text>
                        </Pressable>
                    ) : null}
                </View>

                {isAddOpen ? (
                    <View style={{ gap: 10 }}>
                        <TextInput
                            placeholder="Codice cliente"
                            placeholderTextColor={"rgba(229,231,235,0.70)"}
                            value={code}
                            onChangeText={setCode}
                            style={s.input}
                        />
                        <TextInput
                            placeholder="Ragione sociale"
                            placeholderTextColor={"rgba(229,231,235,0.70)"}
                            value={ragione}
                            onChangeText={setRagione}
                            style={s.input}
                        />
                        <Pressable onPress={handleAdd} style={s.btnPrimary}>
                            <Text style={s.btnPrimaryText}>Salva</Text>
                        </Pressable>
                    </View>
                ) : null}
            </View>

            <FlatList
                data={sorted}
                keyExtractor={(x) => x.id}
                ItemSeparatorComponent={() => <View style={s.sep} />}
                ListEmptyComponent={<Text style={s.empty}>Nessun cliente</Text>}
                renderItem={({ item }) => (
                    <View style={s.listItem}>
                        <View style={s.itemLeft}>
                            <Text style={s.itemTitle}>{item.ragioneSociale}</Text>
                            <Text style={s.itemMuted}>Codice: {item.code}</Text>
                        </View>

                        {isDeleteMode ? (
                            <Pressable onPress={() => toggleSelect(item.id)} style={s.checkBtn}>
                                <Text style={s.checkText}>{selected.has(item.id) ? "☑" : "☐"}</Text>
                            </Pressable>
                        ) : null}
                    </View>
                )}
            />
        </View>
    );
}
