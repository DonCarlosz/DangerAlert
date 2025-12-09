// src/components/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

const Login = () => {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        // Register Logic
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await updateProfile(userCredential.user, { displayName: formData.displayName });
      } else {
        // Login Logic
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError("ACCESS_DENIED :: " + err.code.replace('auth/', '').toUpperCase());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-black flex items-center justify-center relative overflow-hidden">
      
      {/* --- BACKGROUND FX --- */}
      {/* Grid Pattern */}
      <div className="absolute inset-0 z-0 opacity-20" 
           style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>
      {/* Moving Scanline */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-cyan-900/10 to-transparent animate-scan pointer-events-none"></div>
      
      {/* --- MAIN INTERFACE CARD --- */}
      <div className="z-10 w-full max-w-md relative group">
        
        {/* Decorative Corner Brackets */}
        <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-cyan-500 transition-all group-hover:w-16 group-hover:h-16"></div>
        <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-cyan-500 transition-all group-hover:w-16 group-hover:h-16"></div>
        <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-cyan-500 transition-all group-hover:w-16 group-hover:h-16"></div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-cyan-500 transition-all group-hover:w-16 group-hover:h-16"></div>

        {/* Card Content */}
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-hidden">
            
            {/* Header */}
            <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-cyan-900/30 rounded-full flex items-center justify-center border border-cyan-500/50 mb-4 animate-pulse">
                    <Icon icon="mdi:radar" className="text-3xl text-cyan-400" />
                </div>
                <h1 className="text-3xl font-black text-white font-mono tracking-tighter">
                    ALERT<span className="text-cyan-500">_OS</span>
                </h1>
                <p className="text-cyan-500/60 text-[10px] font-mono tracking-[0.3em] mt-1">
                    SECURE EMERGENCY UPLINK
                </p>
            </div>

            {/* TABS (Login / Register Toggle) */}
            <div className="flex border-b border-white/10 mb-6">
                <button 
                    type="button"
                    onClick={() => { setIsRegistering(false); setError(''); }}
                    className={`flex-1 py-3 text-sm font-mono font-bold transition-colors border-b-2 ${!isRegistering ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    LOGIN
                </button>
                <button 
                    type="button"
                    onClick={() => { setIsRegistering(true); setError(''); }}
                    className={`flex-1 py-3 text-sm font-mono font-bold transition-colors border-b-2 ${isRegistering ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    REGISTER
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-900/20 border-l-4 border-red-500 text-red-200 p-3 mb-6 text-xs font-mono flex items-start gap-2">
                    <Icon icon="mdi:alert" className="text-base mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {/* FORM */}
            <form onSubmit={handleAuth} className="space-y-5">
                
                {/* Display Name (Register Only) */}
                {isRegistering && (
                    <div className="relative group/input animate-in fade-in slide-in-from-left-4 duration-300">
                        <Icon icon="mdi:badge-account-outline" className="absolute left-3 top-3.5 text-gray-500 group-focus-within/input:text-cyan-400 transition-colors" />
                        <input 
                            type="text" 
                            required={isRegistering}
                            className="w-full bg-black border border-white/20 rounded pl-10 pr-4 py-3 text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                            placeholder="CODENAME / DISPLAY NAME"
                            onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                        />
                    </div>
                )}

                {/* Email */}
                <div className="relative group/input">
                    <Icon icon="mdi:email-outline" className="absolute left-3 top-3.5 text-gray-500 group-focus-within/input:text-cyan-400 transition-colors" />
                    <input 
                        type="email" 
                        required
                        className="w-full bg-black border border-white/20 rounded pl-10 pr-4 py-3 text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                        placeholder="OPERATIVE EMAIL"
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                </div>

                {/* Password */}
                <div className="relative group/input">
                    <Icon icon="mdi:lock-outline" className="absolute left-3 top-3.5 text-gray-500 group-focus-within/input:text-cyan-400 transition-colors" />
                    <input 
                        type="password" 
                        required
                        className="w-full bg-black border border-white/20 rounded pl-10 pr-4 py-3 text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                        placeholder="ACCESS KEY"
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                </div>

                {/* Submit Button */}
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-4 mt-2 bg-gradient-to-r from-cyan-900 to-cyan-700 hover:from-cyan-800 hover:to-cyan-600 text-white font-mono font-bold text-sm tracking-widest border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all flex items-center justify-center gap-2 group/btn"
                >
                    {loading ? (
                        <>
                            <Icon icon="mdi:loading" className="animate-spin" /> ESTABLISHING LINK...
                        </>
                    ) : (
                        <>
                            {isRegistering ? 'INITIALIZE AGENT' : 'AUTHENTICATE'} 
                            <Icon icon="mdi:chevron-right" className="group-hover/btn:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            {/* Footer Status */}
            <div className="mt-8 flex justify-between text-[10px] text-gray-600 font-mono uppercase border-t border-white/5 pt-4">
                <span>Status: <span className="text-green-500 animate-pulse">ONLINE</span></span>
                <span>V.1.0.4 - SECURE</span>
            </div>

        </div>
      </div>
    </div>
  );
};

export default Login;