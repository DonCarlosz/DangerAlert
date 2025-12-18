// src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { auth, db } from '../firebase';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile, 
    onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; 

const Login = () => {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) navigate('/dashboard', { replace: true }); 
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // --- 1. FRONTEND SECURITY VALIDATION ---
    
    // A. Password Length Check
    if (formData.password.length < 6) {
        setError("SECURITY ALERT: ACCESS KEY TOO SHORT (MIN 6 CHARS)");
        setLoading(false);
        return;
    }

    // B. Agent Name Length Check (Only during registration)
    if (isRegistering) {
        const nameLen = formData.displayName.trim().length;
        if (nameLen < 4) {
            setError("SECURITY ALERT: AGENT NAME MUST BE >= 4 CHARS");
            setLoading(false);
            return;
        }
    }

    try {
      if (isRegistering) {
        // 1. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        // 2. Update Profile Name
        await updateProfile(user, { displayName: formData.displayName });

        // 3. Save to Database
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email.toLowerCase(),
            fullName: formData.displayName,
            phoneNumber: "", 
            roster: []       
        });

      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      }
      navigate('/dashboard', { replace: true }); 
    } catch (err) {
      console.error(err);
      let msg = "ACCESS DENIED";
      if (err.code === 'auth/weak-password') msg = "WEAK KEY: USE 6+ CHARACTERS";
      else if (err.code === 'auth/email-already-in-use') msg = "EMAIL ALREADY ACTIVE";
      else if (err.code === 'auth/invalid-credential') msg = "INVALID CREDENTIALS";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-black flex items-center justify-center relative overflow-hidden">
      
      {/* Background FX */}
      <div className="absolute inset-0 z-0 opacity-20" 
           style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-red-900/20 to-transparent animate-scan pointer-events-none"></div>
      
      {/* Main Card */}
      <div className="z-10 w-full max-w-md relative group">
        
        {/* Corners */}
        <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-red-600 transition-all group-hover:w-16 group-hover:h-16"></div>
        <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-red-600 transition-all group-hover:w-16 group-hover:h-16"></div>
        <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-red-600 transition-all group-hover:w-16 group-hover:h-16"></div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-red-600 transition-all group-hover:w-16 group-hover:h-16"></div>

        <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-8 shadow-[0_0_50px_rgba(220,38,38,0.2)] relative overflow-hidden">
            
            <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center border border-red-500/50 mb-4 animate-pulse">
                    <Icon icon="mdi:radar" className="text-3xl text-red-500" />
                </div>
                <h1 className="text-3xl font-black text-white font-mono tracking-tighter">
                    ALERT<span className="text-red-600">_OS</span>
                </h1>
                <p className="text-red-500/60 text-[10px] font-mono tracking-[0.3em] mt-1">SECURE EMERGENCY UPLINK</p>
            </div>

            <div className="flex border-b border-white/10 mb-6">
                <button 
                    type="button"
                    onClick={() => { setIsRegistering(false); setError(''); }}
                    className={`flex-1 py-3 text-sm font-mono font-bold transition-colors border-b-2 ${!isRegistering ? 'border-red-600 text-red-500 bg-red-950/30' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    LOGIN
                </button>
                <button 
                    type="button"
                    onClick={() => { setIsRegistering(true); setError(''); }}
                    className={`flex-1 py-3 text-sm font-mono font-bold transition-colors border-b-2 ${isRegistering ? 'border-red-600 text-red-500 bg-red-950/30' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    REGISTER
                </button>
            </div>

            {error && (
                <div className="bg-red-900/30 border-l-4 border-red-600 text-red-200 p-3 mb-6 text-xs font-mono flex items-start gap-2">
                    <Icon icon="mdi:alert" className="text-base mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
                {isRegistering && (
                    <div className="relative group/input animate-in fade-in slide-in-from-left-4 duration-300">
                        <Icon icon="mdi:badge-account-outline" className="absolute left-3 top-3.5 text-gray-500 group-focus-within/input:text-red-500 transition-colors" />
                        <input 
                            type="text" 
                            required={isRegistering}
                            className="w-full bg-black border border-white/20 rounded pl-10 pr-4 py-3 text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                            placeholder="CODENAME (MIN 4 CHARS)"
                            onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                        />
                    </div>
                )}

                <div className="relative group/input">
                    <Icon icon="mdi:email-outline" className="absolute left-3 top-3.5 text-gray-500 group-focus-within/input:text-red-500 transition-colors" />
                    <input 
                        type="email" 
                        required
                        className="w-full bg-black border border-white/20 rounded pl-10 pr-4 py-3 text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                        placeholder="OPERATIVE EMAIL"
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                </div>

                <div className="relative group/input">
                    <Icon icon="mdi:lock-outline" className="absolute left-3 top-3.5 text-gray-500 group-focus-within/input:text-red-500 transition-colors" />
                    <input 
                        type="password" 
                        required
                        className="w-full bg-black border border-white/20 rounded pl-10 pr-4 py-3 text-white font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                        placeholder="ACCESS KEY (MIN 6 CHARS)"
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-4 mt-2 bg-gradient-to-r from-red-900 to-red-700 hover:from-red-800 hover:to-red-600 text-white font-mono font-bold text-sm tracking-widest border border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all flex items-center justify-center gap-2 group/btn"
                >
                    {loading ? (
                        <> <Icon icon="mdi:loading" className="animate-spin" /> VALIDATING... </>
                    ) : (
                        <> {isRegistering ? 'INITIALIZE AGENT' : 'AUTHENTICATE'} <Icon icon="mdi:chevron-right" className="group-hover/btn:translate-x-1 transition-transform" /> </>
                    )}
                </button>
            </form>

            <div className="mt-8 flex justify-between text-[10px] text-gray-600 font-mono uppercase border-t border-white/5 pt-4">
                <span>Status: <span className="text-red-500 animate-pulse">ACTIVE</span></span>
                <span>V.1.0.4 - SECURE</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;