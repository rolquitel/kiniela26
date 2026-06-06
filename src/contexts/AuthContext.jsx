/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import pb from '../pocketbase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  async function signup(email, password, displayName) {
    // 1. Create the user record in PocketBase
    const user = await pb.collection('users').create({
      email: email,
      password: password,
      passwordConfirm: password,
      displayname: displayName,
      name: displayName, // Map to standard 'name' field too
      totalpoints: 0,
      isadmin: false
    });

    // 2. Authenticate the newly created user
    await pb.collection('users').authWithPassword(email, password);

    // 3. Auto-generate quinielas for all existing matches
    await createQuinielaForUser(user.id);

    return user;
  }

  async function createQuinielaForUser(userId) {
    try {
      const matches = await pb.collection('matches').getFullList({
        sort: '+matchnumber'
      });
      const batch = [];
      matches.forEach(match => {
        batch.push(
          pb.collection('quinielas').create({
            userid: userId,
            matchid: match.id,
            predictedscorea: 0,
            predictedscoreb: 0,
            pointsearned: null,
            updatedat: new Date().toISOString()
          })
        );
      });
      await Promise.all(batch);
    } catch (err) {
      console.error("Error creating auto-quiniela:", err);
    }
  }

  function login(email, password) {
    return pb.collection('users').authWithPassword(email, password);
  }

  function logout() {
    pb.authStore.clear();
  }

  useEffect(() => {
    // Initial state setup
    const model = pb.authStore.model;
    if (model) {
      setCurrentUser({
        uid: model.id,
        email: model.email,
        displayName: model.displayname || model.name
      });
      setUserData({
        ...model,
        isAdmin: model.isadmin || false,
        totalPoints: model.totalpoints || 0
      });
    } else {
      setCurrentUser(null);
      setUserData(null);
    }
    setLoading(false);

    // Listen for auth state changes (login, logout, token refresh)
    const unsubscribe = pb.authStore.onChange((token, model) => {
      if (model) {
        setCurrentUser({
          uid: model.id,
          email: model.email,
          displayName: model.displayname || model.name
        });
        setUserData({
          ...model,
          isAdmin: model.isadmin || false,
          totalPoints: model.totalpoints || 0
        });
      } else {
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
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
