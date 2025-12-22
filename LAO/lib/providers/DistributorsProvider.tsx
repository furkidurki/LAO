import React, { createContext, useContext, useEffect, useState } from "react";
import type { Distributor } from "@/lib/models/distributor";
import {
    subscribeDistributors,//importa le funzioni per salvare i dati nel database
    addDistributor,
    deleteDistributor,
} from "@/lib/repos/distributors.repo";

type Ctx = {//contesto di cio che si bisogna salvare
    distributors: Distributor[];
    add: (name: string) => Promise<void>;
    remove: (id: string) => Promise<void>;
};

const DistributorsContext = createContext<Ctx | null>(null);

export function DistributorsProvider({ children }: { children: React.ReactNode }) {
    const [distributors, setDistributors] = useState<Distributor[]>([]);

    useEffect(() => {
        const unsub = subscribeDistributors(setDistributors);
        return unsub;
    }, []);

    return (
        <DistributorsContext.Provider
            value={{
                distributors,
                add: addDistributor,
                remove: deleteDistributor,
            }}
        >
            {children}
        </DistributorsContext.Provider>
    );
}

export function useDistributors() {//funzione che poi serve per richiamere e far vedere dati o salvarli
    const ctx = useContext(DistributorsContext);
    if (!ctx) throw new Error("useDistributors fuori Provider");
    return ctx;
}
