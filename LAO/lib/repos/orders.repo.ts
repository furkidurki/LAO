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

/**
 * Firestore NON accetta undefined (nemmeno dentro array o oggetti annidati).
 * - rimuove le chiavi con value === undefined
 * - dentro gli array converte undefined -> null (per mantenere la lunghezza)
 */
function sanitizeForFirestore<T>(value: T): T {
    const anyVal: any = value as any;

    if (anyVal === undefined) return undefined as any;
    if (anyVal === null) return null as any;

    if (Array.isArray(anyVal)) {
        return anyVal.map((x) => {
            const v = sanitizeForFirestore(x);
            return v === undefined ? null : v;
        }) as any;
    }

    if (typeof anyVal === "object") {
        const out: Record<string, any> = {};
        for (const k of Object.keys(anyVal)) {
            const v = sanitizeForFirestore(anyVal[k]);
            if (v !== undefined) out[k] = v;
        }
        return out as any;
    }

    return anyVal;
}

export async function addOrder(payload: Omit<Order, "id" | "createdAt" | "updatedAt">) {
    const data = sanitizeForFirestore({
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, COL), data as any);
}

export async function deleteOrder(id: string) {
    await deleteDoc(doc(db, COL, id));
}

export function subscribeOrders(setOrders: (x: Order[]) => void) {
    // LIMIT per non scaricare migliaia di ordini in realtime
    const q = query(collection(db, COL), orderBy("createdAt", "desc"), limit(500));
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
    const cleaned = sanitizeForFirestore(patch);

    await updateDoc(doc(db, COL, id), {
        ...(cleaned as any),
        updatedAt: serverTimestamp(),
    });
}
