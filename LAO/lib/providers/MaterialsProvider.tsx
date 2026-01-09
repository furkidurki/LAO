import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { material } from "@/lib/models/materials";
import { addMaterials, deleteMaterials, fetchMaterials } from "@/lib/repos/materials.repo";

type Ctx = {
    materials: material[];
    loading: boolean;
    refresh: () => Promise<void>;
    add: (name: string) => Promise<void>;
    remove: (id: string) => Promise<void>;
};

const MaterialsContext = createContext<Ctx | null>(null);

export function MaterialsProvider({ children }: { children: React.ReactNode }) {
    const [materials, setMaterials] = useState<material[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        setLoading(true);
        try {
            const arr = await fetchMaterials();
            setMaterials(arr);
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
            materials,
            loading,
            refresh,
            add: async (name: string) => {
                const id = await addMaterials(name);
                const n = name.trim();
                if (!id || !n) return;

                setMaterials((prev) => {
                    const next = [...prev, { id, name: n } as any];
                    next.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                    return next;
                });
            },
            remove: async (id: string) => {
                await deleteMaterials(id);
                setMaterials((prev) => prev.filter((x) => x.id !== id));
            },
        }),
        [materials, loading]
    );

    return <MaterialsContext.Provider value={value}>{children}</MaterialsContext.Provider>;
}

export function useMaterials() {
    const ctx = useContext(MaterialsContext);
    if (!ctx) throw new Error("useMaterials fuori Provider");
    return ctx;
}
