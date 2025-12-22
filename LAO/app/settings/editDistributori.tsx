import { View, Text, TextInput, Pressable } from "react-native";
import { useState } from "react";
import { useDistributors} from "@/lib/providers/DistributorsProvider";//richiama il provider quindi la forma dei dati


export default function EditDistributori() {
    const { distributors, add, remove } = useDistributors();//richiama le funzioni del form che poi servono per salvarle nei database

    const [nome, setNome] = useState("");//stati delle variabili che inserisci
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const toggleSelect = (id: string) => {//attiva il select
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleDelete = async () => {//cancella i selezionati
        for (const id of selected) {
            await remove(id);
        }
        setSelected(new Set());
        setIsDeleteMode(false);
    };

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <Pressable onPress={() => setIsAddOpen((p) => !p)}>
                <Text>{isAddOpen ? "Chiudi" : "Aggiungi distributore"}</Text>
            </Pressable>

            {isAddOpen && (
                <View style={{ gap: 8, marginTop: 12 }}>
                    <TextInput
                        placeholder="nome distributore"
                        value={nome}
                        onChangeText={setNome}
                        style={{ borderWidth: 1, padding: 10 }}
                    />
                    <Pressable onPress={() => { add(nome); setNome(""); setIsAddOpen(false); }}>
                        <Text>Salva</Text>
                    </Pressable>
                </View>
            )}

            <Pressable
                onPress={isDeleteMode ? handleDelete : () => setIsDeleteMode(true)}
                style={{ marginTop: 16 }}
            >
                <Text style={{ color: "red" }}>
                    {isDeleteMode ? "Conferma elimina" : "Elimina"}
                </Text>
            </Pressable>

            {distributors.map((d) => (
                <View key={d.id} style={{ flexDirection: "row", gap: 8 }}>
                    {isDeleteMode && (
                        <Pressable onPress={() => toggleSelect(d.id)}>
                            <Text>{selected.has(d.id) ? "☑" : "☐"}</Text>
                        </Pressable>
                    )}
                    <Text>{d.name}</Text>
                </View>
            ))}
        </View>
    );
}
