//database del inventario
import { db } from "@/lib/firebase/firebase";
import {
    addDoc,
    collection,
    serverTimestamp,
} from "firebase/firestore";
import type { CreateInventoryItemInput } from "@/lib/models/inventoryItem";

const COL = "inventory";

export async function addInventoryItem(input: CreateInventoryItemInput) {
    const ref = await addDoc(collection(db, COL), {
        ...input,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}
