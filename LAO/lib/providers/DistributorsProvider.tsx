import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Distributor } from "@/lib/models/distributor";
import { addDistributor, deleteDistributor, fetchDistributors, updateDistributor } from "@/lib/repos/distributors.repo";

type Ctx = {
    distributors: Distributor[];
    loading: boolean;
    refresh: () => Promise<void>;
    add: (name: string) => Promise<void>;
    update: (id: string, name: string) => Promise<void>;
    remove: (id: string) => Promise<void>;
};

const DistributorsContext = createContext<Ctx | null>(null);

export function DistributorsProvider({ children }: { children: React.ReactNode }) {
    const [distributors, setDistributors] = useState<Distributor[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        setLoading(true);
        try {
            const arr = await fetchDistributors();
            setDistributors(arr);
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
            distributors,
            loading,
            refresh,
            add: async (name: string) => {
                await addDistributor(name);
                await refresh();
            },
            update: async (id: string, name: string) => {
                await updateDistributor(id, name);
                await refresh();
            },
            remove: async (id: string) => {
                await deleteDistributor(id);
                await refresh();
            },
        }),
        [distributors, loading]
    );

    return <DistributorsContext.Provider value={value}>{children}</DistributorsContext.Provider>;
}

export function useDistributors() {
    const ctx = useContext(DistributorsContext);
    if (!ctx) throw new Error("useDistributors fuori Provider");
    return ctx;
}
