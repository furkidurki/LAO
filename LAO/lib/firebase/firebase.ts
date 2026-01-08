import { initializeApp, getApp, getApps } from "firebase/app";
import { Platform } from "react-native";
import { getAuth, initializeAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAsazMqgJwNLf7MSAM3rwq-Y1rY76TF6Kc",
    authDomain: "laoimprims.firebaseapp.com",
    projectId: "laoimprims",
    storageBucket: "laoimprims.firebasestorage.app",
    messagingSenderId: "664628078140",
    appId: "1:664628078140:web:8ec61a7e090252c9ff0539",
    measurementId: "G-24CH4DBHSR"
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
