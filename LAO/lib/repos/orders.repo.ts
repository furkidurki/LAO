import {
    addDoc,
    collection,
    doc,
    getDocs,
    limit,
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
    if (raw === "arrivato") return "arrivato";
    if (raw === "venduto") return "venduto";
    if (raw === "in_prestito") return "in_prestito";
    if (raw === "ordinato") return "ordinato";
    return "ordinato";
}

/**
 * Firestore NON accetta undefined (nemmeno dentro array o oggetti annidati).
 * - rimuove le chiavi con value === undefined
 * - dentro gli array converte undefined -> null (per mantenere la lunghezza)
 */
function sanitizeForFirestore<T>(value: T): T {
    const anyVal: any = value as any;

    if (anyVal === undefined) return undefined as any;
    if (anyVal === null) return value;

    if (Array.isArray(anyVal)) {
        return anyVal.map((x) => (x === undefined ? null : sanitizeForFirestore(x))) as any;
    }

    if (typeof anyVal === "object") {
        const out: any = {};
        for (const k of Object.keys(anyVal)) {
            const v = anyVal[k];
            if (v === undefined) continue;
            out[k] = sanitizeForFirestore(v);
        }
        return out;
    }

    return value;
}

export async function addOrder(payload: Omit<Order, "id">) {
    const cleaned = sanitizeForFirestore(payload);

    await addDoc(collection(db, COL), {
        ...(cleaned as any),
        status: normalizeStatus((cleaned as any).status),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export async function deleteOrder(id: string) {
    await deleteDoc(doc(db, COL, id));
}

/**
 * One-shot fetch (NO realtime). This avoids continuous reads from onSnapshot.
 * NOTE: still uses a LIMIT to avoid downloading huge collections by mistake.
 */
export async function fetchOrders(opts?: { limitN?: number }) {
    const limitN = opts?.limitN ?? 500;
    const q = query(collection(db, COL), orderBy("createdAt", "desc"), limit(limitN));
    const snap = await getDocs(q);

    const arr: Order[] = snap.docs.map((d) => {
        const raw = d.data() as any;
        return {
            id: d.id,
            ...raw,
            status: normalizeStatus(raw.status),
        } as Order;
    });

    return arr;
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
    const cleaned = sanitizeForFirestore(patch);

    await updateDoc(doc(db, COL, id), {
        ...(cleaned as any),
        updatedAt: serverTimestamp(),
    });
}
