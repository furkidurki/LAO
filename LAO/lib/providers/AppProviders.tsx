import React from "react";
import { MaterialsProvider } from "@/lib/providers/MaterialsProvider";
import { DistributorsProvider } from "@/lib/providers/DistributorsProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <MaterialsProvider>
            <DistributorsProvider>{children}</DistributorsProvider>
        </MaterialsProvider>
    );
}

