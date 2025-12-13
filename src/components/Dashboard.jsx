// src/components/Dashboard.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'; 
import 'leaflet/dist/leaflet.css';
import { Icon } from '@iconify/react';
import { auth, db } from '../firebase'; 
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, getDocs, where, updateDoc, getDoc } from 'firebase/firestore';

// --- IMPORTS ---
import EmergencyTypeModal from './EmergencyTypeModal';
// Import shared map logic to keep file clean
import { 
    DefaultIcon, getIconByType, NIGERIA_BOUNDS, 
    getDistance, MapController, ManualRecenterBtn 
} from './MapUI';

// --- SOUND ASSET ---
const SIREN_AUDIO_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.m4a"; 

const LogoutModal = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#1a1a1a] border border-red-500/30 p-6 rounded-xl max-w-sm w-full shadow-[0_0_50px_rgba(220,38,38,0.2)] animate-pulse-glow">
            <div className="flex flex-col items-center text-center space-y-4">
                <Icon icon="mdi:alert-circle-outline" className="text-5xl text-red-500" />
                <div>
                    <h3 className="text-white font-mono text-lg font-bold">TERMINATE SESSION?</h3>
                    <p className="text-gray-400 text-xs font-mono mt-2">You will be disconnected from the live uplink.</p>
                </div>
                <div className="flex w-full gap-3 pt-2">
                    <button onClick={onCancel} className="flex-1 py-3 border border-white/10 rounded-lg text-gray-300 font-mono text-sm hover:bg-white/5 transition-colors">CANCEL</button>
                    <button onClick={onConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-mono text-sm font-bold shadow-lg shadow-red-900/20 transition-colors">CONFIRM</button>
                </div>
            </div>
        </div>
    </div>
);

// --- MAIN DASHBOARD ---
const Dashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [location, setLocation] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isAlerting, setIsAlerting] = useState(false);
  const [alertDocId, setAlertDocId] = useState(null);
  const [myAlertType, setMyAlertType] = useState(null);
  
  const [notification, setNotification] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMapLocked, setIsMapLocked] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  const sirenRef = useRef(new Audio(SIREN_AUDIO_URL));

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) { 
        setCurrentUser(user);
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setUserProfile(docSnap.data());
        setIsLoading(false); 
      } else { navigate('/login'); }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!currentUser) return;
    if (navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const newLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setLocation(newLocation);
                if (isAlerting && alertDocId) {
                   const docRef = doc(db, "alerts", alertDocId);
                   updateDoc(docRef, { lat: newLocation.lat, lng: newLocation.lng }).catch(console.error);
                }
            },
            console.error, { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [currentUser, isAlerting, alertDocId]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "alerts"), orderBy("createdAt", "asc"));
    
    let isFirstLoad = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedAlerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAlerts(fetchedAlerts);
        
        const myActiveAlert = fetchedAlerts.find(a => a.user && a.user.toLowerCase() === currentUser.email.toLowerCase());
        if (myActiveAlert) {
            // Ignore if it's a Ghost alert (GhostMode.jsx handles that now)
            if (myActiveAlert.type !== 'ghost') {
                setIsAlerting(true);
                setAlertDocId(myActiveAlert.id);
                setMyAlertType(myActiveAlert.type);
            }
        } else {
            setIsAlerting(false);
            setAlertDocId(null);
            setMyAlertType(null);
        }

        if (!isFirstLoad && location) {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const newAlert = change.doc.data();
                    if (newAlert.user.toLowerCase() === currentUser.email.toLowerCase()) return;
                    
                    // Don't play siren for Ghost alerts in Dashboard
                    if (newAlert.type === 'ghost') return;

                    const distKm = getDistance(location.lat, location.lng, newAlert.lat, newAlert.lng);
                    const alertTime = newAlert.createdAt?.seconds * 1000 || Date.now();
                    const isRecent = (Date.now() - alertTime) < 120000;

                    if (distKm <= 2.0 && isRecent) {
                        sirenRef.current.currentTime = 0;
                        sirenRef.current.play().catch(e => console.log("Audio play blocked", e));

                        if (Notification.permission === 'granted') {
                            new Notification(`DANGER NEARBY (${distKm.toFixed(1)}km)`, {
                                body: `${newAlert.type.toUpperCase()} alert from ${newAlert.userName}`,
                                icon: markerIcon
                            });
                        }

                        setNotification(`DANGER DETECTED: ${distKm.toFixed(1)}KM AWAY`);
                        setTimeout(() => setNotification(""), 5000);
                    }
                }
            });
        }
        isFirstLoad = false;
    });
    return () => unsubscribe();
  }, [currentUser, location]);

  const handleAlertClick = () => {
      if (isAlerting) { stopAlert(); } 
      else { if (!location) return; setShowTypeModal(true); }
  };

  const startAlert = async (type) => {
      setShowTypeModal(false);
      try {
          const q = query(collection(db, "alerts"), where("user", "==", currentUser.email));
          const existing = await getDocs(q);
          existing.forEach(async (d) => await deleteDoc(d.ref));

          const docRef = await addDoc(collection(db, "alerts"), {
              user: currentUser.email,
              userName: userProfile?.fullName || currentUser.displayName || "Unknown Agent",
              userPhone: userProfile?.phoneNumber || "",
              type: type, 
              lat: location.lat,
              lng: location.lng,
              message: "EMERGENCY SIGNAL",
              createdAt: serverTimestamp()
          });
          
          setAlertDocId(docRef.id);
          setNotification(`${type.toUpperCase()} ALERT SENT`);
          setTimeout(() => setNotification(""), 3000);
      } catch (e) {
          console.error(e);
          setNotification("FAILED");
      }
  };

  const stopAlert = async () => {
      try {
          if (alertDocId) {
              await deleteDoc(doc(db, "alerts", alertDocId));
              setNotification("ALERT CANCELLED");
              setTimeout(() => setNotification(""), 3000);
          }
      } catch (e) { console.error(e); }
  };

  const handleLogout = async () => { setShowLogoutConfirm(false); await signOut(auth); navigate('/login'); };

  if (isLoading) return <div className="h-screen w-screen bg-black flex items-center justify-center text-green-500 font-mono animate-pulse">CONNECTING...</div>;

  return (
    <div className="h-screen w-screen relative bg-black">
      {showLogoutConfirm && <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogoutConfirm(false)} />}
      
      {showTypeModal && <EmergencyTypeModal onSelect={startAlert} onCancel={() => setShowTypeModal(false)} />}

      {/* TOP HUD */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 flex justify-between pointer-events-none">
         <div className={`backdrop-blur-md border px-4 py-2 rounded-lg pointer-events-auto flex items-center gap-3 transition-colors ${isAlerting ? 'bg-red-900/60 border-red-500' : 'bg-black/60 border-white/10'}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${isAlerting ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span className={`font-mono text-xs font-bold ${isAlerting ? 'text-red-500' : 'text-green-500'}`}>
                {isAlerting ? 'BROADCASTING' : 'LIVE UPLINK'}
            </span>
         </div>
         <div className="flex gap-2 pointer-events-auto">
            
            {/* GHOST MODE BUTTON */}
            <button onClick={() => navigate('/ghost')} className="bg-gray-900/50 hover:bg-cyan-900/50 border border-white/10 w-10 h-10 flex items-center justify-center rounded-lg text-cyan-400 transition-colors">
                <Icon icon="mdi:eye-outline" />
            </button>

            <button onClick={() => navigate('/profile')} className="bg-gray-900/50 hover:bg-cyan-900/50 border border-white/10 w-10 h-10 flex items-center justify-center rounded-lg text-white transition-colors">
                <Icon icon="mdi:cog" />
            </button>
            <button onClick={() => setShowLogoutConfirm(true)} className="bg-gray-900/50 hover:bg-red-900/50 border border-white/10 w-10 h-10 flex items-center justify-center rounded-lg text-white transition-colors">
                <Icon icon="mdi:logout" />
            </button>
         </div>
      </div>

      {notification && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-[2000] w-full max-w-sm px-4 text-center">
            <div className={`backdrop-blur-md text-white px-6 py-3 rounded-full font-mono font-bold border shadow-lg flex items-center justify-center gap-3 animate-pulse ${notification.includes("CANCEL") ? "bg-gray-600/90 border-gray-400" : "bg-green-600/90 border-green-400"}`}>
            <Icon icon={notification.includes("CANCEL") ? "mdi:cancel" : "mdi:check-circle"} />
            <span className="text-sm">{notification}</span>
            </div>
        </div>
      )}

      {/* MAP LAYER */}
      <MapContainer center={[9.0820, 8.6753]} zoom={6} minZoom={5} maxBounds={NIGERIA_BOUNDS} maxBoundsViscosity={1.0} className="h-full w-full z-0">
        <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>
        <MapController location={location} isLocked={isMapLocked} setIsLocked={setIsMapLocked} />
        <ManualRecenterBtn location={location} isLocked={isMapLocked} setIsLocked={setIsMapLocked} />

        {location && (
            <Marker position={[location.lat, location.lng]} icon={isAlerting ? getIconByType(myAlertType) : DefaultIcon}>
                <Popup>
                    {isAlerting 
                        ? <><strong className="text-red-600">{myAlertType?.toUpperCase()} ACTIVE!</strong><br/>{currentUser?.displayName || "Me"}</> 
                        : "You are here"
                    }
                </Popup>
            </Marker>
        )}

        {alerts.map((alert) => (
            // Hide own alerts, and HIDE GHOST ALERTS from main dashboard (they belong in ghost mode)
            alert.user !== currentUser?.email && alert.type !== 'ghost' && (
                <Marker key={alert.id} position={[alert.lat, alert.lng]} icon={getIconByType(alert.type)}>
                    <Popup className="custom-popup">
                        <div className="text-center p-1">
                            <strong className="text-red-600 font-mono text-lg block mb-1 uppercase">{alert.type} ALERT</strong>
                            <span className="font-bold block mb-2">{alert.userName || alert.user}</span>
                            {alert.userPhone && (
                                <a href={`tel:${alert.userPhone}`} className="block bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-sm no-underline mb-1 flex items-center justify-center gap-2">
                                    <Icon icon="mdi:phone" /> CALL NOW
                                </a>
                            )}
                        </div>
                    </Popup>
                </Marker>
            )
        ))}
      </MapContainer>

      {/* ACTION BUTTON */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center z-[1000]">
        <button onClick={handleAlertClick} className={`group relative flex items-center justify-center w-24 h-24 rounded-full border-4 shadow-[0_0_40px_rgba(220,38,38,0.6)] transition-all cursor-pointer ${isAlerting ? 'bg-white border-gray-300 scale-95' : 'bg-red-600 border-red-800 hover:scale-105 active:scale-95'}`}>
            {isAlerting ? <Icon icon="mdi:stop" className="text-4xl text-red-600 relative z-10" /> : <Icon icon="mdi:bell-ring" className="text-4xl text-white relative z-10" />}
            {isAlerting && <div className="absolute inset-0 rounded-full animate-ping border-2 border-red-500"></div>}
        </button>
      </div>
    </div>
  );
};

export default Dashboard;