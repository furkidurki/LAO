// lib/providers/RoleProvider.tsx
import React, { createContext, useContext, useMemo } from "react";

export type AppRole = "user";

export type RoleState = {
    role: AppRole;
    isLoading: boolean;

    // If your UI uses these flags, keep them always true so everyone can do everything.
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canManage: boolean;
};

const DEFAULT_ROLE_STATE: RoleState = {
    role: "user",
    isLoading: false,
    canRead: true,
    canWrite: true,
    canDelete: true,
    canManage: true,
};

const RoleContext = createContext<RoleState>(DEFAULT_ROLE_STATE);

export function RoleProvider({ children }: { children: React.ReactNode }) {
    // No Firestore, no async. Everyone has full permissions.
    const value = useMemo(() => DEFAULT_ROLE_STATE, []);
    return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

// Important: never throw. Even if used outside a provider, it returns defaults.
export function useRole(): RoleState {
    return useContext(RoleContext);
}
