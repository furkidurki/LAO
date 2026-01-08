import { View, Text, TextInput, Pressable, FlatList } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useRole } from "@/lib/providers/RoleProvider";

import { useMaterials } from "@/lib/providers/MaterialsProvider";
import { s } from "./settings.styles";

export default function EditMaterials() {
    const { openAdd } = useLocalSearchParams<{ openAdd?: string }>();
    const { materials, add, remove } = useMaterials();
    const { canEditBaseConfig } = useRole();
    const readOnly = !canEditBaseConfig;

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
                    <View style={{ gap: 10 }}>
                        <TextInput
                            placeholder="Nome materiale"
                            placeholderTextColor={"rgba(229,231,235,0.70)"}
                            value={nome}
                            onChangeText={setNome}
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
                ListEmptyComponent={<Text style={s.empty}>Nessun materiale</Text>}
                renderItem={({ item }) => (
                    <View style={s.listItem}>
                        <View style={s.itemLeft}>
                            <Text style={s.itemTitle}>{item.name}</Text>
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
