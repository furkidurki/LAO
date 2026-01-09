import React from "react";

import { AuthProvider, useAuth } from "@/lib/providers/AuthProvider";
import { RoleProvider } from "@/lib/providers/RoleProvider";

import { ClientsProvider } from "@/lib/providers/ClientsProvider";
import { MaterialsProvider } from "@/lib/providers/MaterialsProvider";
import { DistributorsProvider } from "@/lib/providers/DistributorsProvider";
import { OrdersProvider } from "@/lib/providers/OrdersProvider";

function DataProvidersGate({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    // IMPORTANT: mentre Auth sta caricando, NON renderizzare nulla.
    // Altrimenti le schermate chiamano useOrders/useClients fuori Provider.
    if (loading) return null;

    // Se non c'è user (schermate auth), renderizza i children senza data providers
    if (!user) return <>{children}</>;

    // Se c'è user, monta i provider dati
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
            <RoleProvider>
                <DataProvidersGate>{children}</DataProvidersGate>
            </RoleProvider>
        </AuthProvider>
    );
}
