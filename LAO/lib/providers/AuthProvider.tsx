import React, { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,//per vedere lo stato del user
    signInWithEmailAndPassword, //funzione di firebase per aggiungere email e passowrd
    createUserWithEmailAndPassword, //per salvarlo su firebase
    signOut,//funzione per la sign out
    sendPasswordResetEmail, //beta (ancora da aggiungere)
    type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/firebase";

type Ctx = {//crea un contex dove richiamo poi tutto nel return (codice piu pulito)
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);//state del user epr vedere quando e loggato o no
    const [loading, setLoading] = useState(true); //loading della pagina

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {//se lo stato del user cambia cambia anche lo stato del loading
            setUser(u);
            setLoading(false);
        });
        return unsub;
    }, []);

    const login = async (email: string, password: string) => {//controlla se esiste questa email e se la pass e corretta
        await signInWithEmailAndPassword(auth, email.trim(), password);
    };

    const register = async (email: string, password: string) => {//crea una email e gli aggiunge la passowrd nel firebase
        await createUserWithEmailAndPassword(auth, email.trim(), password);
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
    if (!ctx) throw new Error("useAuth fuori Provider");//e il use effect che poi usero nel index per richiamre le funzioni
    return ctx;
}
