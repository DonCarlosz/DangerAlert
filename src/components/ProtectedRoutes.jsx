// src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { Icon } from '@iconify/react';

const ProtectedRoutes = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to the auth state
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Finished checking
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // 1. LOADING STATE (Tactical UI)
  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center space-y-4">
        <Icon icon="mdi:radar" className="text-5xl text-red-600 animate-spin" />
        <div className="text-red-500 font-mono text-sm tracking-[0.3em] animate-pulse">
          VERIFYING SECURITY CLEARANCE...
        </div>
      </div>
    );
  }

  // 2. UNAUTHENTICATED -> KICK TO LOGIN
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. AUTHENTICATED -> RENDER PAGE
  return children;
};

export default ProtectedRoutes;