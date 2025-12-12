import { View, Text, TextInput, Pressable } from "react-native";
import { useState } from "react";
//funzioni che servono per manipolare u states
export default function EditDistributori() {
    const [distributore, setDistributore] = useState("");
    const [menuAggiungi, setMenuAggiungi] = useState(false);
    const [listaDistributori, setListaDistributori] = useState<string[]>([]);

    //servono per eliminare e selezionare quello che vuoi modificare
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selected, setSelected] = useState<Set<number>>(new Set());

    // vettore dove vengono salvati i distributori
    const handleSalva = () => {
        const nome = distributore.trim();
        if (!nome) return;

        setListaDistributori((prev) => [...prev, nome]);
        setDistributore("");
        setMenuAggiungi(false);
    };

    // funzione per la checkbox
    const toggleSelect = (index: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    // elimina selezionati
    const handleDelete = () => {
        setListaDistributori((prev) =>
            prev.filter((_, index) => !selected.has(index))
        );
        setSelected(new Set());
        setIsDeleteMode(false);
    };

    return (
        <View style={{ flex: 1, padding: 16 }}>
            {/* Bottone aggiungi */}
            <Pressable onPress={() => setMenuAggiungi((prev) => !prev)}>
                <Text style={{ fontSize: 18, fontWeight: "600" }}>
                    {menuAggiungi ? "Chiudi" : "Aggiungi"}
                </Text>
            </Pressable>

            {/* Form aggiunta */}
            {menuAggiungi && (
                <View style={{ marginTop: 12, gap: 8 }}>
                    <TextInput
                        placeholder="nome distributore"
                        value={distributore}
                        onChangeText={setDistributore}
                        style={{
                            borderWidth: 1,
                            padding: 10,
                            borderRadius: 8,
                        }}
                    />

                    <Pressable onPress={handleSalva}>
                        <Text style={{ color: "green", fontWeight: "600" }}>Salva</Text>
                    </Pressable>
                </View>
            )}

            {/* Bottone elimina / conferma */}
            {listaDistributori.length > 0 && (
                <Pressable
                    onPress={isDeleteMode ? handleDelete : () => setIsDeleteMode(true)}
                    style={{ marginTop: 16 }}
                >
                    <Text style={{ color: "red", fontWeight: "600" }}>
                        {isDeleteMode ? "Conferma elimina" : "Elimina"}
                    </Text>
                </Pressable>
            )}

            {/* Lista distributori */}
            <View style={{ marginTop: 16, gap: 8 }}>
                {listaDistributori.map((d, i) => (
                    <View
                        key={i}
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        {/* Checkbox */}
                        {isDeleteMode && (
                            <Pressable
                                onPress={() => toggleSelect(i)}
                                style={{
                                    width: 22,
                                    height: 22,
                                    borderWidth: 1,
                                    borderRadius: 4,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Text>{selected.has(i) ? "✓" : ""}</Text>
                            </Pressable>
                        )}

                        <Text>• {d}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}
