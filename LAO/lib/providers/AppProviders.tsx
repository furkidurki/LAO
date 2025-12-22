import React from "react";
import { AuthProvider } from "@/lib/providers/AuthProvider";
import { MaterialsProvider } from "@/lib/providers/MaterialsProvider";
import { DistributorsProvider } from "@/lib/providers/DistributorsProvider";
import { OrdersProvider } from "@/lib/providers/OrdersProvider";
import { ClientsProvider } from "@/lib/providers/ClientsProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ClientsProvider>
                <MaterialsProvider>
                    <DistributorsProvider>
                        <OrdersProvider>{children}</OrdersProvider>
                    </DistributorsProvider>
                </MaterialsProvider>
            </ClientsProvider>
        </AuthProvider>
    );
}
