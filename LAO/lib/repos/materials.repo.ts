import {db} from "@/lib/firebase/firebase";
import {
    collection, //permette di aggiungere la colletion quindi per fare le cose sotto
    addDoc,//aggiungere un documento dentro nella colletion
    deleteDoc, //cancellare un documento nella colection
    doc, //per prendere un documento specifico
    onSnapshot,
    orderBy,//serve per ordinare in un modo desc o asc
    query,
    serverTimestamp,//prendere ore e date dal server
} from "firebase/firestore";
import type { material } from "@/lib/models/materials";

const COL = "materials";//cosi non devo ripetere distributors ogni volta

export function subscribeMaterials(
    cb: (items: material[]) => void//funzione arrow
) {
    const q = query(collection(db, COL), orderBy("name", "asc"));
    //^^allora  fa un query dove dentro al db(firestore) crea una colletion chiamata distributors e li ordina
    return onSnapshot(q, (snap) => {//ogni volta che q viene eseguito e questo si attiva e lo aggiunge sul firebase
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
