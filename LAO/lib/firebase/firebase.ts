import { initializeApp, getApp, getApps } from "firebase/app";
import { Platform } from "react-native";
import { getAuth, initializeAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {//dati per collegare il database
    apiKey: "AIzaSyAVfXa_bhPYhTK9JBODPjHZ2tRllms2nmc",
    authDomain: "lawandorder-e0727.firebaseapp.com",
    projectId: "lawandorder-e0727",
    storageBucket: "lawandorder-e0727.firebasestorage.app",
    messagingSenderId: "651342481220",
    appId: "1:651342481220:web:d0ec92b17487e47851f911",
    measurementId: "G-2PJ4QTPD4K",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);


export const db = getFirestore(app);

//  Auth cross-platform
function initAuth() {
    if (Platform.OS === "web") return getAuth(app);

    try {
        const { getReactNativePersistence } = require("firebase/auth/react-native");
        return initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage),
        });
    } catch {
        return getAuth(app);
    }
}

export const auth = initAuth();
