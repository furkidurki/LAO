import React, { createContext, useContext, useMemo, useState } from "react";
import type { Client } from "@/lib/models/client";
import { addClient, addClientsBatch, deleteClient, fetchClients } from "@/lib/repos/clients.repo";

type Ctx = {
    clients: Client[];
    loading: boolean;
    loaded: boolean;
    ensureLoaded: () => Promise<void>;
    refresh: () => Promise<void>;
    add: (code: string, ragioneSociale: string) => Promise<void>;
    addMany: (items: Array<{ code: string; ragioneSociale: string }>) => Promise<number>;
    remove: (id: string) => Promise<void>;
};

const ClientsContext = createContext<Ctx | null>(null);

export function ClientsProvider({ children }: { children: React.ReactNode }) {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const refresh = async () => {
        setLoading(true);
        try {
            const arr = await fetchClients();
            setClients(arr);
            setLoaded(true);
        } finally {
            setLoading(false);
        }
    };

    const ensureLoaded = async () => {
        if (loaded || loading) return;
        await refresh();
    };

    const value = useMemo<Ctx>(
        () => ({
            clients,
            loading,
            loaded,
            ensureLoaded,
            refresh,

            add: async (code: string, ragioneSociale: string) => {
                const c = code.trim();
                const r = ragioneSociale.trim();
                if (!c || !r) return;

                const id = await addClient({ code: c, ragioneSociale: r });

                // Non carichiamo la lista “di nascosto”
                // Aggiorniamo lo state SOLO se la lista era già stata caricata
                if (!loaded) return;

                setClients((prev) => {
                    const next = [...prev, { id, code: c, ragioneSociale: r }];
                    next.sort((a, b) => (a.ragioneSociale || "").localeCompare(b.ragioneSociale || ""));
                    return next;
                });
            },

            addMany: async (items: Array<{ code: string; ragioneSociale: string }>) => {
                const cleaned = items
                    .map((x) => ({
                        code: String(x.code ?? "").trim(),
                        ragioneSociale: String(x.ragioneSociale ?? "").trim(),
                    }))
                    .filter((x) => !!x.code && !!x.ragioneSociale);

                if (cleaned.length === 0) return 0;

                const ids = await addClientsBatch(cleaned);

                // Aggiorniamo lo state SOLO se già loaded (non forziamo fetch)
                if (loaded) {
                    setClients((prev) => {
                        const toAdd: Client[] = cleaned.map((x, idx) => ({
                            id: ids[idx] ?? `tmp-${Date.now()}-${idx}`,
                            code: x.code,
                            ragioneSociale: x.ragioneSociale,
                        }));
                        const next = [...prev, ...toAdd];
                        next.sort((a, b) => (a.ragioneSociale || "").localeCompare(b.ragioneSociale || ""));
                        return next;
                    });
                }

                return cleaned.length;
            },

            remove: async (id: string) => {
                await deleteClient(id);

                // Aggiorniamo lo state SOLO se già loaded
                if (!loaded) return;

                setClients((prev) => prev.filter((x) => x.id !== id));
            },
        }),
        [clients, loading, loaded]
    );

    return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
}

export function useClients() {
    const ctx = useContext(ClientsContext);
    if (!ctx) throw new Error("useClients fuori Provider");
    return ctx;
}
