import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, endAt, getDocs, limit, orderBy, query, startAt } from "firebase/firestore";

import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/lib/providers/AuthProvider";
import { theme } from "@/lib/ui/theme";

export type ClientLite = {
    id: string;
    ragioneSociale: string;
    code?: string;
};

type Props = {
    label?: string;
    placeholder?: string;

    // Controlled text shown in the input
    value: string;
    onChangeValue: (t: string) => void;

    // Selected client id (optional)
    selectedId?: string | null;
    onSelect: (c: ClientLite) => void;

    onClear?: () => void;

    maxRecent?: number;   // default 10
    maxResults?: number;  // default 20
};

function uniqById(list: ClientLite[]) {
    const seen = new Set<string>();
    const out: ClientLite[] = [];
    for (const x of list) {
        if (!x?.id) continue;
        if (seen.has(x.id)) continue;
        seen.add(x.id);
        out.push(x);
    }
    return out;
}

export function ClientSmartSearch(props: Props) {
    const { user } = useAuth();

    const maxRecent = props.maxRecent ?? 10;
    const maxResults = props.maxResults ?? 20;

    const storageKey = useMemo(() => {
        const uid = user?.uid ? user.uid : "anon";
        return `@lao/recentClients/v1/${uid}`;
    }, [user?.uid]);

    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [recent, setRecent] = useState<ClientLite[]>([]);
    const [results, setResults] = useState<ClientLite[]>([]);

    const debounceRef = useRef<any>(null);

    async function loadRecent() {
        try {
            const raw = await AsyncStorage.getItem(storageKey);
            if (!raw) {
                setRecent([]);
                return;
            }
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) {
                setRecent([]);
                return;
            }
            const safe = arr
                .map((x: any) => ({
                    id: String(x?.id ?? ""),
                    ragioneSociale: String(x?.ragioneSociale ?? ""),
                    code: x?.code ? String(x.code) : undefined,
                }))
                .filter((x: ClientLite) => x.id && x.ragioneSociale);

            setRecent(safe.slice(0, maxRecent));
        } catch {
            setRecent([]);
        }
    }

    async function saveRecent(picked: ClientLite) {
        try {
            const next = uniqById([picked, ...recent]).slice(0, maxRecent);
            setRecent(next);
            await AsyncStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
            // ignore
        }
    }

    async function searchFirestore(text: string) {
        const qText = text.trim();
        if (!qText) {
            setResults([]);
            return;
        }

        setBusy(true);
        try {
            const col = collection(db, "clients");

            // Query 1: ragioneSociale prefix
            const q1 = query(
                col,
                orderBy("ragioneSociale", "asc"),
                startAt(qText),
                endAt(qText + "\uf8ff"),
                limit(maxResults)
            );

            // Query 2: code prefix (optional but useful)
            const q2 = query(
                col,
                orderBy("code", "asc"),
                startAt(qText),
                endAt(qText + "\uf8ff"),
                limit(Math.min(10, maxResults))
            );

            const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);

            const a1: ClientLite[] = s1.docs.map((d) => {
                const data: any = d.data();
                return {
                    id: d.id,
                    ragioneSociale: String(data?.ragioneSociale ?? ""),
                    code: data?.code ? String(data.code) : undefined,
                };
            });

            const a2: ClientLite[] = s2.docs.map((d) => {
                const data: any = d.data();
                return {
                    id: d.id,
                    ragioneSociale: String(data?.ragioneSociale ?? ""),
                    code: data?.code ? String(data.code) : undefined,
                };
            });

            const merged = uniqById([...a1, ...a2])
                .filter((x) => x.ragioneSociale)
                .slice(0, maxResults);

            setResults(merged);
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => {
        void loadRecent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storageKey]);

    useEffect(() => {
        if (!open) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            void searchFirestore(props.value);
        }, 250);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, props.value]);

    const list = useMemo(() => {
        const hasQuery = props.value.trim().length > 0;
        return hasQuery ? results : recent;
    }, [props.value, results, recent]);

    const subtitle = useMemo(() => {
        if (!open) return "";
        if (props.value.trim().length === 0) return `Recenti (max ${maxRecent})`;
        if (busy) return "Cerco…";
        return `Risultati (max ${maxResults})`;
    }, [open, props.value, busy, maxRecent, maxResults]);

    function pick(c: ClientLite) {
        props.onSelect(c);
        void saveRecent(c);
        setOpen(false);
    }

    return (
        <View style={{ gap: 8 }}>
            {props.label ? <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>{props.label}</Text> : null}

            <TextInput
                value={props.value}
                onChangeText={(t) => {
                    props.onChangeValue(t);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder={props.placeholder ?? "Cerca ragione sociale o codice…"}
                placeholderTextColor={theme.colors.muted}
                style={{
                    backgroundColor: theme.colors.surface2,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.lg,
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    color: theme.colors.text,
                    fontWeight: "900",
                }}
            />

            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                {props.selectedId ? (
                    <Pressable
                        onPress={() => {
                            props.onClear?.();
                            setOpen(false);
                            setResults([]);
                        }}
                        style={{
                            backgroundColor: theme.colors.surface2,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: theme.radius.lg,
                        }}
                    >
                        <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Pulisci</Text>
                    </Pressable>
                ) : null}

                <Pressable
                    onPress={() => setOpen((p) => !p)}
                    style={{
                        backgroundColor: theme.colors.surface2,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: theme.radius.lg,
                    }}
                >
                    <Text style={{ color: theme.colors.text, fontWeight: "900" }}>{open ? "Chiudi" : "Apri"}</Text>
                </Pressable>
            </View>

            {open ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: theme.radius.lg,
                        overflow: "hidden",
                        backgroundColor: theme.colors.surface,
                        maxHeight: 260,
                    }}
                >
                    <View style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                        <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>{subtitle}</Text>
                    </View>

                    <FlatList
                        keyboardShouldPersistTaps="handled"
                        data={list}
                        keyExtractor={(x) => x.id}
                        renderItem={({ item, index }) => (
                            <Pressable
                                onPress={() => pick(item)}
                                style={{
                                    paddingVertical: 12,
                                    paddingHorizontal: 12,
                                    borderBottomWidth: index === list.length - 1 ? 0 : 1,
                                    borderBottomColor: theme.colors.border,
                                    backgroundColor: theme.colors.surface,
                                }}
                            >
                                <Text style={{ color: theme.colors.text, fontWeight: "900" }} numberOfLines={1}>
                                    {item.ragioneSociale}
                                </Text>
                                <Text style={{ color: theme.colors.muted, fontWeight: "900", marginTop: 2 }}>
                                    Codice: {item.code || "-"}
                                </Text>
                            </Pressable>
                        )}
                        ListEmptyComponent={
                            <View style={{ padding: 12 }}>
                                <Text style={{ color: theme.colors.muted, fontWeight: "900" }}>
                                    {props.value.trim().length === 0 ? "Nessun recente" : "Nessun risultato"}
                                </Text>
                            </View>
                        }
                    />
                </View>
            ) : null}
        </View>
    );
}
