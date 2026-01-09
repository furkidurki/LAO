import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query } from "firebase/firestore";
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
    await addDoc(collection(db, COL), payload as any);
}

export async function deleteClient(id: string) {
    await deleteDoc(doc(db, COL, id));
}
