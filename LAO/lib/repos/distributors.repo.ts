import {db} from "@/lib/firebase/firebase";
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
} from "firebase/firestore";
import type { Distributor } from "@/lib/models/distributor";

const COL = "distributors";

export function subscribeDistributors(
    cb: (items: Distributor[]) => void
) {
    const q = query(collection(db, COL), orderBy("name", "asc"));
    return onSnapshot(q, (snap) => {
        const items: Distributor[] = snap.docs.map((d) => ({
            id: d.id,
            name: d.data().name,
        }));
        cb(items);
    });
}

export async function addDistributor(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    await addDoc(collection(db, COL), {
        name: trimmed,
        createdAt: serverTimestamp(),
    });
}

export async function deleteDistributor(id: string) {
    await deleteDoc(doc(db, COL, id));
}
