import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

export const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

export const RedPulseIcon = L.divIcon({
    className: "custom-icon",
    html: `<div class="w-6 h-6 bg-red-600 rounded-full border-2 border-white shadow-[0_0_20px_rgba(220,38,38,1)] animate-ping"></div>
           <div class="absolute top-0 left-0 w-6 h-6 bg-red-600 rounded-full border-2 border-white"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12] 
});

export const NIGERIA_BOUNDS = [
    [4.0, 2.5],   // Bottom-Left
    [14.0, 15.0]  // Top-Right
];