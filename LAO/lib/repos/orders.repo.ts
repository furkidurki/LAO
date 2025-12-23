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
    deleteDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase/firebase";
import type { Order, OrderStatus } from "@/lib/models/order";

const COL = "orders";

// migrazione soft: se nel DB ci sono vecchi stati, li mappiamo
function normalizeStatus(raw: any): OrderStatus {
    if (raw === "in_consegna") return "ordinato";
    if (raw === "magazzino") return "arrivato";
    if (raw === "arrivato") return "arrivato";
    if (raw === "venduto") return "venduto";
    if (raw === "in_prestito") return "in_prestito";
    if (raw === "ordinato") return "ordinato";
    return "ordinato";
}

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
        const arr: Order[] = snap.docs.map((d) => {
            const raw = d.data() as any;
            return {
                id: d.id,
                ...raw,
                status: normalizeStatus(raw.status),
            } as Order;
        });
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

export async function updateOrder(id: string, patch: Record<string, any>) {
    // IMPORTANT: non passare mai undefined a Firestore
    const cleaned: Record<string, any> = {};
    for (const k of Object.keys(patch)) {
        const v = (patch as any)[k];
        if (v !== undefined) cleaned[k] = v;
    }

    await updateDoc(doc(db, COL, id), {
        ...cleaned,
        updatedAt: serverTimestamp(),
    });
}
