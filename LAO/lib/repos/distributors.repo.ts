import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import type { Distributor } from "@/lib/models/distributor";

const COL = "distributors";

export function subscribeDistributors(
    cb: (items: Distributor[]) => void//funzione arrow
) {
    const q = query(collection(db, COL), orderBy("name", "asc"), limit(2000));
    //^^allora  fa un query dove dentro al db(firestore) crea una colletion chiamata distributors e li ordina
    return onSnapshot(q, (snap) => {//ogni volta che q viene eseguito e questo si attiva e lo aggiunge sul firebase
        const items: Distributor[] = snap.docs.map((d) => ({
            id: d.id,
            name: d.data().name,
        }));
        cb(items);
    });
}

export async function addDistributor(name: string) {
    const value = String(name || "").trim();
    if (!value) throw new Error("Nome vuoto");
    await addDoc(collection(db, COL), { name: value });
}

export async function updateDistributor(id: string, name: string) {
    const value = String(name || "").trim();
    if (!value) throw new Error("Nome vuoto");
    await updateDoc(doc(db, COL, id), { name: value });
}

export async function deleteDistributor(id: string) {
    await deleteDoc(doc(db, COL, id));
}
