// src/components/Dashboard.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'; 
import 'leaflet/dist/leaflet.css';
import { Icon } from '@iconify/react';
import { auth, db } from '../firebase'; 
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, getDocs, where, updateDoc, getDoc } from 'firebase/firestore';

import EmergencyTypeModal from './EmergencyTypeModal';
import { 
    DefaultIcon, getIconByType, GhostIcon, NIGERIA_BOUNDS, 
    getDistance, MapController, ManualRecenterBtn 
} from './MapUI';

// --- CONFIG ---
const SIREN_AUDIO_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.m4a"; 

// --- THEME CONFIGURATOR ---
const getTheme = (mode) => {
    if (mode === 'ghost') {
        return {
            color: 'text-cyan-400',
            border: 'border-cyan-500',
            bg: 'bg-cyan-900/60',
            pulse: 'bg-cyan-400',
            buttonBorder: 'border-cyan-500',
            buttonShadow: 'shadow-[0_0_50px_rgba(6,182,212,0.4)]',
            statusText: 'GHOST UPLINK'
        };
    }
    return {
        color: 'text-red-500',
        border: 'border-red-500',
        bg: 'bg-red-900/60',
        pulse: 'bg-red-500',
        buttonBorder: 'border-red-800',
        buttonShadow: 'shadow-[0_0_40px_rgba(220,38,38,0.6)]',
        statusText: 'LIVE UPLINK'
    };
};

const LogoutModal = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#1a1a1a] border border-red-500/30 p-6 rounded-xl max-w-sm w-full animate-pulse-glow">
            <div className="flex flex-col items-center text-center space-y-4">
                <Icon icon="mdi:alert-circle-outline" className="text-5xl text-red-500" />
                <h3 className="text-white font-mono text-lg font-bold">TERMINATE SESSION?</h3>
                <div className="flex w-full gap-3 pt-2">
                    <button onClick={onCancel} className="flex-1 py-3 border border-white/10 rounded-lg text-gray-300 font-mono text-sm hover:bg-white/5">CANCEL</button>
                    <button onClick={onConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-mono text-sm font-bold">CONFIRM</button>
                </div>
            </div>
        </div>
    </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('universal');
  const theme = getTheme(mode);

  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [location, setLocation] = useState(null);
  const [alerts, setAlerts] = useState([]);
  
  const [isAlerting, setIsAlerting] = useState(false);
  const [isGhosting, setIsGhosting] = useState(false);
  const [myDocId, setMyDocId] = useState(null);
  const [myAlertType, setMyAlertType] = useState(null);

  const [notification, setNotification] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMapLocked, setIsMapLocked] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  const sirenRef = useRef(new Audio(SIREN_AUDIO_URL));

  // 1. AUTH & PERMISSIONS
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') Notification.requestPermission();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) { 
        setCurrentUser(user);
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) setUserProfile(docSnap.data());
        setIsLoading(false); 
      } else { navigate('/login'); }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 2. LOCATION SYNC
  useEffect(() => {
    if (!currentUser) return;
    if (navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const newLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setLocation(newLocation);
                if ((isAlerting || isGhosting) && myDocId) {
                   updateDoc(doc(db, "alerts", myDocId), { lat: newLocation.lat, lng: newLocation.lng }).catch(console.error);
                }
            },
            console.error, { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [currentUser, isAlerting, isGhosting, myDocId]);

  // 3. DATA LISTENER
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "alerts"), orderBy("createdAt", "asc"));
    let isFirstLoad = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedAlerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAlerts(fetchedAlerts);
        
        const myActive = fetchedAlerts.find(a => a.user && a.user.toLowerCase() === currentUser.email.toLowerCase());
        
        if (myActive) {
            setMyDocId(myActive.id);
            setMyAlertType(myActive.type);
            if (myActive.type === 'ghost') {
                setIsGhosting(true); setIsAlerting(false); setMode('ghost');
            } else {
                setIsAlerting(true); setIsGhosting(false); setMode('universal');
            }
        } else {
            setIsAlerting(false); setIsGhosting(false); setMyDocId(null); setMyAlertType(null);
        }

        if (!isFirstLoad && location && mode === 'universal') {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const newAlert = change.doc.data();
                    if (newAlert.user === currentUser.email) return;
                    if (newAlert.type === 'ghost') return;

                    const distKm = getDistance(location.lat, location.lng, newAlert.lat, newAlert.lng);
                    const alertTime = newAlert.createdAt?.seconds * 1000 || Date.now();
                    const isRecent = (Date.now() - alertTime) < 120000;

                    if (distKm <= 2.0 && isRecent) {
                        sirenRef.current.currentTime = 0;
                        sirenRef.current.play().catch(e => console.log("Audio blocked", e));
                        setNotification(`DANGER: ${distKm.toFixed(1)}KM AWAY`);
                        setTimeout(() => setNotification(""), 5000);
                    }
                }
            });
        }
        isFirstLoad = false;
    });
    return () => unsubscribe();
  }, [currentUser, location, mode]);

  // --- ACTIONS ---
  const handleMainButton = () => {
      if (isAlerting || isGhosting) { stopAlert(); return; }
      if (mode === 'universal') { if (location) setShowTypeModal(true); } 
      else if (mode === 'ghost') { toggleGhost(); }
  };

  const startRedAlert = async (type) => {
      setShowTypeModal(false);
      await createAlert(type, null);
  };

  const toggleGhost = async () => {
      if (!userProfile?.roster || userProfile.roster.length === 0) {
          if(window.confirm("ROSTER EMPTY. Go to Team Page?")) navigate('/team');
          return;
      }
      await createAlert('ghost', userProfile.roster);
  };

  const createAlert = async (type, visibleTo) => {
      try {
        if (myDocId) await deleteDoc(doc(db, "alerts", myDocId));
        const docRef = await addDoc(collection(db, "alerts"), {
            user: currentUser.email,
            userName: userProfile?.fullName || "Unknown",
            userPhone: userProfile?.phoneNumber || "",
            type: type, visibleTo: visibleTo, lat: location.lat, lng: location.lng, createdAt: serverTimestamp()
        });
        setMyDocId(docRef.id);
      } catch (e) { console.error(e); }
  };

  const stopAlert = async () => { if (myDocId) await deleteDoc(doc(db, "alerts", myDocId)); };

  const toggleMode = () => {
      if (isAlerting || isGhosting) { alert("CANNOT SWITCH MODES WHILE ACTIVE."); return; }
      setMode(prev => prev === 'universal' ? 'ghost' : 'universal');
  };

  const handleLogout = async () => { setShowLogoutConfirm(false); await signOut(auth); navigate('/login'); };

  if (isLoading) return <div className="h-screen w-screen bg-black flex items-center justify-center text-green-500 font-mono animate-pulse">CONNECTING...</div>;

  return (
    // Use h-[100dvh] for dynamic mobile viewport height
    <div className="h-[100dvh] w-screen relative bg-black transition-colors duration-500 overflow-hidden">
      {showLogoutConfirm && <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogoutConfirm(false)} />}
      {showTypeModal && <EmergencyTypeModal onSelect={startRedAlert} onCancel={() => setShowTypeModal(false)} />}

      {/* --- HUD --- */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-3 md:p-4 flex justify-between items-start pointer-events-none">
         
         {/* STATUS BADGE (Left) */}
         <div className={`backdrop-blur-md border px-3 py-2 md:px-4 md:py-2 rounded-lg pointer-events-auto flex items-center gap-2 transition-colors shadow-lg ${theme.bg} ${theme.border}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${theme.pulse}`}></div>
            {/* Smaller text on mobile */}
            <span className={`font-mono text-[10px] md:text-xs font-bold ${theme.color}`}>
                {isAlerting ? 'BROADCASTING...' : (isGhosting ? 'SAFE WALK' : theme.statusText)}
            </span>
         </div>

         {/* CONTROLS (Right) - Tighter Grid on Mobile */}
         <div className="flex gap-2 pointer-events-auto">
            
            {/* MODE TOGGLE */}
            <button 
                onClick={toggleMode} 
                className={`bg-gray-900/90 border w-10 h-10 md:w-12 md:h-10 flex items-center justify-center rounded-lg transition-colors shadow-lg ${theme.border} ${theme.color}`}
            >
                <Icon icon={mode === 'universal' ? "mdi:earth" : "mdi:ghost"} className="text-lg md:text-xl" />
            </button>

            {/* NAV GROUP */}
            <div className="flex gap-1 md:gap-2">
                <button onClick={() => navigate('/team')} className="bg-gray-900/80 hover:bg-green-900/50 border border-white/10 w-9 h-10 md:w-10 flex items-center justify-center rounded-lg text-white transition-colors">
                    <Icon icon="mdi:account-group" className="text-lg" />
                </button>

                <button onClick={() => navigate('/profile')} className="bg-gray-900/80 hover:bg-cyan-900/50 border border-white/10 w-9 h-10 md:w-10 flex items-center justify-center rounded-lg text-white transition-colors">
                    <Icon icon="mdi:cog" className="text-lg" />
                </button>
                
                <button onClick={() => setShowLogoutConfirm(true)} className="bg-gray-900/80 hover:bg-red-900/50 border border-white/10 w-9 h-10 md:w-10 flex items-center justify-center rounded-lg text-white transition-colors">
                    <Icon icon="mdi:logout" className="text-lg" />
                </button>
            </div>
         </div>
      </div>

      {notification && (
        <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-[2000] w-[90%] max-w-sm text-center pointer-events-none">
            <div className={`backdrop-blur-md text-white px-4 py-2 rounded-full font-mono font-bold border shadow-lg flex items-center justify-center gap-2 animate-pulse bg-gray-900/90 border-white text-xs md:text-sm`}>
                <Icon icon="mdi:alert" />
                <span>{notification}</span>
            </div>
        </div>
      )}

      {/* --- MAP --- */}
      <MapContainer center={[9.0820, 8.6753]} zoom={6} minZoom={5} maxBounds={NIGERIA_BOUNDS} maxBoundsViscosity={1.0} className="h-full w-full z-0" zoomControl={false}>
        <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>
        <MapController location={location} isLocked={isMapLocked} setIsLocked={setIsMapLocked} />
        <ManualRecenterBtn location={location} isLocked={isMapLocked} setIsLocked={setIsMapLocked} />

        {location && (
            <Marker position={[location.lat, location.lng]} icon={(isAlerting || isGhosting) ? getIconByType(myAlertType) : DefaultIcon}>
                <Popup>{isGhosting ? "Visible to Team" : "You are here"}</Popup>
            </Marker>
        )}

        {alerts.map((alert) => {
            if (alert.user === currentUser?.email) return null;
            if (mode === 'universal') {
                if (alert.type === 'ghost') return null;
                return (
                    <Marker key={alert.id} position={[alert.lat, alert.lng]} icon={getIconByType(alert.type)}>
                        <Popup className="custom-popup"><strong className="text-red-600 font-mono">{alert.type} ALERT</strong><br/>{alert.userName}</Popup>
                    </Marker>
                );
            } else {
                if (alert.type === 'ghost') {
                    if (!alert.visibleTo?.includes(currentUser.uid)) return null;
                    return (
                        <Marker key={alert.id} position={[alert.lat, alert.lng]} icon={GhostIcon}>
                            <Popup><strong className="text-cyan-400">{alert.userName}</strong><br/>Safe Walk</Popup>
                        </Marker>
                    );
                }
                return (
                    <Marker key={alert.id} position={[alert.lat, alert.lng]} icon={getIconByType(alert.type)}>
                         <Popup><strong className="text-red-600">{alert.type}</strong></Popup>
                    </Marker>
                );
            }
        })}
      </MapContainer>

      {/* --- MAIN ACTION BUTTON --- */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center z-[1000] pb-safe">
        <button 
            onClick={handleMainButton} 
            className={`group relative flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full border-4 transition-all cursor-pointer ${isAlerting || isGhosting ? 'bg-white border-gray-300 scale-95' : `bg-gray-900 ${theme.buttonBorder} hover:scale-105 ${theme.buttonShadow}`}`}
        >
            {isAlerting || isGhosting 
                ? <Icon icon="mdi:stop" className={`text-3xl md:text-4xl relative z-10 ${mode === 'ghost' ? 'text-cyan-600' : 'text-red-600'}`} /> 
                : <Icon icon={mode === 'ghost' ? "mdi:eye" : "mdi:bell-ring"} className="text-3xl md:text-4xl text-white relative z-10" />
            }
            {(isAlerting || isGhosting) && <div className={`absolute inset-0 rounded-full animate-ping border-2 ${mode === 'ghost' ? 'border-cyan-500' : 'border-red-500'}`}></div>}
        </button>
      </div>
    </div>
  );
};

export default Dashboard;