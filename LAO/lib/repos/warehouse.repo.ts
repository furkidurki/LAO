import {
    collection,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase/firebase";
import type { WarehouseItem } from "@/lib/models/warehouse";

const WAREHOUSE_COL = "warehouse";
const PIECES_COL = "pieces";

/**
 * Legge tutti gli items in magazzino.
 * Niente orderBy (così non serve index). Ordiniamo in JS.
 */
export function subscribeWarehouseItems(setItems: (x: WarehouseItem[]) => void) {
    const q = query(collection(db, WAREHOUSE_COL));
    return onSnapshot(
        q,
        (snap) => {
            const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as WarehouseItem[];
            arr.sort((a, b) => {
                const m = (a.materialLabel || "").localeCompare(b.materialLabel || "");
                if (m !== 0) return m;
                return (a.serialNumber || "").localeCompare(b.serialNumber || "");
            });
            setItems(arr);
        },
        (err) => {
            console.error("subscribeWarehouseItems error:", err);
            setItems([]);
        }
    );
}

/**
 * Elimina items dal magazzino (selezionati)
 */
export async function deleteWarehouseItems(itemIds: string[]) {
    if (itemIds.length === 0) return;
    const batch = writeBatch(db);

    for (const id of itemIds) {
        batch.delete(doc(db, WAREHOUSE_COL, id));
    }

    await batch.commit();
}

/**
 * Sposta items dal Magazzino -> Prestito:
 * - crea docs in "pieces" con status "in_prestito"
 * - cancella docs in "warehouse"
 *
 * NOTA: NON tocchiamo "serials": seriale resta univoco per sempre.
 */
export async function moveWarehouseItemsToPrestito(params: {
    items: WarehouseItem[];
    clientId: string;
    ragioneSociale: string;
    loanStartMs: number;
}) {
    const { items, clientId, ragioneSociale, loanStartMs } = params;
    if (items.length === 0) return;

    const batch = writeBatch(db);

    for (const it of items) {
        // creo un nuovo pezzo in prestito
        const pRef = doc(collection(db, PIECES_COL));

        // Materiale: lo mettiamo sia su materialName che materialType per sicurezza
        const materialLabel = (it.materialLabel || "Materiale").trim();

        batch.set(pRef, {
            // campi base richiesti dalla UI
            orderId: `warehouse:${it.id}`, // per avere sempre una stringa
            index: 0,

            serialNumber: it.serialNumber,
            serialLower: it.serialLower,

            clientId,
            code: "", // non lo hai in magazzino, lo lasciamo vuoto
            ragioneSociale,

            materialType: materialLabel,
            materialName: materialLabel,

            distributorId: "",
            distributorName: "",

            status: "in_prestito",
            loanStartMs,

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        // rimuovi dal magazzino
        batch.delete(doc(db, WAREHOUSE_COL, it.id));
    }

    await batch.commit();
}
