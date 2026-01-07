import { View, Text, TextInput, Pressable, FlatList } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";

import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "xlsx";

import { useClients } from "@/lib/providers/ClientsProvider";
import { s } from "./settings.styles";

type PickedAsset = {
    uri?: string;
    name?: string;
    file?: any; // web: File
};

function normalizeCell(v: any) {
    return String(v ?? "")
        .trim()
        .toLowerCase();
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

// --- CSV PARSER (supporta ; o , + virgolette) ---
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

// --- READ FILE HELPERS (web + mobile) ---
async function readAsText(asset: PickedAsset) {
    // Web: asset.file è un File
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
    // Ritorna rows come array di righe [ [A,B,C..], ... ]
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
        return (XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, blankrows: false, defval: "" }) as any[][]) || [];
    }

    if (!asset.uri) throw new Error("URI file non valido");

    const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: "base64" });
    const wb = XLSX.read(base64, { type: "base64" });
    const sheetName = wb.SheetNames[0];
    const ws = sheetName ? wb.Sheets[sheetName] : undefined;
    if (!ws) return [];
    return (XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, blankrows: false, defval: "" }) as any[][]) || [];
}

export default function EditClienti() {
    const { openAdd } = useLocalSearchParams<{ openAdd?: string }>();
    const { clients, add, remove } = useClients();

    const [code, setCode] = useState("");
    const [ragione, setRagione] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const [q, setQ] = useState(""); // ✅ SEARCH

    const [isImporting, setIsImporting] = useState(false);
    const [importMsg, setImportMsg] = useState<string>("");

    useEffect(() => {
        if (openAdd === "1") setIsAddOpen(true);
    }, [openAdd]);

    const sorted = useMemo(() => {
        return [...clients].sort((a, b) => (a.ragioneSociale || "").localeCompare(b.ragioneSociale || ""));
    }, [clients]);

    // ✅ FILTERED LIST (search by code or ragione)
    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        if (!term) return sorted;

        return sorted.filter((c) => {
            const rs = String(c.ragioneSociale ?? "").toLowerCase();
            const code = String(c.code ?? "").toLowerCase();
            return rs.includes(term) || code.includes(term);
        });
    }, [sorted, q]);

    const visibleIds = useMemo(() => filtered.map((c) => c.id), [filtered]);

    const isAllVisibleSelected = useMemo(() => {
        if (!visibleIds.length) return false;
        for (const id of visibleIds) {
            if (!selected.has(id)) return false;
        }
        return true;
    }, [visibleIds, selected]);

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

    const handleSelectAllVisible = () => {
        setSelected((prev) => {
            const next = new Set(prev);

            if (isAllVisibleSelected) {
                // Deseleziona solo quelli visibili (così non tocchi eventuali selezioni fuori filtro)
                for (const id of visibleIds) next.delete(id);
            } else {
                // Seleziona tutti i visibili
                for (const id of visibleIds) next.add(id);
            }

            return next;
        });
    };

    const handleImport = async () => {
        if (isImporting) return;
        setImportMsg("");

        try {
            setIsImporting(true);

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
                clients
                    .map((c) => String(c.code || "").trim().toLowerCase())
                    .filter(Boolean)
            );
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

            let addedCount = 0;
            let skippedCount = 0;
            let ignoredCount = 0;

            for (let i = startIdx; i < rows.length; i++) {
                const r = rows[i] || [];
                const codeVal = r[0]; // colonna A
                const ragioneVal = r[1]; // colonna B

                const c = normalizeCode(codeVal);
                const rs = String(ragioneVal ?? "").trim();

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

                await add(c, rs);

                existing.add(key);
                addedCount++;
            }

            setImportMsg(
                `Import completato ✅  Aggiunti: ${addedCount}  |  Skippati (già esistenti): ${skippedCount}  |  Ignorati: ${ignoredCount}`
            );
        } catch (e: any) {
            setImportMsg(`Errore import: ${e?.message ?? String(e)}`);
        } finally {
            setIsImporting(false);
        }
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

                    <Pressable onPress={handleImport} disabled={isImporting} style={isImporting ? s.btnMuted : s.btnPrimary}>
                        <Text style={isImporting ? s.btnMutedText : s.btnPrimaryText}>{isImporting ? "Import..." : "Import (CSV/Excel)"}</Text>
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

                {/* ✅ SEARCH BAR (sempre) */}
                <View style={{ gap: 10, marginTop: 10 }}>
                    <TextInput
                        placeholder="Cerca (codice o ragione sociale)"
                        placeholderTextColor={"rgba(229,231,235,0.70)"}
                        value={q}
                        onChangeText={setQ}
                        style={s.input}
                    />

                    {/* ✅ SELECT ALL (solo in delete mode) */}
                    {isDeleteMode ? (
                        <View style={s.row}>
                            <Pressable onPress={handleSelectAllVisible} style={s.btnMuted}>
                                <Text style={s.btnMutedText}>
                                    {isAllVisibleSelected ? "Deseleziona tutto" : "Seleziona tutto"}
                                </Text>
                            </Pressable>

                            <Pressable onPress={() => setSelected(new Set())} style={s.btnMuted}>
                                <Text style={s.btnMutedText}>Pulisci selezione</Text>
                            </Pressable>

                            <Text style={s.itemMuted}>
                                Visibili: {filtered.length} — Selezionati: {selected.size}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {isAddOpen ? (
                    <View style={{ gap: 10, marginTop: 12 }}>
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
                data={filtered}
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
