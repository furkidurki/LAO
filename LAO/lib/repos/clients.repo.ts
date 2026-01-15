import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    setDoc,
    where,
    writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import type { Client } from "@/lib/models/client";

const COL = "clients";

function codeToDocId(code: string) {
    // Firestore doc IDs cannot contain '/'. Keep it stable and safe.
    const raw = String(code ?? "").trim();
    const safe = raw
        .replace(/\s+/g, "")
        .replace(/[\/\\#?]/g, "_")
        .slice(0, 180);
    return `code_${safe.toLowerCase()}`;
}

async function findClientIdByCode(code: string) {
    const c = String(code ?? "").trim();
    if (!c) return null;
    const q = query(collection(db, COL), where("code", "==", c), limit(1));
    const snap = await getDocs(q);
    return snap.docs[0]?.id ?? null;
}

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
    const code = String((payload as any)?.code ?? "").trim();
    const ragioneSociale = String((payload as any)?.ragioneSociale ?? "").trim();
    if (!code || !ragioneSociale) throw new Error("Dati cliente non validi");

    // Try to reuse an existing doc if the same code already exists.
    const existingId = await findClientIdByCode(code);
    if (existingId) {
        await setDoc(doc(db, COL, existingId), { code, ragioneSociale } as any, { merge: true });
        return existingId;
    }

    // Otherwise create a stable id from code (prevents duplicates on repeated imports).
    const id = codeToDocId(code);
    await setDoc(doc(db, COL, id), { code, ragioneSociale } as any, { merge: true });
    return id;
}

/**
 * Batch add for imports (CSV/Excel).
 * Uses Firestore writeBatch in chunks (safe for quotas and speed).
 * Uses stable docId derived from code -> avoids duplicates on repeated imports.
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
            const code = String((p as any)?.code ?? "").trim();
            const id = codeToDocId(code);
            ids.push(id);
            const ref = doc(db, COL, id);
            batch.set(ref, p as any, { merge: true } as any);
        }

        await batch.commit();
    }

    return ids;
}

export async function deleteClient(id: string) {
    await deleteDoc(doc(db, COL, id));
}
