import {
    addDoc,
    collection,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    startAfter,
    updateDoc,
    where,
    deleteDoc,
    writeBatch,
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
 * Sanitize patch: remove undefined values (Firestore rejects them)
 */
function sanitizeForFirestore(obj: Record<string, any>) {
    const out: Record<string, any> = {};
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (v !== undefined) out[k] = v;
    }
    return out;
}

export async function addOrder(data: Omit<Order, "id">) {
    const cleaned = sanitizeForFirestore(data as any);

    const docRef = await addDoc(collection(db, COL), {
        ...(cleaned as any),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return docRef.id;
}

export async function getOrderByCode(code: string) {
    const q = query(collection(db, COL), where("code", "==", code), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as any) } as Order;
}

export async function deleteOrder(id: string) {
    await deleteDoc(doc(db, COL, id));
}

/**
 * Delete an order AND all linked pieces/serial reservations.
 * This avoids leaving orphan docs in `pieces` and `serials`.
 */
export async function deleteOrderCascade(orderId: string) {
    // Firestore batch limit = 500 operations.
    // A piece may require 2 deletes (piece + serial), so we keep a safe threshold.
    let batch = writeBatch(db);
    let ops = 0;

    async function commitIfNeeded(force: boolean) {
        if (ops === 0) return;
        if (!force && ops < 450) return;
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
    }

    // Paginate pieces to avoid hard limits
    let lastDoc: any = null;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const base = [
            collection(db, "pieces"),
            where("orderId", "==", orderId),
            orderBy("__name__"),
            limit(500),
        ] as const;

        const q = lastDoc ? query(...base, startAfter(lastDoc)) : query(...base);
        // eslint-disable-next-line no-await-in-loop
        const snap = await getDocs(q);

        if (snap.empty) break;

        for (const d of snap.docs) {
            const data = d.data() as any;
            const serialLower = String(data.serialLower ?? "").trim();

            batch.delete(doc(db, "pieces", d.id));
            ops += 1;

            if (serialLower) {
                batch.delete(doc(db, "serials", serialLower));
                ops += 1;
            }

            // eslint-disable-next-line no-await-in-loop
            await commitIfNeeded(false);
        }

        lastDoc = snap.docs[snap.docs.length - 1];
    }

    // delete the order doc last
    batch.delete(doc(db, COL, orderId));
    ops += 1;

    await commitIfNeeded(true);
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
