import React, { createContext, useContext, useMemo } from "react";

type Ctx = {
    role: "user";
    loadingRole: boolean;

    isAdmin: boolean;
    isStaff: boolean;
    isViewer: boolean;

    canEditBaseConfig: boolean;
    canWriteWorkData: boolean;
};

const DEFAULT: Ctx = {
    role: "user",
    loadingRole: false,

    isAdmin: false,
    isStaff: false,
    isViewer: false,

    // Everyone can do everything
    canEditBaseConfig: true,
    canWriteWorkData: true,
};

const RoleContext = createContext<Ctx>(DEFAULT);

export function RoleProvider({ children }: { children: React.ReactNode }) {
    const value = useMemo(() => DEFAULT, []);
    return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
    return useContext(RoleContext);
}
