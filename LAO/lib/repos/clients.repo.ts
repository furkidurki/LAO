import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import type { Client } from "@/lib/models/client";

const COL = "clients";

/**
 * One-shot fetch (NO realtime). This avoids continuous reads from onSnapshot.
 */
export async function fetchClients(opts?: { limitN?: number }) {
    const limitN = opts?.limitN ?? 2000;
    const q = query(collection(db, COL), orderBy("ragioneSociale", "asc"), limit(limitN));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Client[];
}

export async function addClient(payload: Omit<Client, "id">) {
    const ref = await addDoc(collection(db, COL), payload as any);
    return ref.id;
}

/**
 * Batch add for imports (CSV/Excel).
 * Uses Firestore writeBatch in chunks (safe for quotas and speed).
 */
export async function addClientsBatch(payloads: Array<Omit<Client, "id">>) {
    const clean = payloads.filter((p) => {
        const code = String((p as any)?.code ?? "").trim();
        const ragioneSociale = String((p as any)?.ragioneSociale ?? "").trim();
        return !!code && !!ragioneSociale;
    });

    if (clean.length === 0) return [] as string[];

    const ids: string[] = [];

    // Firestore batch limit is 500 ops. We stay below it.
    const CHUNK = 450;

    for (let i = 0; i < clean.length; i += CHUNK) {
        const chunk = clean.slice(i, i + CHUNK);
        const batch = writeBatch(db);

        for (const p of chunk) {
            const ref = doc(collection(db, COL)); // auto-id
            ids.push(ref.id);
            batch.set(ref, p as any);
        }

        await batch.commit();
    }

    return ids;
}

export async function deleteClient(id: string) {
    await deleteDoc(doc(db, COL, id));
}
