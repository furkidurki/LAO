import React, { createContext, useContext, useEffect, useState } from "react";
import type { Client } from "@/lib/models/client";
import { addClient, deleteClient, subscribeClients } from "@/lib/repos/clients.repo";

type Ctx = {
    clients: Client[];
    add: (code: string, ragioneSociale: string) => Promise<void>;
    remove: (id: string) => Promise<void>;
};

const ClientsContext = createContext<Ctx | null>(null);

export function ClientsProvider({ children }: { children: React.ReactNode }) {
    const [clients, setClients] = useState<Client[]>([]);

    useEffect(() => {
        const unsub = subscribeClients(setClients);
        return unsub;
    }, []);

    return (
        <ClientsContext.Provider
            value={{
                clients,
                add: async (code, ragioneSociale) => addClient({ code, ragioneSociale }),
                remove: deleteClient,
            }}
        >
            {children}
        </ClientsContext.Provider>
    );
}

export function useClients() {
    const ctx = useContext(ClientsContext);
    if (!ctx) throw new Error("useClients fuori Provider");
    return ctx;
}
