import React, { createContext, useContext, useEffect, useState } from "react";
import type { material } from "@/lib/models/materials";
import { subscribeMaterials, addMaterials, deleteMaterials } from "@/lib/repos/materials.repo";

type Ctx = {
    materials: material[];
    add: (name: string) => Promise<void>;
    remove: (id: string) => Promise<void>;
};

const MaterialsContext = createContext<Ctx | null>(null);

export function MaterialsProvider({ children }: { children: React.ReactNode }) {
    const [materials, setMaterials] = useState<material[]>([]);

    useEffect(() => {
        const unsub = subscribeMaterials(setMaterials);
        return unsub;
    }, []);

    return (
        <MaterialsContext.Provider
            value={{
                materials,
                add: addMaterials,
                remove: deleteMaterials,
            }}
        >
            {children}
        </MaterialsContext.Provider>
    );
}

export function useMaterials() {
    const ctx = useContext(MaterialsContext);
    if (!ctx) throw new Error("useMaterials fuori Provider");
    return ctx;
}
