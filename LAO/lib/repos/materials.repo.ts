import { db } from "@/lib/firebase/firebase";
import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import type { material } from "@/lib/models/materials";

const COL = "materials";

/**
 * One-shot fetch (NO realtime). This avoids continuous reads from onSnapshot.
 */
export async function fetchMaterials(opts?: { limitN?: number }) {
    const limitN = opts?.limitN ?? 2000;
    const q = query(collection(db, COL), orderBy("name", "asc"), limit(limitN));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as material[];
}

export async function addMaterials(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    await addDoc(collection(db, COL), {
        name: trimmed,
        createdAt: serverTimestamp(),
    });
}

export async function deleteMaterials(id: string) {
    await deleteDoc(doc(db, COL, id));
}
