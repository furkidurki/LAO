//database del inventario
import { db } from "@/lib/firebase/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { CreateInventoryItemInput } from "@/lib/models/inventoryItem";

const COL = "inventory";

export async function addInventoryItem(input: CreateInventoryItemInput) {
    // normalizzo: mai undefined (così non rompi filtri/UI)
    const ref = await addDoc(collection(db, COL), {
        lastClientCode: input.lastClientCode?.trim() ?? "",
        lastClientRagioneSociale: input.lastClientRagioneSociale?.trim() ?? "",
        serialNumber: input.serialNumber?.trim() ?? "",

        materialType: input.materialType,
        description: input.description?.trim() ?? "",
        quantity: input.quantity,

        distributorId: input.distributorId,
        distributorName: input.distributorName,

        unitPrice: input.unitPrice,
        totalPrice: input.totalPrice,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return ref.id;
}
