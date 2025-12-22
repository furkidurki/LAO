import { View, Text, TextInput, Pressable } from "react-native";
import { useState } from "react";
import { useClients } from "@/lib/providers/ClientsProvider";

export default function EditClienti() {
    const { clients, add, remove } = useClients();

    const [code, setCode] = useState("");
    const [ragione, setRagione] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

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
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Clienti</Text>

            <Pressable onPress={() => setIsAddOpen((p) => !p)}>
                <Text>{isAddOpen ? "Chiudi" : "Aggiungi cliente"}</Text>
            </Pressable>

            {isAddOpen && (
                <View style={{ gap: 8 }}>
                    <TextInput
                        placeholder="Codice cliente"
                        value={code}
                        onChangeText={setCode}
                        style={{ borderWidth: 1, padding: 10 }}
                    />
                    <TextInput
                        placeholder="Ragione sociale"
                        value={ragione}
                        onChangeText={setRagione}
                        style={{ borderWidth: 1, padding: 10 }}
                    />
                    <Pressable onPress={handleAdd}>
                        <Text>Salva</Text>
                    </Pressable>
                </View>
            )}

            <Pressable
                onPress={isDeleteMode ? handleDelete : () => setIsDeleteMode(true)}
                style={{ marginTop: 10 }}
            >
                <Text style={{ color: "red" }}>
                    {isDeleteMode ? "Conferma elimina" : "Elimina"}
                </Text>
            </Pressable>

            {clients.map((c) => (
                <View key={c.id} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                    {isDeleteMode && (
                        <Pressable onPress={() => toggleSelect(c.id)}>
                            <Text>{selected.has(c.id) ? "☑" : "☐"}</Text>
                        </Pressable>
                    )}
                    <View>
                        <Text style={{ fontWeight: "700" }}>{c.ragioneSociale}</Text>
                        <Text>Codice: {c.code}</Text>
                    </View>
                </View>
            ))}
        </View>
    );
}
