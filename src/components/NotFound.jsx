// src/components/NotFound.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';

const Notfound = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center relative overflow-hidden text-center p-6">
      
      {/* Background Glitch Effect (Optional aesthetic) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ 
             backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, #00ff00 1px, transparent 2px)",
             backgroundSize: "100% 4px"
           }}>
      </div>

      {/* Main Content */}
      <div className="z-10 flex flex-col items-center animate-pulse">
        <Icon icon="mdi:alert-octagon-outline" className="text-9xl text-red-600 mb-4 opacity-80" />
        
        <h1 className="text-6xl font-black text-white font-mono tracking-tighter mb-2">
          404
        </h1>
        
        <h2 className="text-xl text-red-500 font-mono tracking-widest border-b border-red-900 pb-4 mb-8">
          SIGNAL LOST // INVALID COORDINATES
        </h2>
      </div>

      {/* Action Button */}
      <button 
        onClick={() => navigate('/')}
        className="z-10 group relative px-8 py-4 bg-gray-900 border border-white/20 hover:border-cyan-500 rounded-lg overflow-hidden transition-all active:scale-95"
      >
        <div className="absolute inset-0 w-0 bg-cyan-900/50 transition-all duration-[250ms] ease-out group-hover:w-full"></div>
        <div className="relative flex items-center gap-3">
          <Icon icon="mdi:radar" className="text-cyan-400 group-hover:animate-spin" />
          <span className="text-gray-300 font-mono text-sm tracking-wider group-hover:text-white">
            RE-ESTABLISH LINK
          </span>
        </div>
      </button>

      {/* Footer System Text */}
      <div className="absolute bottom-8 text-[10px] text-gray-700 font-mono">
        SYSTEM_ID: NULL_PTR_EXCEPTION <br/>
        NODE: UNKNOWN
      </div>

    </div>
  );
};

export default Notfound;