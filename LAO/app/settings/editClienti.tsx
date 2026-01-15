import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";

import { useClients } from "@/lib/providers/ClientsProvider";
import { fetchClients } from "@/lib/repos/clients.repo";
import { ClientSmartSearch, type ClientLite } from "@/lib/ui/components/ClientSmartSearch";
import { theme } from "@/lib/ui/theme";
import { s } from "./settings.styles";

type PickedAsset = {
    uri?: string;
    name?: string;
    file?: any;
};

function normalizeCell(v: any) {
    return String(v ?? "").trim().toLowerCase();
}

function normalizeCode(v: any) {
    if (v === null || v === undefined) return "";
    if (typeof v === "number") {
        if (!Number.isFinite(v)) return "";
        return String(Math.trunc(v));
    }
    const s = String(v).trim();
    if (!s) return "";
    if (/^\d+(\.0+)?$/.test(s)) return s.replace(/\.0+$/, "");
    return s;
}

function parseCsvLine(line: string, delimiter: string) {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];

        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (!inQuotes && ch === delimiter) {
            out.push(cur);
            cur = "";
            continue;
        }

        cur += ch;
    }

    out.push(cur);
    return out;
}

function parseCsv(text: string, delimiter: string) {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
    return lines.map((line) => parseCsvLine(line, delimiter));
}

function pickDelimiter(text: string) {
    const semi = (text.match(/;/g) || []).length;
    const comma = (text.match(/,/g) || []).length;
    return semi >= comma ? ";" : ",";
}

async function readAsText(asset: PickedAsset) {
    if (asset.file && typeof FileReader !== "undefined") {
        const file: File = asset.file;
        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(new Error("Errore lettura file"));
            reader.readAsText(file);
        });
    }

    if (!asset.uri) throw new Error("URI file non valido");
    return await FileSystem.readAsStringAsync(asset.uri, { encoding: "utf8" as any });
}

async function readExcelRows(asset: PickedAsset) {
    if (asset.file && typeof FileReader !== "undefined") {
        const file: File = asset.file;
        const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(new Error("Errore lettura file"));
            reader.readAsArrayBuffer(file);
        });

        const wb = XLSX.read(buffer, { type: "array" });
        const sheetName = wb.SheetNames[0];
        const ws = sheetName ? wb.Sheets[sheetName] : undefined;
        if (!ws) return [];
        return (
            (XLSX.utils.sheet_to_json<any[]>(ws, {
                header: 1,
                blankrows: false,
                defval: "",
            }) as any[][]) || []
        );
    }

    if (!asset.uri) throw new Error("URI file non valido");

    const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: "base64" });
    const wb = XLSX.read(base64, { type: "base64" });
    const sheetName = wb.SheetNames[0];
    const ws = sheetName ? wb.Sheets[sheetName] : undefined;
    if (!ws) return [];
    return (
        (XLSX.utils.sheet_to_json<any[]>(ws, {
            header: 1,
            blankrows: false,
            defval: "",
        }) as any[][]) || []
    );
}

export default function EditClienti() {
    const { openAdd } = useLocalSearchParams<{ openAdd?: string }>();
    const { clients, loaded, loading, ensureLoaded, add, addMany, remove } = useClients();

    const listRef = useRef<FlatList<any>>(null);

    const [code, setCode] = useState("");
    const [ragione, setRagione] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);

    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const [isImporting, setIsImporting] = useState(false);
    const [importMsg, setImportMsg] = useState<string>("");

    const [showAll, setShowAll] = useState(false);

    // SmartSearch state (usata SOLO quando showAll=true)
    const [searchValue, setSearchValue] = useState("");
    const [searchSelectedId, setSearchSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (openAdd === "1") setIsAddOpen(true);
    }, [openAdd]);

    const sorted = useMemo(() => {
        return [...clients].sort((a, b) => (a.ragioneSociale || "").localeCompare(b.ragioneSociale || ""));
    }, [clients]);

    const filtered = useMemo(() => {
        const q = searchValue.trim().toLowerCase();
        if (!q) return sorted;
        return sorted.filter((c) => {
            const rs = String(c.ragioneSociale ?? "").toLowerCase();
            const codeStr = String(c.code ?? "").toLowerCase();
            return rs.includes(q) || codeStr.includes(q);
        });
    }, [sorted, searchValue]);

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

    const findHeaderStartIndex = (rows: any[][]) => {
        const idx = rows.findIndex((r) => {
            const a = normalizeCell(r?.[0]);
            const b = normalizeCell(r?.[1]);
            return a === "codice" && (b === "ragionesociale" || b === "ragione sociale" || b.startsWith("ragione"));
        });
        return idx >= 0 ? idx + 1 : 0;
    };

    const handleToggleShowAll = async () => {
        if (showAll) {
            setShowAll(false);
            setIsDeleteMode(false);
            setSelected(new Set());
            setSearchValue("");
            setSearchSelectedId(null);
            return;
        }

        // Qui avviene la PRIMA lettura (solo su richiesta)
        await ensureLoaded();
        setShowAll(true);
    };

    const handleImport = async () => {
        if (isImporting) return;
        setImportMsg("");

        try {
            setIsImporting(true);

            // NB: ensureLoaded aggiorna lo state, ma qui potresti avere ancora lo state vecchio.
            // Per deduplica usiamo una fetch locale aggiornata (1-shot).
            await ensureLoaded();
            const currentClients = await fetchClients({ limitN: 5000 });

            const res = await DocumentPicker.getDocumentAsync({
                type: "*/*",
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (res.canceled) {
                setImportMsg("Import annullato");
                return;
            }

            const asset = (res.assets?.[0] ?? {}) as PickedAsset;
            const name = (asset.name ?? "").toLowerCase();

            if (!name.endsWith(".csv") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
                setImportMsg("Seleziona un file .csv oppure .xlsx/.xls");
                return;
            }

            const existing = new Set(
                currentClients
                    .map((c) => String(c.code || "").trim().toLowerCase())
                    .filter(Boolean)
            );

            // Se nel DB ci sono già duplicati (stesso codice), lo segnaliamo.
            const dupMap = new Map<string, number>();
            for (const c of currentClients) {
                const k = String(c.code || "").trim().toLowerCase();
                if (!k) continue;
                dupMap.set(k, (dupMap.get(k) ?? 0) + 1);
            }
            const alreadyDuplicated = Array.from(dupMap.values()).filter((n) => n > 1).length;

            const seenInFile = new Set<string>();
            let rows: any[][] = [];

            if (name.endsWith(".csv")) {
                const text = await readAsText(asset);
                const delimiter = pickDelimiter(text);
                rows = parseCsv(text, delimiter);
            } else {
                rows = await readExcelRows(asset);
            }

            if (!rows.length) {
                setImportMsg("File vuoto o non leggibile");
                return;
            }

            const startIdx = findHeaderStartIndex(rows);

            let skippedCount = 0;
            let ignoredCount = 0;

            const toAdd: Array<{ code: string; ragioneSociale: string }> = [];

            for (let i = startIdx; i < rows.length; i++) {
                const r = rows[i] || [];
                const c = normalizeCode(r[0]);
                const rs = String(r[1] ?? "").trim();

                if (!c && !rs) continue;

                if (!c || !rs) {
                    ignoredCount++;
                    continue;
                }

                const key = c.toLowerCase();

                if (existing.has(key) || seenInFile.has(key)) {
                    skippedCount++;
                    continue;
                }

                seenInFile.add(key);
                existing.add(key);
                toAdd.push({ code: c, ragioneSociale: rs });
            }

            if (toAdd.length === 0) {
                const extra = alreadyDuplicated > 0 ? ` | Attenzione: duplicati già nel DB: ${alreadyDuplicated}` : "";
                setImportMsg(`Niente da importare. Skippati: ${skippedCount} | Ignorati: ${ignoredCount}${extra}`);
                return;
            }

            const addedCount = await addMany(toAdd);

            {
                const extra = alreadyDuplicated > 0 ? ` | Attenzione: duplicati già nel DB: ${alreadyDuplicated}` : "";
                setImportMsg(
                    `Import completato. Aggiunti: ${addedCount} | Skippati: ${skippedCount} | Ignorati: ${ignoredCount}${extra}`
                );
            }

            setShowAll(true);
        } catch (e: any) {
            setImportMsg(`Errore import: ${e?.message ?? String(e)}`);
        } finally {
            setIsImporting(false);
        }
    };

    const onPickFromSmartSearch = (c: ClientLite) => {
        setSearchSelectedId(c.id);
        setSearchValue(c.ragioneSociale || "");

        const idx = filtered.findIndex((x) => x.id === c.id);
        if (idx >= 0) {
            requestAnimationFrame(() => {
                listRef.current?.scrollToIndex({ index: idx, animated: true });
            });
        }
    };

    return (
        <View style={s.page}>
            <Text style={s.title}>Clienti</Text>

            <Text style={s.subtitle}>
                Totale: {loaded ? clients.length : "-"} {loaded ? "" : "(premi Mostra tutto per caricare)"}
            </Text>

            <View style={s.card}>
                <View style={s.row}>
                    <Pressable onPress={() => setIsAddOpen((p) => !p)} style={isAddOpen ? s.btnMuted : s.btnPrimary}>
                        <Text style={isAddOpen ? s.btnMutedText : s.btnPrimaryText}>{isAddOpen ? "Chiudi" : "+ Aggiungi"}</Text>
                    </Pressable>

                    <Pressable onPress={handleToggleShowAll} style={showAll ? s.btnMuted : s.btnPrimary} disabled={loading}>
                        <Text style={showAll ? s.btnMutedText : s.btnPrimaryText}>
                            {loading ? "Carico..." : showAll ? "Chiudi lista" : "Mostra tutto"}
                        </Text>
                    </Pressable>

                    <Pressable onPress={handleImport} disabled={isImporting} style={isImporting ? s.btnMuted : s.btnPrimary}>
                        <Text style={isImporting ? s.btnMutedText : s.btnPrimaryText}>
                            {isImporting ? "Import..." : "Import (CSV/Excel)"}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => {
                            if (isDeleteMode) {
                                setIsDeleteMode(false);
                                setSelected(new Set());
                            } else setIsDeleteMode(true);
                        }}
                        style={isDeleteMode ? s.btnMuted : s.btnDanger}
                        disabled={!showAll}
                    >
                        <Text style={isDeleteMode ? s.btnMutedText : s.btnDangerText}>{isDeleteMode ? "Chiudi elimina" : "Elimina"}</Text>
                    </Pressable>

                    {isDeleteMode ? (
                        <Pressable onPress={handleDelete} style={s.btnDanger}>
                            <Text style={s.btnDangerText}>Conferma ({selected.size})</Text>
                        </Pressable>
                    ) : null}
                </View>

                {importMsg ? <Text style={s.itemMuted}>{importMsg}</Text> : null}

                {isAddOpen ? (
                    <View style={{ marginTop: 10, gap: 8 }}>
                        <TextInput
                            placeholder="Codice cliente"
                            placeholderTextColor={theme.colors.muted}
                            value={code}
                            onChangeText={setCode}
                            style={s.input}
                        />
                        <TextInput
                            placeholder="Ragione sociale"
                            placeholderTextColor={theme.colors.muted}
                            value={ragione}
                            onChangeText={setRagione}
                            style={s.input}
                        />
                        <Pressable onPress={handleAdd} style={s.btnPrimary}>
                            <Text style={s.btnPrimaryText}>Salva</Text>
                        </Pressable>
                    </View>
                ) : null}

                {showAll ? (
                    <View style={{ marginTop: 10 }}>
                        <ClientSmartSearch
                            label="Cerca cliente"
                            placeholder="Scrivi ragione sociale o codice"
                            value={searchValue}
                            onChangeValue={(t) => {
                                setSearchValue(t);
                                if (!t.trim()) setSearchSelectedId(null);
                            }}
                            selectedId={searchSelectedId}
                            onSelect={onPickFromSmartSearch}
                            onClear={() => {
                                setSearchValue("");
                                setSearchSelectedId(null);
                            }}
                            maxRecent={10}
                            maxResults={20}
                        />
                    </View>
                ) : null}
            </View>

            {showAll ? (
                <FlatList
                    ref={listRef}
                    data={filtered}
                    keyExtractor={(it) => it.id}
                    contentContainerStyle={{ paddingBottom: 30 }}
                    ItemSeparatorComponent={() => <View style={s.sep} />}
                    ListEmptyComponent={<Text style={s.empty}>Nessun cliente</Text>}
                    onScrollToIndexFailed={() => {}}
                    renderItem={({ item }) => {
                        const checked = selected.has(item.id);
                        const isHighlighted = searchSelectedId === item.id;

                        return (
                            <Pressable
                                onPress={() => (isDeleteMode ? toggleSelect(item.id) : null)}
                                style={[
                                    s.itemRow,
                                    isDeleteMode ? s.itemRowClickable : null,
                                    isHighlighted ? { borderColor: theme.colors.primary, borderWidth: 2 } : null,
                                ]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={s.itemTitle}>{item.ragioneSociale}</Text>
                                    <Text style={s.itemMuted}>Codice: {item.code}</Text>
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
            ) : null}
        </View>
    );
}
