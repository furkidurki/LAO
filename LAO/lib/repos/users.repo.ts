import {
    collection,
    doc,
    limit,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import type { AppRole, AppUserDoc } from "@/lib/models/user";

const USERS_COL = "users";

export async function ensureUserDoc(
    uid: string,
    email?: string,
    profile?: { firstName?: string; lastName?: string }
) {
    const ref = doc(db, USERS_COL, uid);

    await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        const firstName = profile?.firstName?.trim();
        const lastName = profile?.lastName?.trim();

        if (!snap.exists()) {
            const data: AppUserDoc = {
                role: "viewer",
                email: email ?? "",
                firstName: firstName ?? "",
                lastName: lastName ?? "",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            tx.set(ref, data as any);
            return;
        }

        // Se il doc esiste già, non sovrascrivo: però se mi arrivano nome/cognome
        // e sul doc mancano (o sono vuoti), li riempio.
        const existing = snap.data() as any;
        const patch: Partial<AppUserDoc> = {};

        if (email && !existing?.email) patch.email = email;
        if (firstName && (!existing?.firstName || String(existing.firstName).trim() === "")) patch.firstName = firstName;
        if (lastName && (!existing?.lastName || String(existing.lastName).trim() === "")) patch.lastName = lastName;

        if (Object.keys(patch).length > 0) {
            tx.update(ref, {
                ...patch,
                updatedAt: serverTimestamp(),
            } as any);
        }
    });
}

export function subscribeMyUserDoc(uid: string, cb: (doc: (AppUserDoc & { id: string }) | null) => void) {
    const ref = doc(db, USERS_COL, uid);
    return onSnapshot(
        ref,
        (snap) => {
            if (!snap.exists()) return cb(null);
            cb({ id: snap.id, ...(snap.data() as any) });
        },
        (err) => {
            console.log("subscribeMyUserDoc error:", err);
            cb(null);
        }
    );
}

export function subscribeAllUsers(cb: (users: Array<AppUserDoc & { id: string }>) => void) {
    const q = query(collection(db, USERS_COL), orderBy("email", "asc"), limit(500));
    return onSnapshot(
        q,
        (snap) => {
            const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Array<AppUserDoc & { id: string }>;
            cb(arr);
        },
        (err) => {
            console.log("subscribeAllUsers error:", err);
            cb([]);
        }
    );
}

export async function setUserRole(targetUid: string, role: AppRole) {
    await updateDoc(doc(db, USERS_COL, targetUid), {
        role,
        updatedAt: serverTimestamp(),
    });
}
