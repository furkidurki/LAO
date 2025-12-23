import {
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase/firebase";
import type { Order } from "@/lib/models/order";
import type { OrderPiece, PieceStatus } from "@/lib/models/piece";

const PIECES_COL = "pieces";
const SERIALS_COL = "serials";

export function normalizeSerial(input: string) {
    // normalizzazione semplice: trim + lower + rimuovi spazi
    return input.trim().toLowerCase().replace(/\s+/g, "");
}

export function subscribePiecesForOrder(orderId: string, setPieces: (x: OrderPiece[]) => void) {
    const q = query(
        collection(db, PIECES_COL),
        where("orderId", "==", orderId),
        orderBy("index", "asc")
    );

    return onSnapshot(q, (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrderPiece[];
        setPieces(arr);
    });
}

/**
 * Crea 1 pezzo + blocca seriale in modo univoco globale.
 * Unicità: docId = serialLower in SERIALS_COL
 */
export async function createPieceWithUniqueSerial(params: {
    order: Order;
    index: number;
    serialNumber: string;
}) {
    const { order, index, serialNumber } = params;

    const clean = serialNumber.trim();
    if (!clean) throw new Error("SERIAL_EMPTY");

    const serialLower = normalizeSerial(clean);
    if (!serialLower) throw new Error("SERIAL_EMPTY");

    const serialRef = doc(db, SERIALS_COL, serialLower);
    const pieceRef = doc(collection(db, PIECES_COL)); // auto id

    await runTransaction(db, async (tx) => {
        const serialSnap = await tx.get(serialRef);
        if (serialSnap.exists()) {
            throw new Error("SERIAL_EXISTS");
        }

        // registro seriale: non lo cancelliamo (così resta univoco per sempre)
        tx.set(serialRef, {
            serialNumber: clean,
            serialLower,
            pieceId: pieceRef.id,
            orderId: order.id,
            createdAt: serverTimestamp(),
        });

        tx.set(pieceRef, {
            orderId: order.id,
            index,

            serialNumber: clean,
            serialLower,

            clientId: order.clientId,
            code: order.code,
            ragioneSociale: order.ragioneSociale,

            materialType: order.materialType,
            materialName: order.materialName ?? "",

            distributorId: order.distributorId,
            distributorName: order.distributorName,

            status: "arrivato" as PieceStatus,

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    });

    return pieceRef.id;
}

export async function deletePiece(pieceId: string) {
    // NOTA: non cancelliamo serials/{serialLower} per mantenere unicità globale “per sempre”.
    await deleteDoc(doc(db, PIECES_COL, pieceId));
}

export async function setPiecesStatus(pieceIds: string[], status: PieceStatus) {
    const batch = writeBatch(db);
    for (const id of pieceIds) {
        batch.update(doc(db, PIECES_COL, id), { status, updatedAt: serverTimestamp() });
    }
    await batch.commit();
}

export async function updatePieceSerial_NOT_ALLOWED() {
    // Scelta intenzionale: per cambiare un seriale → elimina pezzo e ricrealo,
    // così mantieni la regola “seriale univoco e immutabile”.
}
