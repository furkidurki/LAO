import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Client } from "@/lib/models/client";
import { addClient, deleteClient, fetchClients } from "@/lib/repos/clients.repo";

type Ctx = {
    clients: Client[];
    loading: boolean;
    refresh: () => Promise<void>;
    add: (code: string, ragioneSociale: string) => Promise<void>;
    remove: (id: string) => Promise<void>;
};

const ClientsContext = createContext<Ctx | null>(null);

export function ClientsProvider({ children }: { children: React.ReactNode }) {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        setLoading(true);
        try {
            const arr = await fetchClients();
            setClients(arr);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value = useMemo(
        () => ({
            clients,
            loading,
            refresh,
            add: async (code: string, ragioneSociale: string) => {
                const c = code.trim();
                const r = ragioneSociale.trim();
                if (!c || !r) return;

                const id = await addClient({ code: c, ragioneSociale: r });
                setClients((prev) => {
                    const next = [...prev, { id, code: c, ragioneSociale: r }];
                    next.sort((a, b) => (a.ragioneSociale || "").localeCompare(b.ragioneSociale || ""));
                    return next;
                });
            },
            remove: async (id: string) => {
                await deleteClient(id);
                setClients((prev) => prev.filter((x) => x.id !== id));
            },
        }),
        [clients, loading]
    );

    return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
}

export function useClients() {
    const ctx = useContext(ClientsContext);
    if (!ctx) throw new Error("useClients fuori Provider");
    return ctx;
}
