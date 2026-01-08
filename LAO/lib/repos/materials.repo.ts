import { db } from "@/lib/firebase/firebase";
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    limit,
} from "firebase/firestore";
import type { material } from "@/lib/models/materials";

const COL = "materials";

export function subscribeMaterials(cb: (items: material[]) => void) {
    const q = query(collection(db, COL), orderBy("name", "asc"), limit(2000));
    return onSnapshot(q, (snap) => {
        const items: material[] = snap.docs.map((d) => ({
            id: d.id,
            name: d.data().name,
        }));
        cb(items);
    });
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
