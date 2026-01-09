import React from "react";

import { AuthProvider, useAuth } from "@/lib/providers/AuthProvider";
import { RoleProvider } from "@/lib/providers/RoleProvider";

import { ClientsProvider } from "@/lib/providers/ClientsProvider";
import { MaterialsProvider } from "@/lib/providers/MaterialsProvider";
import { DistributorsProvider } from "@/lib/providers/DistributorsProvider";
import { OrdersProvider } from "@/lib/providers/OrdersProvider";

function DataProvidersGate({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) return <>{children}</>;
    if (!user) return <>{children}</>;

    return (
        <ClientsProvider>
            <MaterialsProvider>
                <DistributorsProvider>
                    <OrdersProvider>{children}</OrdersProvider>
                </DistributorsProvider>
            </MaterialsProvider>
        </ClientsProvider>
    );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            {/* IMPORTANT: RoleProvider deve stare qui, così useRole funziona in Settings */}
            <RoleProvider>
                <DataProvidersGate>{children}</DataProvidersGate>
            </RoleProvider>
        </AuthProvider>
    );
}
