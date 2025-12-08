import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const Login = () => {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError("AUTHENTICATION FAILED: " + err.code.replace('auth/', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center relative bg-black">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-40" 
           style={{ backgroundImage: "url('https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80')" }}>
      </div>
      
      {/* Glass Card */}
      <div className="z-10 w-full max-w-md p-8 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        
        <div className="text-center mb-8">
            <Icon icon="mdi:shield-lock" className="text-5xl text-cyan-500 mx-auto mb-4" />
            <h2 className="text-2xl text-white font-mono tracking-widest">
                {isRegistering ? 'NEW AGENT' : 'ACCESS TERMINAL'}
            </h2>
        </div>

        {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 mb-4 rounded text-xs font-mono">
                {error}
            </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-1">
                <label className="text-xs text-gray-400 font-mono ml-1">IDENTITY</label>
                <input 
                    type="email" 
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono transition-all"
                    placeholder="agent@alertos.com"
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
            </div>
            
            <div className="space-y-1">
                <label className="text-xs text-gray-400 font-mono ml-1">PASSPHRASE</label>
                <input 
                    type="password" 
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono transition-all"
                    placeholder="••••••••"
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-cyan-600/80 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-lg shadow-cyan-900/30 uppercase tracking-widest transition-all font-mono"
            >
                {loading ? 'PROCESSING...' : (isRegistering ? 'INITIALIZE' : 'AUTHENTICATE')}
            </button>
        </form>

        <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="w-full mt-6 text-xs text-gray-500 hover:text-cyan-400 font-mono underline decoration-dotted"
        >
            {isRegistering ? 'Return to Login' : 'Register New ID'}
        </button>
      </div>
    </div>
  );
};

export default Login;