// src/components/GhostMode.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'; 
import 'leaflet/dist/leaflet.css';
import { Icon } from '@iconify/react';
import { auth, db } from '../firebase'; 
import { collection, addDoc, query, onSnapshot, serverTimestamp, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';

// --- IMPORT SHARED MAP UI (Cleaner Code) ---
import { 
    DefaultIcon, GhostIcon, 
    MapController, NIGERIA_BOUNDS 
} from './MapUI';

const GhostMode = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [location, setLocation] = useState(null);
  const [teamAlerts, setTeamAlerts] = useState([]); 
  const [isGhosting, setIsGhosting] = useState(false);
  const [alertDocId, setAlertDocId] = useState(null);
  const [status, setStatus] = useState("INITIALIZING UPLINK...");

  // 1. AUTH & ROSTER
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) { 
        setCurrentUser(user);
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) setUserProfile(docSnap.data());
      } else navigate('/login');
    });
    return () => unsub();
  }, [navigate]);

  // 2. LOCATION
  useEffect(() => {
    if (!currentUser) return;
    const watchId = navigator.geolocation.watchPosition(
        (pos) => {
            const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setLocation(newLoc);
            if (isGhosting && alertDocId) {
               updateDoc(doc(db, "alerts", alertDocId), { lat: newLoc.lat, lng: newLoc.lng }).catch(console.error);
            }
        },
        (err) => console.error(err), { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [currentUser, isGhosting, alertDocId]);

  // 3. SYNC ALERTS
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "alerts")); 
    const unsub = onSnapshot(q, (snapshot) => {
        const allAlerts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Check my status
        const mySignal = allAlerts.find(a => a.user === currentUser.email && a.type === 'ghost');
        if (mySignal) {
            setIsGhosting(true);
            setAlertDocId(mySignal.id);
            setStatus("SAFE WALK ACTIVE");
        } else {
            setIsGhosting(false);
            setAlertDocId(null);
            setStatus("GHOST MODE: STANDBY");
        }

        // Filter Team Signals
        if (userProfile && userProfile.roster) {
            const visibleGhosts = allAlerts.filter(a => 
                a.type === 'ghost' && 
                a.visibleTo && 
                a.visibleTo.includes(currentUser.uid) &&
                a.user !== currentUser.email
            );
            setTeamAlerts(visibleGhosts);
        }
    });
    return () => unsub();
  }, [currentUser, userProfile]);

  // 4. TOGGLE GHOST
  const toggleGhost = async () => {
      if (isGhosting) {
          if (alertDocId) await deleteDoc(doc(db, "alerts", alertDocId));
      } else {
          if (!userProfile?.roster || userProfile.roster.length === 0) {
              // Navigate to team page if roster is empty
              if(window.confirm("ROSTER EMPTY. Add agents to use Ghost Mode. Go to Roster?")) {
                  navigate('/team');
              }
              return;
          }

          const ref = await addDoc(collection(db, "alerts"), {
              user: currentUser.email,
              userName: userProfile.fullName || "Unknown",
              userPhone: userProfile.phoneNumber || "",
              type: 'ghost',
              visibleTo: userProfile.roster, 
              lat: location.lat,
              lng: location.lng,
              createdAt: serverTimestamp()
          });
          setAlertDocId(ref.id);
      }
  };

  return (
    <div className="h-screen w-screen relative bg-black">
        
        {/* BLUE HUD */}
        <div className="absolute top-0 left-0 right-0 z-[1000] p-4 flex justify-between pointer-events-none">
            
            {/* STATUS INDICATOR */}
            <div className={`backdrop-blur-md border px-4 py-2 rounded-lg flex items-center gap-3 transition-colors ${isGhosting ? 'bg-cyan-900/60 border-cyan-500' : 'bg-gray-900/60 border-gray-700'}`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${isGhosting ? 'bg-cyan-400' : 'bg-gray-500'}`}></div>
                <span className="font-mono text-xs font-bold text-cyan-400">{status}</span>
            </div>
            
            {/* CONTROLS */}
            <div className="flex gap-2 pointer-events-auto">
                
                {/* --- NEW: TEAM BUTTON LOCATED HERE --- */}
                <button 
                    onClick={() => navigate('/team')} 
                    className="bg-gray-900/80 border border-green-500/30 w-10 h-10 flex items-center justify-center rounded-lg text-green-400 hover:bg-green-900/50 transition-colors"
                >
                    <Icon icon="mdi:account-group" />
                </button>
                
                {/* CLOSE / BACK TO DASHBOARD */}
                <button onClick={() => navigate('/dashboard')} className="bg-gray-900/80 border border-red-500/30 w-10 h-10 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-900/50 transition-colors">
                    <Icon icon="mdi:close" />
                </button>
            </div>
        </div>

        {/* MAP */}
        <MapContainer 
            center={[9.0820, 8.6753]} 
            zoom={15} 
            maxBounds={NIGERIA_BOUNDS} 
            className="h-full w-full z-0" 
            zoomControl={false}
        >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <MapController location={location} />

            {location && (
                <Marker position={[location.lat, location.lng]} icon={isGhosting ? GhostIcon : DefaultIcon}>
                    <Popup>{isGhosting ? "YOU ARE VISIBLE TO TEAM" : "You are hidden"}</Popup>
                </Marker>
            )}

            {teamAlerts.map(t => (
                <Marker key={t.id} position={[t.lat, t.lng]} icon={GhostIcon}>
                    <Popup>
                        <strong className="text-cyan-500">{t.userName}</strong><br/>
                        <span className="text-xs">SAFE WALK ACTIVE</span>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>

        {/* BIG TOGGLE BUTTON */}
        <div className="absolute bottom-10 left-0 right-0 flex justify-center z-[1000]">
            <button 
                onClick={toggleGhost}
                className={`w-24 h-24 rounded-full border-4 shadow-[0_0_50px_rgba(6,182,212,0.4)] flex items-center justify-center transition-all active:scale-95 ${isGhosting ? 'bg-white border-cyan-500' : 'bg-cyan-900/80 border-cyan-600 hover:bg-cyan-800'}`}
            >
                <Icon icon={isGhosting ? "mdi:eye-off" : "mdi:eye"} className={`text-4xl ${isGhosting ? 'text-cyan-600' : 'text-white'}`} />
            </button>
        </div>
    </div>
  );
};

export default GhostMode;