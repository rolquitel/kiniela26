/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  async function signup(email, password, displayName) {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const user = res.user;
    
    // Create user document in Firestore
    const userDoc = {
      uid: user.uid,
      email: user.email,
      displayName: displayName,
      totalPoints: 0,
      isAdmin: false, // Default to false
      createdAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, "users", user.uid), userDoc);
    await updateProfile(user, { displayName });
    
    // Auto-generate quinielas for all existing matches
    await createQuinielaForUser(user.uid);
    
    return user;
  }

  async function createQuinielaForUser(userId) {
    try {
      const matchesSnap = await getDocs(collection(db, "matches"));
      const batch = [];
      matchesSnap.docs.forEach(matchDoc => {
        const quinielaId = `${userId}_${matchDoc.id}`;
        batch.push(setDoc(doc(db, "quinielas", quinielaId), {
          userId: userId,
          matchId: matchDoc.id,
          predictedScoreA: 0,
          predictedScoreB: 0,
          pointsEarned: null,
          updatedAt: new Date().toISOString()
        }));
      });
      await Promise.all(batch);
    } catch (err) {
      console.error("Error creating auto-quiniela:", err);
    }
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    signup,
    login,
    logout,
    createQuinielaForUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
