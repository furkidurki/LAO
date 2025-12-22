import {
    addDoc,
    collection,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import type { Order } from "@/lib/models/order";

const COL = "orders";

export async function addOrder(payload: Omit<Order, "id" | "createdAt">) {
    await addDoc(collection(db, COL), {
        ...payload,
        createdAt: serverTimestamp(),
    });
}

export function subscribeOrders(setOrders: (x: Order[]) => void) {
    const q = query(collection(db, COL), orderBy("createdAt", "desc"));

    return onSnapshot(q, (snap) => {
        const arr: Order[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
        }));
        setOrders(arr);
    });
}


export async function getLatestInPrestitoOrder() {
    const q = query(
        collection(db, COL),
        where("status", "==", "in_prestito"),
        orderBy("createdAt", "desc"),
        limit(1)
    );

    const snap = await getDocs(q);
    if (snap.empty) return null;

    const d = snap.docs[0];
    return {
        id: d.id,
        ...(d.data() as any),
    } as Order;
}
