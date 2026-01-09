import { View, Text, TextInput, Pressable, FlatList } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useMaterials } from "@/lib/providers/MaterialsProvider";
import { theme } from "@/lib/ui/theme";
import { s } from "./settings.styles";

export default function EditMaterials() {
    const { openAdd } = useLocalSearchParams<{ openAdd?: string }>();
    const { materials, add, remove } = useMaterials();

    const [nome, setNome] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (openAdd === "1") setIsAddOpen(true);
    }, [openAdd]);

    const sorted = useMemo(() => {
        return [...materials].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }, [materials]);

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
        const n = nome.trim();
        if (!n) return;
        await add(n);
        setNome("");
        setIsAddOpen(false);
    };

    return (
        <View style={s.page}>
            <Text style={s.title}>Materiali</Text>
            <Text style={s.subtitle}>Totale: {materials.length}</Text>

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
                    <View style={{ marginTop: 10, gap: 8 }}>
                        <TextInput
                            value={nome}
                            onChangeText={setNome}
                            placeholder="Nome materiale"
                            placeholderTextColor={theme.colors.muted}
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
                keyExtractor={(it) => it.id}
                contentContainerStyle={{ paddingBottom: 30 }}
                renderItem={({ item }) => {
                    const checked = selected.has(item.id);

                    return (
                        <Pressable
                            onPress={() => (isDeleteMode ? toggleSelect(item.id) : null)}
                            style={[s.itemRow, isDeleteMode ? s.itemRowClickable : null]}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={s.itemTitle}>{item.name}</Text>
                            </View>

                            {isDeleteMode ? (
                                <Ionicons
                                    name={checked ? "checkbox" : "square-outline"}
                                    size={22}
                                    color={checked ? theme.colors.primary : theme.colors.muted}
                                />
                            ) : null}
                        </Pressable>
                    );
                }}
            />
        </View>
    );
}
