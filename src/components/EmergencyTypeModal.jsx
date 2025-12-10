// src/components/EmergencyTypeModal.jsx
import React from 'react';
import { Icon } from '@iconify/react';

const EmergencyTypeModal = ({ onSelect, onCancel }) => {
    // Configuration for the 4 alert types
    const types = [
        { 
            id: 'security', 
            label: 'SECURITY', 
            icon: 'mdi:shield-alert', 
            color: 'bg-red-600', 
            border: 'border-red-500' 
        },
        { 
            id: 'medical', 
            label: 'MEDICAL', 
            icon: 'mdi:ambulance', 
            color: 'bg-green-600', 
            border: 'border-green-500' 
        },
        { 
            id: 'fire', 
            label: 'FIRE', 
            icon: 'mdi:fire', 
            color: 'bg-orange-600', 
            border: 'border-orange-500' 
        },
        { 
            id: 'accident', 
            label: 'ACCIDENT', 
            icon: 'mdi:car-emergency', 
            color: 'bg-yellow-600', 
            border: 'border-yellow-500' 
        },
    ];

    return (
        <div className="fixed inset-0 z-[3000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm">
                
                {/* Header */}
                <h2 className="text-center text-white font-mono text-xl font-bold mb-6 tracking-widest animate-pulse">
                    SELECT EMERGENCY TYPE
                </h2>
                
                {/* Grid of Buttons */}
                <div className="grid grid-cols-2 gap-4">
                    {types.map((t) => (
                        <button 
                            key={t.id}
                            onClick={() => onSelect(t.id)}
                            className={`${t.color} bg-opacity-20 border-2 ${t.border} hover:bg-opacity-40 p-6 rounded-xl flex flex-col items-center gap-3 transition-all active:scale-95 group`}
                        >
                            <Icon icon={t.icon} className="text-4xl text-white group-hover:scale-110 transition-transform" />
                            <span className="text-white font-mono font-bold tracking-wider">{t.label}</span>
                        </button>
                    ))}
                </div>

                {/* Cancel Button */}
                <button 
                    onClick={onCancel} 
                    className="w-full mt-8 py-4 text-gray-500 hover:text-white font-mono text-sm tracking-wider transition-colors"
                >
                    CANCEL TRANSMISSION
                </button>
            </div>
        </div>
    );
};

export default EmergencyTypeModal;