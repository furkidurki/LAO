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
        // one-shot load only
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value = useMemo(
        () => ({
            clients,
            loading,
            refresh,
            add: async (code: string, ragioneSociale: string) => {
                await addClient({ code, ragioneSociale });
                await refresh();
            },
            remove: async (id: string) => {
                await deleteClient(id);
                await refresh();
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
