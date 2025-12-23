import {
    addDoc,
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    deleteDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase/firebase";
import { ORDER_STATUSES, type Order, type OrderStatus } from "@/lib/models/order";

const COL = "orders";

export type OrderCreate = Omit<Order, "id" | "createdAt" | "updatedAt">;
export type OrderPatch = Partial<Omit<Order, "id" | "createdAt" | "updatedAt">>;

function normalizeStatus(x: any): OrderStatus {
    return ORDER_STATUSES.includes(x) ? (x as OrderStatus) : "ordinato";
}

export async function addOrder(payload: OrderCreate) {
    await addDoc(collection(db, COL), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export async function deleteOrder(id: string) {
    await deleteDoc(doc(db, COL, id));
}

export function subscribeOrders(setOrders: (x: Order[]) => void) {
    const q = query(collection(db, COL), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
        const arr: Order[] = snap.docs.map((d) => {
            const raw = d.data() as any;

            return {
                id: d.id,
                ...raw,
                // migrazione soft: se arrivano vecchi stati dal DB, li forziamo su "ordinato"
                status: normalizeStatus(raw.status),
            } as Order;
        });

        setOrders(arr);
    });
}

export async function updateOrder(id: string, patch: OrderPatch) {
    await updateDoc(doc(db, COL, id), {
        ...patch,
        updatedAt: serverTimestamp(),
    });
}
