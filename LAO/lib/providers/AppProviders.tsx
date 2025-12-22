import React from "react";
import { AuthProvider } from "@/lib/providers/AuthProvider";
import { MaterialsProvider } from "@/lib/providers/MaterialsProvider";
import { DistributorsProvider } from "@/lib/providers/DistributorsProvider";
import { OrdersProvider } from "@/lib/providers/OrdersProvider";
//providers dove vengono chiusi i dati e che poi vengono mandati nei file repos (cioe firebase)
export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <MaterialsProvider>
                <DistributorsProvider>
                    <OrdersProvider>{children}</OrdersProvider>
                </DistributorsProvider>
            </MaterialsProvider>
        </AuthProvider>
    );
}
