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

export async function ensureUserDoc(uid: string, email?: string) {
    const ref = doc(db, USERS_COL, uid);

    await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) return;

        const data: AppUserDoc = {
            role: "viewer",
            email: email ?? "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        tx.set(ref, data as any);
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
