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
                await addMaterials(name);
                await refresh();
            },
            remove: async (id: string) => {
                await deleteMaterials(id);
                await refresh();
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
