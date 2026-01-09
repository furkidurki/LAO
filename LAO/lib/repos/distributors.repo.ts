import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import type { Distributor } from "@/lib/models/distributor";

const COL = "distributors";

/**
 * One-shot fetch (NO realtime). This avoids continuous reads from onSnapshot.
 */
export async function fetchDistributors(opts?: { limitN?: number }) {
    const limitN = opts?.limitN ?? 2000;
    const q = query(collection(db, COL), orderBy("name", "asc"), limit(limitN));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Distributor[];
}

export async function addDistributor(name: string) {
    const value = String(name || "").trim();
    if (!value) throw new Error("Nome vuoto");
    const ref = await addDoc(collection(db, COL), { name: value });
    return ref.id;
}

export async function updateDistributor(id: string, name: string) {
    const value = String(name || "").trim();
    if (!value) throw new Error("Nome vuoto");
    await updateDoc(doc(db, COL, id), { name: value });
}

export async function deleteDistributor(id: string) {
    await deleteDoc(doc(db, COL, id));
}
