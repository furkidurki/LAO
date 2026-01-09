import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, limit, orderBy, query, startAt, endAt } from "firebase/firestore";

import { db } from "@/lib/firebase/firebase";
import { theme } from "@/lib/ui/theme";
import { s } from "./settings.styles";

type Client = {
    id: string;
    code?: string;
    ragioneSociale?: string;
};

const COL = "clients";

// Search prefix helper: prefix -> [prefix, prefix+\uf8ff]
async function searchClientsPrefix(prefix: string, maxN: number): Promise<Client[]> {
    const p = prefix.trim();
    if (!p) return [];

    // NOTE: this is case-sensitive. If your DB has mixed casing, users should type similarly.
    // If later you want case-insensitive, we add ragioneSocialeLower field + index.
    const q = query(
        collection(db, COL),
        orderBy("ragioneSociale", "asc"),
        startAt(p),
        endAt(p + "\uf8ff"),
        limit(maxN)
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Client[];
}

async function fetchAllClients(maxN: number): Promise<Client[]> {
    const q = query(collection(db, COL), orderBy("ragioneSociale", "asc"), limit(maxN));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Client[];
}

export default function EditClienti() {
    const [queryText, setQueryText] = useState("");
    const [loading, setLoading] = useState(false);

    const [showAll, setShowAll] = useState(false);
    const [items, setItems] = useState<Client[]>([]);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [code, setCode] = useState("");
    const [ragione, setRagione] = useState("");

    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const debounceRef = useRef<any>(null);

    // When typing, do a small search (no full list)
    useEffect(() => {
        if (showAll) return; // if "show all" is ON, typing doesn't refetch all
        const q = queryText.trim();

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            if (!q) {
                setItems([]);
                return;
            }
            setLoading(true);
            try {
                const res = await searchClientsPrefix(q, 40);
                setItems(res);
            } finally {
                setLoading(false);
            }
        }, 250);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [queryText, showAll]);

    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleLoadAll = async () => {
        setLoading(true);
        try {
            const all = await fetchAllClients(5000); // alza/abbassa se vuoi
            setItems(all);
            setShowAll(true);
        } finally {
            setLoading(false);
        }
    };

    const handleHideAll = () => {
        setShowAll(false);
        setItems([]);
        setQueryText("");
        setIsDeleteMode(false);
        setSelected(new Set());
    };

    const handleAdd = async () => {
        const c = code.trim();
        const r = ragione.trim();
        if (!c || !r) return;

        setLoading(true);
        try {
            // Add minimal: if you already have repo functions addClient, use those instead.
            const { addDoc } = await import("firebase/firestore");
            const ref = await addDoc(collection(db, COL), { code: c, ragioneSociale: r });

            // Update local list without re-reading 2000 docs
            setItems((prev) => {
                const next = [...prev, { id: ref.id, code: c, ragioneSociale: r }];
                next.sort((a, b) => (a.ragioneSociale || "").localeCompare(b.ragioneSociale || ""));
                return next;
            });

            setCode("");
            setRagione("");
            setIsAddOpen(false);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (selected.size === 0) return;

        setLoading(true);
        try {
            const { deleteDoc, doc } = await import("firebase/firestore");
            for (const id of selected) {
                await deleteDoc(doc(db, COL, id));
            }

            setItems((prev) => prev.filter((x) => !selected.has(x.id)));
            setSelected(new Set());
            setIsDeleteMode(false);
        } finally {
            setLoading(false);
        }
    };

    const headerText = useMemo(() => {
        if (loading) return "Caricamento…";
        if (showAll) return `Mostrando lista completa (${items.length})`;
        if (queryText.trim()) return `Risultati (${items.length})`;
        return "Cerca per ragione sociale per vedere risultati";
    }, [loading, showAll, items.length, queryText]);

    return (
        <View style={s.page}>
            <Text style={s.title}>Clienti</Text>
            <Text style={s.subtitle}>{headerText}</Text>

            <View style={s.card}>
                <TextInput
                    value={queryText}
                    onChangeText={setQueryText}
                    placeholder="Cerca ragione sociale…"
                    placeholderTextColor={theme.colors.muted}
                    style={s.input}
                    editable={!showAll} // se hai lista completa, disabilito ricerca per non confondere
                />

                <View style={[s.row, { marginTop: 10 }]}>
                    {!showAll ? (
                        <Pressable onPress={handleLoadAll} style={s.btnMuted} disabled={loading}>
                            <Text style={s.btnMutedText}>Vedi tutta la lista</Text>
                        </Pressable>
                    ) : (
                        <Pressable onPress={handleHideAll} style={s.btnMuted} disabled={loading}>
                            <Text style={s.btnMutedText}>Nascondi lista</Text>
                        </Pressable>
                    )}

                    <Pressable
                        onPress={() => setIsAddOpen((p) => !p)}
                        style={isAddOpen ? s.btnMuted : s.btnPrimary}
                        disabled={loading}
                    >
                        <Text style={isAddOpen ? s.btnMutedText : s.btnPrimaryText}>{isAddOpen ? "Chiudi" : "+ Aggiungi"}</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => {
                            if (isDeleteMode) {
                                setIsDeleteMode(false);
                                setSelected(new Set());
                            } else {
                                setIsDeleteMode(true);
                            }
                        }}
                        style={isDeleteMode ? s.btnMuted : s.btnDanger}
                        disabled={loading}
                    >
                        <Text style={isDeleteMode ? s.btnMutedText : s.btnDangerText}>
                            {isDeleteMode ? "Chiudi elimina" : "Elimina"}
                        </Text>
                    </Pressable>

                    {isDeleteMode ? (
                        <Pressable onPress={handleDeleteSelected} style={s.btnDanger} disabled={loading}>
                            <Text style={s.btnDangerText}>Conferma ({selected.size})</Text>
                        </Pressable>
                    ) : null}
                </View>

                {isAddOpen ? (
                    <View style={{ marginTop: 12, gap: 8 }}>
                        <TextInput
                            value={code}
                            onChangeText={setCode}
                            placeholder="Codice"
                            placeholderTextColor={theme.colors.muted}
                            style={s.input}
                        />
                        <TextInput
                            value={ragione}
                            onChangeText={setRagione}
                            placeholder="Ragione sociale"
                            placeholderTextColor={theme.colors.muted}
                            style={s.input}
                        />
                        <Pressable onPress={handleAdd} style={s.btnPrimary} disabled={loading}>
                            <Text style={s.btnPrimaryText}>Salva</Text>
                        </Pressable>
                    </View>
                ) : null}
            </View>

            <FlatList
                data={items}
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
                                <Text style={s.itemTitle} numberOfLines={1}>
                                    {item.ragioneSociale || "(senza nome)"}
                                </Text>
                                {item.code ? <Text style={s.itemMeta}>Codice: {item.code}</Text> : null}
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
