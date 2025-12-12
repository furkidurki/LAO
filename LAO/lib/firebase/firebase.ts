// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAVfXa_bhPYhTK9JBODPjHZ2tRllms2nmc",
    authDomain: "lawandorder-e0727.firebaseapp.com",
    projectId: "lawandorder-e0727",
    storageBucket: "lawandorder-e0727.firebasestorage.app",
    messagingSenderId: "651342481220",
    appId: "1:651342481220:web:d0ec92b17487e47851f911",
    measurementId: "G-2PJ4QTPD4K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);