import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { auth, db } from '../../firebase'; 
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, getDocs, where, updateDoc } from 'firebase/firestore';

// Sub-Components
import LogoutModal from './LogoutModal';
import MapLayer from './MapLayer';

const Dashboard = () => {
  const navigate = useNavigate();
  
  const [currentUser, setCurrentUser] = useState(null);
  const [location, setLocation] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [isAlerting, setIsAlerting] = useState(false);
  const [alertDocId, setAlertDocId] = useState(null);
  const [notification, setNotification] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMapLocked, setIsMapLocked] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  // LOCATION TRACKER
  useEffect(() => {
    if (!currentUser) return;
    if (navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const newLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setLocation(newLocation);

                // Live Tracking Logic
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
  }, [currentUser, isAlerting, alertDocId]);

  // DB LISTENER
  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, "alerts"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedAlerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAlerts(fetchedAlerts);

        const myActiveAlert = fetchedAlerts.find(a => 
            a.user && a.user.toLowerCase() === currentUser.email.toLowerCase()
        );
        
        if (myActiveAlert) {
            setIsAlerting(true);
            setAlertDocId(myActiveAlert.id);
        } else {
            setIsAlerting(false);
            setAlertDocId(null);
        }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // --- HANDLERS ---
  const requestLogout = () => setShowLogoutConfirm(true);
  
  const confirmLogout = async () => {
      setShowLogoutConfirm(false);
      await signOut(auth); 
      navigate('/login'); 
  };

  const cancelLogout = () => setShowLogoutConfirm(false);

  const toggleAlert = async () => {
    if (!location) return;

    if (isAlerting) {
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
        try {
            const q = query(collection(db, "alerts"), where("user", "==", currentUser.email));
            const existing = await getDocs(q);
            existing.forEach(async (d) => await deleteDoc(d.ref));

            const docRef = await addDoc(collection(db, "alerts"), {
                user: currentUser.email,
                lat: location.lat,
                lng: location.lng,
                message: "EMERGENCY SIGNAL",
                createdAt: serverTimestamp()
            });
            
            setAlertDocId(docRef.id);
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
      
      {showLogoutConfirm && (
          <LogoutModal onConfirm={confirmLogout} onCancel={cancelLogout} />
      )}

      {/* HUD (Top Bar) */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 flex justify-between pointer-events-none">
         <div className={`backdrop-blur-md border px-4 py-2 rounded-lg pointer-events-auto flex items-center gap-3 transition-colors ${isAlerting ? 'bg-red-900/60 border-red-500' : 'bg-black/60 border-white/10'}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${isAlerting ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span className={`font-mono text-xs font-bold ${isAlerting ? 'text-red-500' : 'text-green-500'}`}>
                {isAlerting ? 'BROADCASTING DISTRESS' : 'LIVE UPLINK'}
            </span>
         </div>
         <button 
            onClick={requestLogout} 
            className="pointer-events-auto bg-gray-900/50 hover:bg-red-900/50 border border-white/10 w-10 h-10 flex items-center justify-center rounded-lg text-white transition-colors"
         >
            <Icon icon="mdi:logout" />
         </button>
      </div>

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-[2000] w-full max-w-sm px-4 text-center">
            <div className={`backdrop-blur-md text-white px-6 py-3 rounded-full font-mono font-bold border shadow-lg flex items-center justify-center gap-3 animate-pulse ${notification.includes("CANCEL") ? "bg-gray-600/90 border-gray-400" : "bg-green-600/90 border-green-400"}`}>
            <Icon icon={notification.includes("CANCEL") ? "mdi:cancel" : "mdi:check-circle"} />
            <span className="text-sm">{notification}</span>
            </div>
        </div>
      )}

      {/* MAP LAYER */}
      <MapLayer 
          location={location} 
          alerts={alerts} 
          currentUser={currentUser} 
          isAlerting={isAlerting} 
          isMapLocked={isMapLocked} 
          setIsMapLocked={setIsMapLocked} 
      />

      {/* ACTION BUTTON */}
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