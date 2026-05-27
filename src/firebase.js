import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJ34Bio8nY-My2Ut0tpJDMG7jpvszh0_c",
  authDomain: "kiniela-2026-11a1a.firebaseapp.com",
  projectId: "kiniela-2026-11a1a",
  storageBucket: "kiniela-2026-11a1a.firebasestorage.app",
  messagingSenderId: "80188117819",
  appId: "1:80188117819:web:2f20ff4258146ab1295d1e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
