import React, { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/firebase";
import { ensureUserDoc } from "@/lib/repos/users.repo";

type Ctx = {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (
        email: string,
        password: string,
        profile: { firstName: string; lastName: string }
    ) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setLoading(true);
            setUser(u);

            // IMPORTANTISSIMO:
            // Se l'utente è loggato, assicuriamo sempre che esista users/{uid}
            // prima che i Provider facciano letture (rules dipendono da role).
            try {
                if (u) {
                    await ensureUserDoc(u.uid, u.email ?? "");
                }
            } catch (e) {
                console.log("ensureUserDoc (onAuthStateChanged) error:", e);
            } finally {
                setLoading(false);
            }
        });

        return unsub;
    }, []);

    const login = async (email: string, password: string) => {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await ensureUserDoc(cred.user.uid, cred.user.email ?? "");
    };

    const register = async (
        email: string,
        password: string,
        profile: { firstName: string; lastName: string }
    ) => {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await ensureUserDoc(cred.user.uid, cred.user.email ?? "", {
            firstName: profile.firstName,
            lastName: profile.lastName,
        });
    };

    const logout = async () => {
        await signOut(auth);
    };

    const resetPassword = async (email: string) => {
        await sendPasswordResetEmail(auth, email.trim());
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth fuori Provider");
    return ctx;
}
