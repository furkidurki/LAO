import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Order } from "@/lib/models/order";
import { fetchOrders } from "@/lib/repos/orders.repo";

type Ctx = {
    orders: Order[];
    loading: boolean;
    refresh: () => Promise<void>;
};

const OrdersContext = createContext<Ctx | null>(null);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        setLoading(true);
        try {
            const arr = await fetchOrders();
            setOrders(arr);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value = useMemo(() => ({ orders, loading, refresh }), [orders, loading]);

    return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
    const ctx = useContext(OrdersContext);
    if (!ctx) throw new Error("useOrders fuori Provider");
    return ctx;
}
