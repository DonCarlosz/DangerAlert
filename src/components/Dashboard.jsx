// src/components/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from '@iconify/react';
import { auth, db } from '../firebase'; 
import { signOut, onAuthStateChanged } from 'firebase/auth'; // <--- Import listener
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import L from 'leaflet';

// --- 1. DEFAULT BLUE ICON ---
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// --- 2. CUSTOM RED BLINKING DOT ICON ---
const RedPulseIcon = L.divIcon({
    className: "custom-icon",
    html: `<div class="w-6 h-6 bg-red-600 rounded-full border-2 border-white shadow-[0_0_20px_rgba(220,38,38,1)] animate-ping"></div>
           <div class="absolute top-0 left-0 w-6 h-6 bg-red-600 rounded-full border-2 border-white"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12] 
});

L.Marker.prototype.options.icon = DefaultIcon;

const Dashboard = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [notification, setNotification] = useState("");
  const [isAlerting, setIsAlerting] = useState(false);
  
  // NEW: Loading state prevents the "Kick to Login" bug
  const [isLoading, setIsLoading] = useState(true);

  // 1. AUTH CHECK LISTENER
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
      } else {
        // User is confirmed, we can stop loading
        setIsLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  // 2. DATA & LOCATION (Only runs after Auth is done)
  useEffect(() => {
    if (isLoading) return; // Wait for auth

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.error(err),
            { enableHighAccuracy: true }
        );
    }

    const q = query(collection(db, "alerts"), orderBy("createdAt", "asc"));
    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribeSnapshot();
  }, [isLoading]);

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  const sendAlert = async () => {
    if (!location) return;
    
    // Visual Feedback
    setIsAlerting(true);

    try {
        await addDoc(collection(db, "alerts"), {
            user: auth.currentUser.email,
            lat: location.lat,
            lng: location.lng,
            message: "EMERGENCY SIGNAL",
            createdAt: serverTimestamp()
        });
        
        setNotification("SIGNAL TRANSMITTED");
        setTimeout(() => setNotification(""), 3000);

    } catch (e) {
        console.error(e);
        setNotification("FAILED");
        setIsAlerting(false);
    }
  };

  // 3. LOADING SCREEN (Prevents flashing)
  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
         <div className="text-green-500 font-mono animate-pulse tracking-widest">
            VERIFYING ENCRYPTION KEYS...
         </div>
      </div>
    );
  }

  // 4. MAIN DASHBOARD
  return (
    <div className="h-screen w-screen relative bg-black">
      
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 flex justify-between pointer-events-none">
         <div className={`backdrop-blur-md border px-4 py-2 rounded-lg pointer-events-auto flex items-center gap-3 transition-colors ${isAlerting ? 'bg-red-900/60 border-red-500' : 'bg-black/60 border-white/10'}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${isAlerting ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span className={`font-mono text-xs font-bold ${isAlerting ? 'text-red-500' : 'text-green-500'}`}>
                {isAlerting ? 'BROADCASTING DISTRESS' : 'LIVE UPLINK'}
            </span>
         </div>
         <button onClick={handleLogout} className="pointer-events-auto bg-gray-900/50 hover:bg-red-900/50 border border-white/10 w-10 h-10 flex items-center justify-center rounded-lg text-white">
            <Icon icon="mdi:logout" />
         </button>
      </div>

      {/* NOTIFICATION */}
      {notification && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-[2000] w-full max-w-sm px-4 text-center">
            <div className="bg-green-600/90 backdrop-blur-md text-white px-6 py-3 rounded-full font-mono font-bold border border-green-400 shadow-lg flex items-center justify-center gap-3 animate-pulse">
            <Icon icon="mdi:check-circle" />
            <span className="text-sm">{notification}</span>
            </div>
        </div>
      )}

      {/* MAP */}
      <MapContainer center={location ? [location.lat, location.lng] : [51.505, -0.09]} zoom={13} className="h-full w-full z-0">
        <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>
        
        {location && (
            <Marker 
                position={[location.lat, location.lng]} 
                icon={isAlerting ? RedPulseIcon : DefaultIcon} 
            >
                <Popup>
                    {isAlerting ? "SIGNAL ACTIVE!" : "You are here"}
                </Popup>
            </Marker>
        )}

        {alerts.map((alert) => (
            <Marker key={alert.id} position={[alert.lat, alert.lng]}>
                <Popup><strong className="text-red-600">ALERT!</strong><br/>{alert.user}</Popup>
            </Marker>
        ))}
      </MapContainer>

      {/* BUTTON */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center z-[1000]">
        <button onClick={sendAlert} className={`group relative flex items-center justify-center w-24 h-24 rounded-full border-4 shadow-[0_0_40px_rgba(220,38,38,0.6)] transition-all cursor-pointer ${isAlerting ? 'bg-red-800 border-red-900 scale-95' : 'bg-red-600 border-red-800 hover:scale-105 active:scale-95'}`}>
            <Icon icon="mdi:bell-ring" className="text-4xl text-white relative z-10" />
            {isAlerting && <div className="absolute inset-0 rounded-full animate-ping border-2 border-red-500"></div>}
        </button>
      </div>

    </div>
  );
};

export default Dashboard;