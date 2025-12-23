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
import type { OrderPiece } from "@/lib/models/piece";

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
            // ordina per materiale poi seriale
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
 * Sposta pezzi da Prestito -> Magazzino:
 * - crea docs in "warehouse" con materialLabel + seriale
 * - cancella i docs in "pieces" (così spariscono da Prestito)
 * NOTA: NON tocchiamo "serials" -> seriale rimane unico per sempre.
 */
export async function movePiecesToWarehouse(params: {
    pieces: OrderPiece[];
    materialLabelByPieceId: Record<string, string>; // per sicurezza, usiamo il label che vedi in UI
}) {
    const { pieces, materialLabelByPieceId } = params;
    if (pieces.length === 0) return;

    const batch = writeBatch(db);

    for (const p of pieces) {
        const materialLabel = (materialLabelByPieceId[p.id] || p.materialName || p.materialType || "Materiale").trim();

        const wRef = doc(collection(db, WAREHOUSE_COL));
        batch.set(wRef, {
            materialLabel,
            serialNumber: p.serialNumber,
            serialLower: p.serialLower,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        // rimuovi il pezzo dal prestito
        batch.delete(doc(db, PIECES_COL, p.id));
    }

    await batch.commit();
}
