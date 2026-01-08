import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppRole, AppUserDoc } from "@/lib/models/user";
import { ensureUserDoc, subscribeMyUserDoc } from "@/lib/repos/users.repo";
import { useAuth } from "@/lib/providers/AuthProvider";

type Ctx = {
    role: AppRole | null;
    loadingRole: boolean;
    me: (AppUserDoc & { id: string }) | null;

    isAdmin: boolean;
    isStaff: boolean;
    isViewer: boolean;

    canEditBaseConfig: boolean; // clienti/materiali/distributori
    canWriteWorkData: boolean;  // ordini/pezzi/magazzino
};

const RoleContext = createContext<Ctx | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const [loadingRole, setLoadingRole] = useState(true);
    const [me, setMe] = useState<(AppUserDoc & { id: string }) | null>(null);
    const [role, setRole] = useState<AppRole | null>(null);

    useEffect(() => {
        if (loading) return;

        if (!user) {
            setMe(null);
            setRole(null);
            setLoadingRole(false);
            return;
        }

        let unsub: null | (() => void) = null;
        let cancelled = false;

        setLoadingRole(true);

        (async () => {
            try {
                await ensureUserDoc(user.uid, user.email ?? "");
            } catch (e) {
                console.log("ensureUserDoc error:", e);
            }

            if (cancelled) return;

            unsub = subscribeMyUserDoc(user.uid, (doc) => {
                setMe(doc);
                setRole(doc?.role ?? "viewer");
                setLoadingRole(false);
            });
        })();

        return () => {
            cancelled = true;
            if (unsub) unsub();
        };
    }, [loading, user?.uid]);

    const computed = useMemo(() => {
        const r = role ?? "viewer";
        const isAdmin = r === "admin";
        const isStaff = r === "staff";
        const isViewer = r === "viewer";

        return {
            isAdmin,
            isStaff,
            isViewer,
            canEditBaseConfig: isAdmin,
            canWriteWorkData: isAdmin || isStaff,
        };
    }, [role]);

    return (
        <RoleContext.Provider
            value={{
                role,
                loadingRole,
                me,
                ...computed,
            }}
        >
            {children}
        </RoleContext.Provider>
    );
}

export function useRole() {
    const ctx = useContext(RoleContext);
    if (!ctx) throw new Error("useRole fuori Provider");
    return ctx;
}
