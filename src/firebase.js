import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAE0nLB6Fy4k6zoWuW370ITcAZs-fcrP7E",
  authDomain: "financeapp-71df6.firebaseapp.com",
  projectId: "financeapp-71df6",
  storageBucket: "financeapp-71df6.appspot.com",
  messagingSenderId: "243335103762",
  appId: "1:243335103762:web:f5f437cc8e0d9fe7479fcb",
  measurementId: "G-88DT1MZZKG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, googleProvider, signInWithPopup, signOut, db, collection, addDoc, getDocs, doc, updateDoc, setDoc, getDoc };
