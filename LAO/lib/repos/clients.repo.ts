import { db } from "@/lib/firebase/firebase";
import {
    collection,
    endAt,
    getDocs,
    limit,
    orderBy,
    query,
    startAt,
} from "firebase/firestore";
import type { Client } from "@/lib/models/client";

const COL = "clients";

export async function searchClientsByRagione(prefix: string, max = 10) {
    const p = prefix.trim().toLowerCase();
    if (p.length < 3) return [] as Client[];//il ciclo che serve per trovare il cla ragione

    const q = query(
        collection(db, COL),
        orderBy("ragioneLower", "asc"),
        startAt(p),
        endAt(p + "\uf8ff"),
        limit(max)
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Client));
}
