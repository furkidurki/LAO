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


//Sposta pezzi da Prestito -> Magazzino:
//crea docs in "warehouse"
export async function movePiecesToWarehouse(params: {
    pieces: OrderPiece[];
    materialLabelByPieceId: Record<string, string>;
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

        batch.delete(doc(db, PIECES_COL, p.id));
    }

    await batch.commit();
}

//Elimina items dal magazzino
export async function deleteWarehouseItems(itemIds: string[]) {
    if (itemIds.length === 0) return;

    const batch = writeBatch(db);
    for (const id of itemIds) {
        batch.delete(doc(db, WAREHOUSE_COL, id));
    }
    await batch.commit();
}


//Sposta items dal Magazzino -> Prestito:
//cancella docs in "warehouse"
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
        const pRef = doc(collection(db, PIECES_COL));
        const materialLabel = (it.materialLabel || "Materiale").trim();

        batch.set(pRef, {
            orderId: `warehouse:${it.id}`,
            index: 0,

            serialNumber: it.serialNumber,
            serialLower: it.serialLower,

            clientId,
            code: "",
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

        batch.delete(doc(db, WAREHOUSE_COL, it.id));
    }

    await batch.commit();
}
