// src/App.jsx
import React, { useEffect, useState } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

// Components
import SplashPage from './components/SplashPage';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Crash from './components/Crash';
import ProtectedRoutes from './components/ProtectedRoutes';
import Profile from './components/Profile';


const App = () => {
  // We need a global auth check for the "Public" routes (Splash/Login)
  // to prevent logged-in users from seeing them.
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return null; // Or a simple black screen while app boots

  return (
    <Routes>
      {/* --- PUBLIC ROUTES (Redirect to Dashboard if already logged in) --- */}
      <Route 
        path="/" 
        element={!user ? <SplashPage /> : <Navigate to="/dashboard" replace />} 
      />
      <Route 
        path="/login" 
        element={!user ? <Login /> : <Navigate to="/dashboard" replace />} 
      />

      {/* --- PROTECTED ROUTES (Redirect to Login if NOT logged in) --- */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoutes>
            <Dashboard />
          </ProtectedRoutes>
        } 
      />

      <Route 
        path="/profile" 
        element={
          <ProtectedRoutes>
            <Profile />
          </ProtectedRoutes>
        } 
      />

      {/* --- CATCH ALL --- */}
      <Route path="*" element={<Crash />} />
    </Routes>
  );
}

export default App;