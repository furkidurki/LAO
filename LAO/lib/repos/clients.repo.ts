import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import type { Client } from "@/lib/models/client";

const COL = "clients";

export function subscribeClients(setClients: (x: Client[]) => void) {
    const q = query(collection(db, COL), orderBy("ragioneSociale", "asc"), limit(2000));
    return onSnapshot(q, (snap) => {
        const arr: Client[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setClients(arr);
    });
}

export async function addClient(payload: Omit<Client, "id">) {
    await addDoc(collection(db, COL), payload as any);
}

export async function deleteClient(id: string) {
    await deleteDoc(doc(db, COL, id));
}
