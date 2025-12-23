import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
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

/**
 * ✅ Controllo locale: niente seriali vuoti e niente duplicati dentro lo stesso salvataggio
 * (anche se uno scrive con spazi / maiuscole diverse)
 */
export function validateSerialListLocalOrThrow(serialNumbers: string[]) {
    const cleaned = serialNumbers.map((s) => String(s ?? "").trim());
    if (cleaned.some((s) => !s)) throw new Error("SERIAL_EMPTY");

    const lowers = cleaned.map((s) => normalizeSerial(s));
    if (lowers.some((s) => !s)) throw new Error("SERIAL_EMPTY");

    const seen = new Set<string>();
    for (const k of lowers) {
        if (seen.has(k)) throw new Error("SERIAL_DUPLICATE_LOCAL");
        seen.add(k);
    }

    return { cleaned, lowers };
}

/**
 * ✅ Controllo DB (prima del salvataggio): ritorna serialLower che esistono già
 * Non è “atomico” (quello lo fa la transaction), ma serve per dare errore subito in UI.
 */
export async function findExistingSerials(serialNumbers: string[]) {
    const { lowers } = validateSerialListLocalOrThrow(serialNumbers);

    const snaps = await Promise.all(lowers.map((k) => getDoc(doc(db, SERIALS_COL, k))));
    const existing: string[] = [];
    for (let i = 0; i < snaps.length; i++) {
        if (snaps[i].exists()) existing.push(lowers[i]);
    }
    return existing;
}

export function subscribePiecesForOrder(orderId: string, setPieces: (x: OrderPiece[]) => void) {
    const q = query(collection(db, PIECES_COL), where("orderId", "==", orderId));

    return onSnapshot(
        q,
        (snap) => {
            const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrderPiece[];
            arr.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
            setPieces(arr);
        },
        (err) => {
            console.error("subscribePiecesForOrder error:", err);
            setPieces([]);
        }
    );
}

export function subscribePiecesByStatus(status: PieceStatus, setPieces: (x: OrderPiece[]) => void) {
    const q = query(collection(db, PIECES_COL), where("status", "==", status));

    return onSnapshot(
        q,
        (snap) => {
            const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as OrderPiece[];
            arr.sort((a, b) => {
                const c = (a.ragioneSociale || "").localeCompare(b.ragioneSociale || "");
                if (c !== 0) return c;
                const ma = (a.materialName && a.materialName.trim()) ? a.materialName : a.materialType;
                const mb = (b.materialName && b.materialName.trim()) ? b.materialName : b.materialType;
                const m = (ma || "").localeCompare(mb || "");
                if (m !== 0) return m;
                return (a.serialNumber || "").localeCompare(b.serialNumber || "");
            });
            setPieces(arr);
        },
        (err) => {
            console.error("subscribePiecesByStatus error:", err);
            setPieces([]);
        }
    );
}

/**
 * ✅ SALVA TUTTI I PEZZI INSIEME (ATOMICO)
 * - controlla duplicati locali
 * - controlla unicità su Firestore via transaction
 */
export async function createPiecesBatchUniqueAtomic(params: {
    order: Order;
    serialNumbers: string[];
    status: PieceStatus;
    loanStartMs?: number;
}) {
    const { order, serialNumbers, status, loanStartMs } = params;

    if (serialNumbers.length !== order.quantity) throw new Error("SERIAL_COUNT_MISMATCH");

    if (status === "in_prestito") {
        if (!loanStartMs || !Number.isFinite(loanStartMs)) throw new Error("LOAN_START_REQUIRED");
    }

    const { cleaned, lowers } = validateSerialListLocalOrThrow(serialNumbers);

    const pieceRefs = lowers.map(() => doc(collection(db, PIECES_COL)));
    const serialRefs = lowers.map((k) => doc(db, SERIALS_COL, k));

    await runTransaction(db, async (tx) => {
        // check: seriali già esistenti?
        for (const sref of serialRefs) {
            const snap = await tx.get(sref);
            if (snap.exists()) throw new Error("SERIAL_EXISTS");
        }

        // crea serials + pieces
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

            const pieceData: OrderPiece = {
                id: pieceRef.id,

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

                ...(status === "in_prestito" ? { loanStartMs } : {}),

                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            // su firestore non serve id dentro, ma non fa male (comunque usi "any" spesso)
            tx.set(pieceRef, pieceData as any);
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

/**
 * ✅ MODIFICA SERIALE
 * - controlla che il nuovo seriale sia univoco
 * - aggiorna anche la collection serials (sposta da old -> new)
 */
export async function updatePieceSerial(params: {
    pieceId: string;
    orderId: string;
    oldSerialLower: string;
    newSerialNumber: string;
}) {
    const { pieceId, orderId, oldSerialLower, newSerialNumber } = params;

    const clean = newSerialNumber.trim();
    if (!clean) throw new Error("SERIAL_EMPTY");

    const newLower = normalizeSerial(clean);
    if (!newLower) throw new Error("SERIAL_EMPTY");

    const pieceRef = doc(db, PIECES_COL, pieceId);

    // stesso seriale (solo formato diverso): aggiorna sia piece che serials (merge)
    if (newLower === oldSerialLower) {
        await runTransaction(db, async (tx) => {
            tx.update(pieceRef, {
                serialNumber: clean,
                serialLower: newLower,
                updatedAt: serverTimestamp(),
            });

            tx.set(
                doc(db, SERIALS_COL, oldSerialLower),
                { serialNumber: clean, serialLower: newLower, pieceId, orderId, updatedAt: serverTimestamp() },
                { merge: true }
            );
        });
        return;
    }

    const oldSerialRef = doc(db, SERIALS_COL, oldSerialLower);
    const newSerialRef = doc(db, SERIALS_COL, newLower);

    await runTransaction(db, async (tx) => {
        // nuovo seriale libero?
        const newSnap = await tx.get(newSerialRef);
        if (newSnap.exists()) throw new Error("SERIAL_EXISTS");

        // vecchio registro (se esiste lo cancelliamo)
        const oldSnap = await tx.get(oldSerialRef);

        // crea nuovo registro
        tx.set(newSerialRef, {
            serialNumber: clean,
            serialLower: newLower,
            pieceId,
            orderId,
            createdAt: serverTimestamp(),
        });

        // cancella vecchio registro
        if (oldSnap.exists()) {
            tx.delete(oldSerialRef);
        }

        // aggiorna piece
        tx.update(pieceRef, {
            serialNumber: clean,
            serialLower: newLower,
            updatedAt: serverTimestamp(),
        });
    });
}

/**
 * ELIMINA PEZZO + libera il seriale
 */
export async function deletePieceAndSerial(params: { pieceId: string; serialLower: string }) {
    const { pieceId, serialLower } = params;

    const pieceRef = doc(db, PIECES_COL, pieceId);
    const serialRef = doc(db, SERIALS_COL, serialLower);

    await runTransaction(db, async (tx) => {
        tx.delete(pieceRef);
        tx.delete(serialRef);
    });
}

export async function deletePieceOnly(pieceId: string) {
    await deleteDoc(doc(db, "pieces", pieceId));
}
