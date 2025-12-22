import React, { createContext, useContext, useEffect, useState } from "react";
import type { Order } from "@/lib/models/order";
import { subscribeOrders } from "@/lib/repos/orders.repo";

type Ctx = {
    orders: Order[];
};

const OrdersContext = createContext<Ctx | null>(null);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        const unsub = subscribeOrders(setOrders);
        return unsub;
    }, []);

    return <OrdersContext.Provider value={{ orders }}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
    const ctx = useContext(OrdersContext);
    if (!ctx) throw new Error("useOrders fuori Provider");
    return ctx;
}
