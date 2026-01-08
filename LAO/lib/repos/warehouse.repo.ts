import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    runTransaction,
    serverTimestamp,
    writeBatch,
    limit,
} from "firebase/firestore";

import { db } from "@/lib/firebase/firebase";
import type { WarehouseItem } from "@/lib/models/warehouse";
import type { OrderPiece } from "@/lib/models/piece";

const WAREHOUSE_COL = "warehouse";
const PIECES_COL = "pieces";
const SERIALS_COL = "serials";

function normalizeSerial(input: string) {
    return String(input ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

// Add a single item directly into warehouse
export async function addWarehouseItem(input: { materialLabel: string; serialNumber: string; serialDesc?: string }) {
    const materialLabel = String(input.materialLabel ?? "").trim();
    const serialNumber = String(input.serialNumber ?? "").trim();
    const serialLower = normalizeSerial(serialNumber);
    const serialDesc = String(input.serialDesc ?? "").trim();

    if (!materialLabel) throw new Error("MATERIAL_REQUIRED");
    if (!serialNumber || !serialLower) throw new Error("SERIAL_EMPTY");

    const whRef = doc(collection(db, WAREHOUSE_COL));
    const serialRef = doc(db, SERIALS_COL, serialLower);

    await runTransaction(db, async (tx) => {
        const serialSnap = await tx.get(serialRef);
        if (serialSnap.exists()) throw new Error("SERIAL_EXISTS");

        tx.set(serialRef, {
            serialNumber,
            serialLower,
            warehouseId: whRef.id,
            createdAt: serverTimestamp(),
        });

        tx.set(whRef, {
            materialLabel,
            serialNumber,
            serialLower,
            serialDesc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    });

    return whRef.id;
}

export function subscribeWarehouseItems(setItems: (x: WarehouseItem[]) => void) {
    // LIMIT per non leggere tutta la collection se è enorme
    const q = query(collection(db, WAREHOUSE_COL), limit(2000));
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

// Move items from Prestito to Warehouse
export async function movePiecesToWarehouse(params: { pieces: OrderPiece[]; materialLabelByPieceId: Record<string, string> }) {
    const { pieces, materialLabelByPieceId } = params;
    if (pieces.length === 0) return;

    const batch = writeBatch(db);

    for (const p of pieces) {
        const materialLabel = (materialLabelByPieceId[p.id] || p.materialName || p.materialType || "Materiale").trim();

        const whRef = doc(collection(db, WAREHOUSE_COL));
        batch.set(whRef, {
            materialLabel,
            serialNumber: p.serialNumber,
            serialLower: p.serialLower,
            serialDesc: "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        batch.delete(doc(db, PIECES_COL, p.id));
    }

    await batch.commit();
}

// Delete items from warehouse and free serial locks
export async function deleteWarehouseItems(itemIds: string[]) {
    if (itemIds.length === 0) return;

    const snaps = await Promise.all(itemIds.map((id) => getDoc(doc(db, WAREHOUSE_COL, id))));

    const batch = writeBatch(db);
    for (let i = 0; i < itemIds.length; i++) {
        const id = itemIds[i];
        batch.delete(doc(db, WAREHOUSE_COL, id));

        const data = snaps[i].exists() ? (snaps[i].data() as any) : null;
        const serialLower = data?.serialLower;
        if (serialLower) {
            batch.delete(doc(db, SERIALS_COL, String(serialLower)));
        }
    }
    await batch.commit();
}

// Update serial number and description for a single warehouse item
export async function updateWarehouseSerial(params: {
    warehouseId: string;
    oldSerialLower: string;
    newSerialNumber: string;
    serialDesc: string;
}) {
    const { warehouseId, oldSerialLower, newSerialNumber, serialDesc } = params;

    const clean = String(newSerialNumber ?? "").trim();
    const desc = String(serialDesc ?? "").trim();

    if (!clean) throw new Error("SERIAL_EMPTY");

    const newLower = normalizeSerial(clean);
    if (!newLower) throw new Error("SERIAL_EMPTY");

    const whRef = doc(db, WAREHOUSE_COL, warehouseId);

    if (newLower === oldSerialLower) {
        await runTransaction(db, async (tx) => {
            tx.set(
                whRef,
                {
                    serialNumber: clean,
                    serialLower: newLower,
                    serialDesc: desc,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );

            tx.set(
                doc(db, SERIALS_COL, oldSerialLower),
                {
                    serialNumber: clean,
                    serialLower: newLower,
                    warehouseId,
                    updatedAt: serverTimestamp(),
                },
                { merge: true }
            );
        });
        return;
    }

    const oldSerialRef = doc(db, SERIALS_COL, oldSerialLower);
    const newSerialRef = doc(db, SERIALS_COL, newLower);

    await runTransaction(db, async (tx) => {
        const newSnap = await tx.get(newSerialRef);
        if (newSnap.exists()) throw new Error("SERIAL_EXISTS");

        const oldSnap = await tx.get(oldSerialRef);

        tx.set(newSerialRef, {
            serialNumber: clean,
            serialLower: newLower,
            warehouseId,
            createdAt: serverTimestamp(),
        });

        if (oldSnap.exists()) tx.delete(oldSerialRef);

        tx.set(
            whRef,
            {
                serialNumber: clean,
                serialLower: newLower,
                serialDesc: desc,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    });
}

// Move items from Warehouse to Prestito
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
        const pieceRef = doc(collection(db, PIECES_COL));
        const materialLabel = (it.materialLabel || "Materiale").trim();

        batch.set(pieceRef, {
            id: pieceRef.id,

            orderId: "",
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
