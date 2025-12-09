import React from 'react';
import { Icon } from '@iconify/react';

const LogoutModal = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#1a1a1a] border border-red-500/30 p-6 rounded-xl max-w-sm w-full shadow-[0_0_50px_rgba(220,38,38,0.2)] animate-pulse-glow">
            <div className="flex flex-col items-center text-center space-y-4">
                <Icon icon="mdi:alert-circle-outline" className="text-5xl text-red-500" />
                
                <div>
                    <h3 className="text-white font-mono text-lg font-bold">TERMINATE SESSION?</h3>
                    <p className="text-gray-400 text-xs font-mono mt-2">
                        You will be disconnected from the live uplink.
                    </p>
                </div>

                <div className="flex w-full gap-3 pt-2">
                    <button 
                        onClick={onCancel}
                        className="flex-1 py-3 border border-white/10 rounded-lg text-gray-300 font-mono text-sm hover:bg-white/5 transition-colors"
                    >
                        CANCEL
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-mono text-sm font-bold shadow-lg shadow-red-900/20 transition-colors"
                    >
                        CONFIRM
                    </button>
                </div>
            </div>
        </div>
    </div>
);

export default LogoutModal;