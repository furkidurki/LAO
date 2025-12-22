import React from "react";
import { AuthProvider } from "@/lib/providers/AuthProvider";
import { MaterialsProvider } from "@/lib/providers/MaterialsProvider";
import { DistributorsProvider } from "@/lib/providers/DistributorsProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <MaterialsProvider>
                <DistributorsProvider>{children}</DistributorsProvider>
            </MaterialsProvider>
        </AuthProvider>
    );
}
