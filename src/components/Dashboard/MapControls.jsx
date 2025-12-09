import React, { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { Icon } from '@iconify/react';

// --- CONTROLLER LOGIC ---
export const MapController = ({ location, isLocked, setIsLocked }) => {
    const map = useMap();
    
    // 1. Listen for drag to unlock
    useMapEvents({
        dragstart: () => {
            if (isLocked) setIsLocked(false);
        }
    });

    // 2. Auto-Pan to user if "Locked" is true
    useEffect(() => {
        if (location && isLocked) {
            map.flyTo([location.lat, location.lng], 16, { animate: true, duration: 1.5 });
        }
    }, [location, isLocked, map]);

    return null;
};

// --- MANUAL BUTTON UI ---
export const ManualRecenterBtn = ({ location, isLocked, setIsLocked }) => {
    const map = useMap();

    const handleClick = () => {
        if (!isLocked) {
            // ACTIVATING LOCK
            setIsLocked(true);
            if (location) {
                map.flyTo([location.lat, location.lng], 16, { animate: true, duration: 1.5 });
            }
        } else {
            // DEACTIVATING LOCK
            setIsLocked(false);
        }
    };

    return (
        <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '90px', marginRight: '10px', pointerEvents: 'auto', zIndex: 1000 }}>
             <button 
                onClick={handleClick} 
                className={`p-2 rounded-lg border shadow-xl flex items-center justify-center w-12 h-12 transition-all active:scale-95 ${isLocked ? 'bg-cyan-600 border-cyan-400 text-white shadow-cyan-900/50' : 'bg-gray-900/80 border-white/20 text-gray-400 hover:text-white'}`}
                title={isLocked ? "Tracking Active (Click to unlock)" : "Locate Me"}
            >
                <Icon icon={isLocked ? "mdi:gps-fixed" : "mdi:gps-not-fixed"} className="text-2xl" />
            </button>
        </div>
    );
};