import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const SplashPage = () => {
  const navigate = useNavigate();
  const [loadingDots, setLoadingDots] = useState('');

  useEffect(() => {
    // Animation for "..."
    const interval = setInterval(() => {
      setLoadingDots(p => p.length < 3 ? p + '.' : '');
    }, 500);

    // Check Auth State after a "boot up" delay
    const timer = setTimeout(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      });
      return () => unsubscribe();
    }, 3500); // 3.5s dramatic delay

    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [navigate]);

  return (
    <div className="h-screen w-screen bg-[#0a0f1c] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Radar Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
         <div className="absolute w-96 h-96 border-2 border-red-500/40 rounded-full animate-ping"></div>
         <div className="absolute w-80 h-80 border-2 border-red-500/60 rounded-full animate-ping delay-500ms"></div>
         <div className="absolute w-64 h-64 border border-red-500/80 rounded-full animate-ping delay-1000ms"></div>
      </div>

      {/* Center Icon */}
      <div className="z-10 relative mb-8">
         <div className="absolute inset-0 border-t-2 border-r-2 border-red-900/50 rounded-full animate-spin-slow scale-150"></div>
         <Icon icon="mdi:broadcast" className="text-7xl text-red-600 animate-pulse-glow" />
      </div>
     
      <h1 className="text-white font-mono text-3xl tracking-[0.5em] font-bold z-10">
        ALERT<span className="text-red-600">OS</span>
      </h1>

      <p className="absolute bottom-12 text-gray-500 font-mono text-xs tracking-widest animate-pulse">
        ESTABLISHING SECURE UPLINK{loadingDots}
      </p>
    </div>
  );
};

export default SplashPage;