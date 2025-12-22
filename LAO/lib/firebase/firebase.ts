import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAVfXa_bhPYhTK9JBODPjHZ2tRllms2nmc",
    authDomain: "lawandorder-e0727.firebaseapp.com",
    projectId: "lawandorder-e0727",
    storageBucket: "lawandorder-e0727.firebasestorage.app",
    messagingSenderId: "651342481220",
    appId: "1:651342481220:web:d0ec92b17487e47851f911",
    measurementId: "G-2PJ4QTPD4K",
};

// ✅ SSR-safe init (no window usage)
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ✅ Analytics only on client (optional)
export async function getAnalyticsSafe() {
    if (typeof window === "undefined") return null;

    const { getAnalytics, isSupported } = await import("firebase/analytics");
    const ok = await isSupported();
    if (!ok) return null;

    return getAnalytics(app);
}
