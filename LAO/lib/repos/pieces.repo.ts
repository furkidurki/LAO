import {
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/firebase";
import type { Order } from "@/lib/models/order";
import type { OrderPiece, PieceStatus } from "@/lib/models/piece";

const PIECES_COL = "pieces";
const SERIALS_COL = "serials";

export function normalizeSerial(input: string) {
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

export function subscribePiecesByStatus(status: PieceStatus, setPieces: (x: OrderPiece[]) => void) {
    const q = query(
        collection(db, PIECES_COL),
        where("status", "==", status),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrderPiece[];
        setPieces(arr);
    });
}

/**
 * SALVA TUTTI I PEZZI INSIEME (ATOMICO)
 * - serialNumbers deve avere length = order.quantity
 * - seriale univoco globale usando serials/{serialLower}
 * - se un solo seriale esiste già -> fallisce tutto (nessun pezzo creato)
 */
export async function createPiecesBatchUniqueAtomic(params: {
    order: Order;
    serialNumbers: string[];
    status: PieceStatus;       // "venduto" | "in_prestito"
    loanStartMs?: number;      // obbligatorio se in_prestito
}) {
    const { order, serialNumbers, status, loanStartMs } = params;

    if (serialNumbers.length !== order.quantity) {
        throw new Error("SERIAL_COUNT_MISMATCH");
    }

    if (status === "in_prestito") {
        if (!loanStartMs || !Number.isFinite(loanStartMs)) {
            throw new Error("LOAN_START_REQUIRED");
        }
    }

    // valida + normalizza + controlla duplicati locali
    const cleaned = serialNumbers.map((s) => s.trim());
    if (cleaned.some((s) => !s)) throw new Error("SERIAL_EMPTY");

    const lowers = cleaned.map((s) => normalizeSerial(s));
    if (lowers.some((s) => !s)) throw new Error("SERIAL_EMPTY");

    const seen = new Set<string>();
    for (const k of lowers) {
        if (seen.has(k)) throw new Error("SERIAL_DUPLICATE_LOCAL");
        seen.add(k);
    }

    // pre-creo le ref dei pezzi (id stabili)
    const pieceRefs = lowers.map(() => doc(collection(db, PIECES_COL)));
    const serialRefs = lowers.map((k) => doc(db, SERIALS_COL, k));

    await runTransaction(db, async (tx) => {
        // 1) controlla se qualche seriale esiste già
        for (const sref of serialRefs) {
            const snap = await tx.get(sref);
            if (snap.exists()) throw new Error("SERIAL_EXISTS");
        }

        // 2) crea serial registry + pezzi
        for (let i = 0; i < cleaned.length; i++) {
            const serialNumber = cleaned[i];
            const serialLower = lowers[i];
            const pieceRef = pieceRefs[i];
            const serialRef = serialRefs[i];

            tx.set(serialRef, {
                serialNumber,
                serialLower,
                pieceId: pieceRef.id,
                orderId: order.id,
                createdAt: serverTimestamp(),
            });

            const pieceData: any = {
                orderId: order.id,
                index: i,

                serialNumber,
                serialLower,

                clientId: order.clientId,
                code: order.code,
                ragioneSociale: order.ragioneSociale,

                materialType: order.materialType,
                materialName: order.materialName ?? "",

                distributorId: order.distributorId,
                distributorName: order.distributorName,

                status,

                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            if (status === "in_prestito") {
                pieceData.loanStartMs = loanStartMs;
            }

            tx.set(pieceRef, pieceData);
        }
    });

    return pieceRefs.map((r) => r.id);
}

export async function updatePieceStatus(pieceId: string, status: PieceStatus) {
    await updateDoc(doc(db, PIECES_COL, pieceId), {
        status,
        updatedAt: serverTimestamp(),
    });
}
