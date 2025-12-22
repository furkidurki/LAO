//il dati per salvarli in database
import { db } from "@/lib/firebase/firebase";
import {
    addDoc,
    collection,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    doc,
    where,
} from "firebase/firestore";
import type { CreateOrderInput, Order, OrderStatus } from "@/lib/models/order";

const COL = "orders";

export async function addOrder(input: CreateOrderInput) {
    const ref = await addDoc(collection(db, COL), {
        ...input,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
    await updateDoc(doc(db, COL, orderId), {
        status,
        updatedAt: serverTimestamp(),
    });
}

export async function getLatestInPrestitoOrder(): Promise<Order | null> {
    const q = query(
        collection(db, COL),
        where("status", "==", "in_prestito"),
        orderBy("createdAt", "desc"),
        limit(1)
    );

    const snap = await getDocs(q);
    if (snap.empty) return null;

    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as any) } as Order;
}
