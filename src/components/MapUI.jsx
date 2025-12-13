// src/components/MapUI.jsx
import React, { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Icon } from '@iconify/react';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// --- CONSTANTS ---
export const NIGERIA_BOUNDS = [[4.0, 2.5], [14.0, 15.0]];

// --- UTILITY ---
export const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*(Math.PI/180))*Math.cos(lat2*(Math.PI/180))*Math.sin(dLon/2)*Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
};

// --- ICONS ---
export const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

export const SecurityIcon = L.divIcon({
    className: "custom-icon",
    html: `<div class="w-6 h-6 bg-red-600 rounded-full border-2 border-white shadow-[0_0_20px_rgba(220,38,38,1)] animate-ping"></div>
           <div class="absolute top-0 left-0 w-6 h-6 bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white">🛡️</div>`,
    iconSize: [24, 24], iconAnchor: [12, 12] 
});

export const MedicalIcon = L.divIcon({
    className: "custom-icon",
    html: `<div class="w-6 h-6 bg-green-600 rounded-full border-2 border-white shadow-[0_0_20px_rgba(34,197,94,1)] animate-ping"></div>
           <div class="absolute top-0 left-0 w-6 h-6 bg-green-600 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white">🚑</div>`,
    iconSize: [24, 24], iconAnchor: [12, 12] 
});

export const FireIcon = L.divIcon({
    className: "custom-icon",
    html: `<div class="w-6 h-6 bg-orange-600 rounded-full border-2 border-white shadow-[0_0_20px_rgba(249,115,22,1)] animate-ping"></div>
           <div class="absolute top-0 left-0 w-6 h-6 bg-orange-600 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white">🔥</div>`,
    iconSize: [24, 24], iconAnchor: [12, 12] 
});

export const AccidentIcon = L.divIcon({
    className: "custom-icon",
    html: `<div class="w-6 h-6 bg-yellow-500 rounded-full border-2 border-white shadow-[0_0_20px_rgba(234,179,8,1)] animate-ping"></div>
           <div class="absolute top-0 left-0 w-6 h-6 bg-yellow-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-black">⚠️</div>`,
    iconSize: [24, 24], iconAnchor: [12, 12] 
});

export const GhostIcon = L.divIcon({
    className: "custom-icon",
    html: `<div class="w-4 h-4 bg-cyan-500 rounded-full border border-white shadow-[0_0_15px_rgba(6,182,212,0.8)] animate-pulse"></div>
           <div class="absolute top-0 left-0 w-4 h-4 bg-cyan-500 rounded-full border border-white"></div>`,
    iconSize: [16, 16], iconAnchor: [8, 8] 
});

export const getIconByType = (type) => {
    if (!type) return SecurityIcon;
    switch (type.toLowerCase()) {
        case 'medical': return MedicalIcon;
        case 'fire': return FireIcon;
        case 'accident': return AccidentIcon;
        case 'ghost': return GhostIcon;
        case 'security': default: return SecurityIcon;
    }
};

// --- CONTROLS ---
export const MapController = ({ location, isLocked, setIsLocked }) => {
    const map = useMap();
    useMapEvents({ dragstart: () => isLocked && setIsLocked(false) });
    useEffect(() => {
        if (location && isLocked) map.flyTo([location.lat, location.lng], 16, { animate: true, duration: 1.5 });
    }, [location, isLocked, map]);
    return null;
};

export const ManualRecenterBtn = ({ location, isLocked, setIsLocked }) => {
    const map = useMap();
    const handleClick = () => {
        if (!isLocked) { setIsLocked(true); if (location) map.flyTo([location.lat, location.lng], 16, { animate: true, duration: 1.5 }); } 
        else { setIsLocked(false); }
    };
    return (
        <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '90px', marginRight: '10px', pointerEvents: 'auto', zIndex: 1000 }}>
             <button onClick={handleClick} className={`p-2 rounded-lg border shadow-xl flex items-center justify-center w-12 h-12 transition-all active:scale-95 ${isLocked ? 'bg-cyan-600 border-cyan-400 text-white shadow-cyan-900/50' : 'bg-gray-900/80 border-white/20 text-gray-400 hover:text-white'}`}>
                <Icon icon={isLocked ? "mdi:gps-fixed" : "mdi:gps-not-fixed"} className="text-2xl" />
            </button>
        </div>
    );
};