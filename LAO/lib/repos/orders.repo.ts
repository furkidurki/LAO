import {
    addDoc,
    collection,
    doc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
    deleteDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import type { LoanHistoryItem, Order, OrderStatus } from "@/lib/models/order";

const COL = "orders";

export async function addOrder(payload: Omit<Order, "id" | "createdAt" | "updatedAt">) {
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
        const arr: Order[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
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
    return { id: d.id, ...(d.data() as any) } as Order;
}

// update semplice
export async function updateOrder(id: string, patch: any) {
    await updateDoc(doc(db, COL, id), {
        ...patch,
        updatedAt: serverTimestamp(),
    });
}

//  gestisce start/end prestito e hystori di prestito
export async function updateOrderWithStatusLogic(
    order: Order,
    next: {
        status: OrderStatus;
        clientId: string;
        code: string;
        ragioneSociale: string;
        materialType: string;
        materialName?: string;
        description?: string;
        quantity: number;
        distributorId: string;
        distributorName: string;
        unitPrice: number;
        totalPrice: number;
    }
) {
    const now = Date.now();

    const patch: any = {
        ...next,
    };

    const prevStatus = order.status;
    const nextStatus = next.status;

    // entra in prestito -> salva start
    if (prevStatus !== "in_prestito" && nextStatus === "in_prestito") {
        patch.loanStartMs = now;
    }

    // esce da prestito -> salva history (se start esiste)
    if (prevStatus === "in_prestito" && nextStatus !== "in_prestito") {
        const start = order.loanStartMs ?? now;
        const end = now;
        const days = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));

        const item: LoanHistoryItem = {
            clientId: order.clientId,
            ragioneSociale: order.ragioneSociale,
            code: order.code,
            startMs: start,
            endMs: end,
            days,
        };

        patch.loanStartMs = null;
        patch.loanHistory = [...(order.loanHistory ?? []), item];
    }

    await updateOrder(order.id, patch);
}
