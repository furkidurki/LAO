import React from "react";
import { AuthProvider } from "@/lib/providers/AuthProvider";
import { RoleProvider } from "@/lib/providers/RoleProvider";
import { MaterialsProvider } from "@/lib/providers/MaterialsProvider";
import { DistributorsProvider } from "@/lib/providers/DistributorsProvider";
import { OrdersProvider } from "@/lib/providers/OrdersProvider";
import { ClientsProvider } from "@/lib/providers/ClientsProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <RoleProvider>
                <ClientsProvider>
                    <MaterialsProvider>
                        <DistributorsProvider>
                            <OrdersProvider>{children}</OrdersProvider>
                        </DistributorsProvider>
                    </MaterialsProvider>
                </ClientsProvider>
            </RoleProvider>
        </AuthProvider>
    );
}
