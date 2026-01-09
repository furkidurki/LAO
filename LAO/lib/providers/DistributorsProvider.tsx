import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Distributor } from "@/lib/models/distributor";
import { addDistributor, deleteDistributor, fetchDistributors } from "@/lib/repos/distributors.repo";

type Ctx = {
    distributors: Distributor[];
    loading: boolean;
    refresh: () => Promise<void>;
    add: (name: string) => Promise<void>;
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
                const n = String(name || "").trim();
                if (!n) return;

                const id = await addDistributor(n);
                setDistributors((prev) => {
                    const next = [...prev, { id, name: n } as any];
                    next.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                    return next;
                });
            },
            remove: async (id: string) => {
                await deleteDistributor(id);
                setDistributors((prev) => prev.filter((x) => x.id !== id));
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
