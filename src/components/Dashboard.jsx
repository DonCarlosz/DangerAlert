// src/components/Dashboard.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'; 
import 'leaflet/dist/leaflet.css';
import { Icon } from '@iconify/react';
import { auth, db } from '../firebase'; 
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, getDocs, where, updateDoc } from 'firebase/firestore';
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

// --- CONFIG: NIGERIA BOUNDARIES ---
const NIGERIA_BOUNDS = [
    [4.0, 2.5],   // Bottom-Left
    [14.0, 15.0]  // Top-Right
];

// --- COMPONENT: MAP CONTROLLER ---
// Handles Auto-centering and Map Dragging detection
const MapController = ({ location, isLocked, setIsLocked }) => {
    const map = useMap();
    
    // 1. Listen for user dragging the map
    useMapEvents({
        dragstart: () => {
            // If user drags, disable auto-lock
            setIsLocked(false);
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

// --- COMPONENT: MANUAL RE-CENTER BUTTON ---
const ManualRecenterBtn = ({ isLocked, setIsLocked }) => {
    return (
        <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '90px', marginRight: '10px', pointerEvents: 'auto', zIndex: 1000 }}>
             <button 
                onClick={() => setIsLocked(!isLocked)} 
                className={`p-2 rounded-lg border shadow-xl flex items-center justify-center w-12 h-12 transition-all ${isLocked ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-gray-900/80 border-white/20 text-gray-400 hover:text-white'}`}
            >
                {/* Icon changes based on state */}
                <Icon icon={isLocked ? "mdi:gps-fixed" : "mdi:gps-not-fixed"} className="text-2xl" />
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
  const [alertDocId, setAlertDocId] = useState(null); // Keep track of MY specific alert ID
  const [notification, setNotification] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // NEW: Track if map should follow user
  const [isMapLocked, setIsMapLocked] = useState(true);

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

  // LOCATION TRACKER (The "GPS Engine")
  useEffect(() => {
    if (!currentUser) return;
    if (navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const newLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setLocation(newLocation);

                // --- LIVE TRACKING LOGIC ---
                // If I am currently alerting, UPDATE the database with my new move
                if (isAlerting && alertDocId) {
                   const docRef = doc(db, "alerts", alertDocId);
                   updateDoc(docRef, { 
                       lat: newLocation.lat, 
                       lng: newLocation.lng 
                   }).catch(e => console.error("Error updating position", e));
                }
            },
            (err) => console.error(err),
            { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [currentUser, isAlerting, alertDocId]); // Re-run if alert status changes

  // DB LISTENER
  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, "alerts"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedAlerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAlerts(fetchedAlerts);

        // Check if I am alerting
        const myActiveAlert = fetchedAlerts.find(a => 
            a.user && a.user.toLowerCase() === currentUser.email.toLowerCase()
        );
        
        if (myActiveAlert) {
            setIsAlerting(true);
            setAlertDocId(myActiveAlert.id); // Save the ID so we can update it later
        } else {
            setIsAlerting(false);
            setAlertDocId(null);
        }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  // --- TOGGLE ALERT LOGIC ---
  const toggleAlert = async () => {
    if (!location) return;

    if (isAlerting) {
        // --- STOP ALERTING (Delete doc) ---
        try {
            if (alertDocId) {
                await deleteDoc(doc(db, "alerts", alertDocId));
                setNotification("ALERT CANCELLED");
                setTimeout(() => setNotification(""), 3000);
            }
        } catch (e) {
            console.error("Error cancelling:", e);
        }

    } else {
        // --- START ALERTING (Create doc) ---
        try {
            // First, double check to delete any old stale alerts from me
            const q = query(collection(db, "alerts"), where("user", "==", currentUser.email));
            const existing = await getDocs(q);
            existing.forEach(async (d) => await deleteDoc(d.ref));

            // Create new single alert
            const docRef = await addDoc(collection(db, "alerts"), {
                user: currentUser.email,
                lat: location.lat,
                lng: location.lng,
                message: "EMERGENCY SIGNAL",
                createdAt: serverTimestamp()
            });
            
            setAlertDocId(docRef.id); // Save ID immediately
            setNotification("SIGNAL TRANSMITTED");
            setTimeout(() => setNotification(""), 3000);
        } catch (e) {
            console.error(e);
            setNotification("FAILED");
        }
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
            <div className={`backdrop-blur-md text-white px-6 py-3 rounded-full font-mono font-bold border shadow-lg flex items-center justify-center gap-3 animate-pulse ${notification.includes("CANCEL") ? "bg-gray-600/90 border-gray-400" : "bg-green-600/90 border-green-400"}`}>
            <Icon icon={notification.includes("CANCEL") ? "mdi:cancel" : "mdi:check-circle"} />
            <span className="text-sm">{notification}</span>
            </div>
        </div>
      )}

      {/* MAP */}
      <MapContainer 
        center={[9.0820, 8.6753]} 
        zoom={6} 
        minZoom={5} 
        maxBounds={NIGERIA_BOUNDS} 
        maxBoundsViscosity={1.0}
        className="h-full w-full z-0"
      >
        <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>
        
        {/* NEW CONTROLLER: Handles panning logic */}
        <MapController location={location} isLocked={isMapLocked} setIsLocked={setIsMapLocked} />
        
        <ManualRecenterBtn isLocked={isMapLocked} setIsLocked={setIsMapLocked} />

        {/* MY LOCATION */}
        {location && (
            <Marker 
                position={[location.lat, location.lng]} 
                icon={isAlerting ? RedPulseIcon : DefaultIcon} 
            >
                <Popup>{isAlerting ? "SIGNAL ACTIVE!" : "You are here"}</Popup>
            </Marker>
        )}

        {/* OTHER ALERTS */}
        {alerts.map((alert) => (
            alert.user !== currentUser?.email && (
                <Marker 
                    key={alert.id} 
                    position={[alert.lat, alert.lng]}
                    icon={RedPulseIcon} 
                >
                    <Popup><strong className="text-red-600">ALERT!</strong><br/>{alert.user}</Popup>
                </Marker>
            )
        ))}
      </MapContainer>

      {/* TOGGLE BUTTON */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center z-[1000]">
        <button 
            onClick={toggleAlert} 
            className={`group relative flex items-center justify-center w-24 h-24 rounded-full border-4 shadow-[0_0_40px_rgba(220,38,38,0.6)] transition-all cursor-pointer ${isAlerting ? 'bg-white border-gray-300 scale-95' : 'bg-red-600 border-red-800 hover:scale-105 active:scale-95'}`}
        >
            {isAlerting ? (
                <Icon icon="mdi:stop" className="text-4xl text-red-600 relative z-10" />
            ) : (
                <Icon icon="mdi:bell-ring" className="text-4xl text-white relative z-10" />
            )}
            
            {isAlerting && <div className="absolute inset-0 rounded-full animate-ping border-2 border-red-500"></div>}
        </button>
      </div>

    </div>
  );
};

export default Dashboard;