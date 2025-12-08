// src/components/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// IMPORT useMap HERE
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'; 
import 'leaflet/dist/leaflet.css';
import { Icon } from '@iconify/react';
import { auth, db } from '../firebase'; 
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import L from 'leaflet';

// --- ICONS ---
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const RedPulseIcon = L.divIcon({
    className: "custom-icon",
    html: `<div class="w-6 h-6 bg-red-600 rounded-full border-2 border-white shadow-[0_0_20px_rgba(220,38,38,1)] animate-ping"></div>
           <div class="absolute top-0 left-0 w-6 h-6 bg-red-600 rounded-full border-2 border-white"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12] 
});

L.Marker.prototype.options.icon = DefaultIcon;

// --- 1. NEW COMPONENT: AUTO RE-CENTER ---
// This handles the "Blank Map" issue. It watches your location and moves the camera.
const AutoRecenter = ({ location }) => {
    const map = useMap();
    useEffect(() => {
        if (location) {
            // Smoothly fly to the new location when GPS locks
            map.flyTo([location.lat, location.lng], 16, { animate: true, duration: 2 });
        }
    }, [location]); // Run this every time location changes slightly
    return null;
};

// --- 2. COMPONENT: MANUAL RE-CENTER BUTTON ---
const ManualRecenterBtn = ({ location }) => {
    const map = useMap(); 
    const handleZoom = () => {
        if (location) map.flyTo([location.lat, location.lng], 16, { animate: true });
    };
    return (
        <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '90px', marginRight: '10px', pointerEvents: 'auto', zIndex: 1000 }}>
             <button onClick={handleZoom} className="bg-gray-900/80 hover:bg-black text-white p-2 rounded-lg border border-white/20 shadow-xl flex items-center justify-center w-12 h-12">
                <Icon icon="mdi:crosshairs-gps" className="text-2xl text-cyan-400" />
            </button>
        </div>
    );
};

const Dashboard = () => {
  const navigate = useNavigate();
  
  const [currentUser, setCurrentUser] = useState(null);
  const [location, setLocation] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isAlerting, setIsAlerting] = useState(false);
  const [notification, setNotification] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // AUTH
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setIsLoading(false);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // LOCATION
  useEffect(() => {
    if (!currentUser) return;
    if (navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
            (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.error(err),
            { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [currentUser]);

  // DB LISTENER
  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, "alerts"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedAlerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAlerts(fetchedAlerts);

        // Check if I am alerting
        const myActiveAlert = fetchedAlerts.find(a => a.user === currentUser.email);
        setIsAlerting(!!myActiveAlert); 
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  const sendAlert = async () => {
    if (!location) return;
    
    // Optimistic UI: Turn red immediately so user feels response
    setIsAlerting(true);

    try {
        await addDoc(collection(db, "alerts"), {
            user: currentUser.email,
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
        setIsAlerting(false); // Revert if failed
    }
  };

  if (isLoading) return <div className="h-screen w-screen bg-black flex items-center justify-center text-green-500 font-mono animate-pulse">CONNECTING...</div>;

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
      {/* Note: We initialize center at [0,0] but AutoRecenter will fix it */}
      <MapContainer center={[0, 0]} zoom={3} className="h-full w-full z-0">
        <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>
        
        {/* --- THIS FIXES THE BLANK MAP --- */}
        <AutoRecenter location={location} />
        {/* -------------------------------- */}

        <ManualRecenterBtn location={location} />

        {location && (
            <Marker 
                position={[location.lat, location.lng]} 
                icon={isAlerting ? RedPulseIcon : DefaultIcon} 
            >
                <Popup>{isAlerting ? "SIGNAL ACTIVE!" : "You are here"}</Popup>
            </Marker>
        )}

        {alerts.map((alert) => (
            alert.user !== currentUser?.email && (
                <Marker key={alert.id} position={[alert.lat, alert.lng]}>
                    <Popup><strong className="text-red-600">ALERT!</strong><br/>{alert.user}</Popup>
                </Marker>
            )
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