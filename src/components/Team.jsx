// src/components/Team.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { auth, db } from '../firebase';
import { 
    collection, query, where, getDocs, updateDoc, doc, 
    arrayUnion, getDoc, arrayRemove, addDoc, onSnapshot, 
    writeBatch, deleteDoc 
} from 'firebase/firestore';

const Team = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  
  // Data State
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [team, setTeam] = useState([]); 
  const [requests, setRequests] = useState([]); 
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null); 
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. INITIALIZE & LISTEN
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
        if (!user) { navigate('/login'); return; }
        setCurrentUser(user);

        // A. Fetch Roster
        const myDocRef = doc(db, "users", user.uid);
        const myDoc = await getDoc(myDocRef);
        if (myDoc.exists() && myDoc.data().roster) {
            const rosterUids = myDoc.data().roster;
            if (rosterUids.length > 0) {
                const q = query(collection(db, "users"), where("__name__", "in", rosterUids));
                const snap = await getDocs(q);
                setTeam(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
        }

        // B. Listen for Requests
        const qReq = query(collection(db, "friend_requests"), where("toUid", "==", user.uid));
        const unsubReq = onSnapshot(qReq, (snapshot) => {
            setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        setLoading(false);
        return () => unsubReq();
    });
    return () => unsubAuth();
  }, [navigate]);

  // 2. SEARCH
  const handleSearch = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSearchResult(null);
    const emailToSearch = searchEmail.trim().toLowerCase();

    if (emailToSearch === currentUser.email.toLowerCase()) {
        setError("CANNOT ADD YOURSELF"); return;
    }

    try {
        const q = query(collection(db, "users"), where("email", "==", emailToSearch));
        const snap = await getDocs(q);

        if (snap.empty) {
            setError("OPERATIVE NOT FOUND");
        } else {
            const userFound = snap.docs[0];
            const alreadyInTeam = team.some(t => t.id === userFound.id);
            if(alreadyInTeam) {
                setError("ALREADY IN ROSTER");
            } else {
                setSearchResult({ id: userFound.id, ...userFound.data() });
            }
        }
    } catch (err) { console.error(err); setError("SEARCH ERROR"); }
  };

  // 3. SEND REQUEST
  const sendRequest = async () => {
    if (!searchResult || !currentUser) return;
    setProcessingId('sending'); 
    try {
        const q = query(
            collection(db, "friend_requests"), 
            where("fromUid", "==", currentUser.uid),
            where("toUid", "==", searchResult.id)
        );
        const existing = await getDocs(q);
        if(!existing.empty) {
            setError("REQUEST ALREADY SENT");
        } else {
            await addDoc(collection(db, "friend_requests"), {
                fromUid: currentUser.uid,
                fromName: currentUser.displayName || "Unknown Agent",
                fromEmail: currentUser.email,
                toUid: searchResult.id,
                toName: searchResult.fullName || "Unknown",
                timestamp: new Date()
            });
            setSuccess(`TRANSMISSION SENT TO ${searchResult.fullName}`);
            setSearchResult(null);
            setSearchEmail('');
        }
    } catch (err) { console.error(err); setError("TRANSMISSION FAILED"); }
    setProcessingId(null);
  };

  // 4. ACCEPT REQUEST (Detailed UI)
  const acceptRequest = async (req) => {
      // Safety check
      if (!req.id || !req.fromUid || !currentUser.uid) {
          setError("DATA ERROR: Cannot link agents.");
          return;
      }

      setProcessingId(req.id); 
      try {
          const batch = writeBatch(db);

          const myRef = doc(db, "users", currentUser.uid);
          batch.update(myRef, { roster: arrayUnion(req.fromUid) });

          const theirRef = doc(db, "users", req.fromUid);
          batch.update(theirRef, { roster: arrayUnion(currentUser.uid) });

          const reqRef = doc(db, "friend_requests", req.id);
          batch.delete(reqRef);

          await batch.commit();

          setSuccess(`UPLINK ESTABLISHED: ${req.fromName}`);
          
          const updatedMyDoc = await getDoc(myRef);
          if(updatedMyDoc.data().roster.length > 0) {
             const q = query(collection(db, "users"), where("__name__", "in", updatedMyDoc.data().roster));
             const snap = await getDocs(q);
             setTeam(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          }

      } catch(err) {
          console.error(err);
          if (err.code === 'permission-denied') {
            setError("PERMISSION DENIED: Update Database Rules");
          } else {
            setError("CONNECTION FAILED");
          }
      }
      setProcessingId(null);
  };

  // 5. REJECT REQUEST (Detailed UI)
  const rejectRequest = async (req) => {
      if(!window.confirm(`Reject connection signal from ${req.fromName}?`)) return;
      
      setProcessingId(req.id);
      try {
          await deleteDoc(doc(db, "friend_requests", req.id));
          setSuccess("SIGNAL TERMINATED");
      } catch(e) { console.error(e); setError("ERROR TERMINATING"); }
      setProcessingId(null);
  };

  // 6. REMOVE MEMBER
  const removeFromRoster = async (member) => {
      if(!window.confirm(`CONFIRM: Sever link with ${member.fullName}?`)) return;
      try {
        const myDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(myDocRef, { roster: arrayRemove(member.id) });
        setTeam(prev => prev.filter(p => p.id !== member.id));
        setSuccess(`LINK SEVERED: ${member.fullName}`);
      } catch(err) { console.error(err); setError("DB ERROR"); }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-red-500 font-mono">LOADING ROSTER...</div>;

  return (
    <div className="min-h-screen bg-black text-white font-mono p-6 flex flex-col items-center">
      
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-xl font-bold text-red-600 tracking-widest flex items-center gap-2">
            <Icon icon="mdi:account-group" /> RED TEAM ROSTER
        </h1>
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white">
          <Icon icon="mdi:close" className="text-2xl" />
        </button>
      </div>

      <div className="w-full max-w-md space-y-8">
        
        {/* --- MESSAGES --- */}
        {error && (
            <div className="bg-red-900/30 border border-red-500/50 p-3 rounded text-red-200 text-xs flex items-center gap-2">
                <Icon icon="mdi:alert" /> {error}
            </div>
        )}
        {success && (
            <div className="bg-green-900/30 border border-green-500/50 p-3 rounded text-green-200 text-xs flex items-center gap-2">
                <Icon icon="mdi:check-circle" /> {success}
            </div>
        )}

        {/* --- PENDING REQUESTS (NEW DESIGN) --- */}
        {requests.length > 0 && (
            <div className="space-y-3">
                <h2 className="text-xs text-cyan-400 uppercase flex items-center gap-2 tracking-wider">
                    <Icon icon="mdi:access-point-network" className="animate-pulse" /> Incoming Signals ({requests.length})
                </h2>
                
                {requests.map(req => (
                    <div key={req.id} className="bg-gray-900/60 border border-cyan-900/50 p-4 rounded-lg flex flex-col gap-3 shadow-[0_0_15px_rgba(8,145,178,0.1)]">
                        
                        {/* User Info */}
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-cyan-900/20 rounded-full flex items-center justify-center text-cyan-500 border border-cyan-500/30">
                                <Icon icon="mdi:account-alert" className="text-xl" />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-cyan-100">{req.fromName}</div>
                                <div className="text-[10px] text-gray-400">{req.fromEmail}</div>
                                <div className="text-[10px] text-cyan-600 mt-1 uppercase tracking-widest font-bold">Wants to Connect</div>
                            </div>
                        </div>

                        {/* Action Buttons (Full Width Text) */}
                        <div className="flex gap-3 w-full pt-1">
                            {processingId === req.id ? (
                                <div className="w-full text-center text-xs text-cyan-500 py-2 animate-pulse font-mono border border-cyan-900/50 rounded bg-cyan-950/30">
                                    ESTABLISHING UPLINK...
                                </div>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => rejectRequest(req)} 
                                        className="flex-1 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-400 py-2 rounded text-[10px] font-bold tracking-wider transition-all flex items-center justify-center gap-2"
                                    >
                                        <Icon icon="mdi:close" /> DECLINE
                                    </button>
                                    <button 
                                        onClick={() => acceptRequest(req)} 
                                        className="flex-1 bg-green-950/40 hover:bg-green-900/60 border border-green-900/50 text-green-400 py-2 rounded text-[10px] font-bold tracking-wider transition-all flex items-center justify-center gap-2"
                                    >
                                        <Icon icon="mdi:link-variant" /> ESTABLISH LINK
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* --- SEARCH SECTION --- */}
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
            <h2 className="text-xs text-gray-500 mb-2 uppercase">Recruit Operative</h2>
            <form onSubmit={handleSearch} className="flex gap-2">
                <input 
                    type="email" 
                    placeholder="Enter Agent Email"
                    className="flex-1 bg-black border border-gray-700 rounded p-2 text-sm focus:border-red-500 outline-none placeholder-gray-700"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                />
                <button type="submit" className="bg-gray-800 hover:bg-gray-700 px-4 rounded text-red-500 transition-colors">
                    <Icon icon="mdi:magnify" />
                </button>
            </form>

            {/* Search Result */}
            {searchResult && (
                <div className="mt-4 p-3 border border-yellow-700/50 bg-yellow-900/10 rounded flex justify-between items-center animate-in fade-in">
                    <div>
                        <div className="text-yellow-500 font-bold text-sm">{searchResult.fullName || "Unknown"}</div>
                        <div className="text-gray-500 text-xs">{searchResult.email}</div>
                    </div>
                    <button 
                        onClick={sendRequest} 
                        disabled={processingId === 'sending'}
                        className="bg-yellow-700/80 hover:bg-yellow-600 text-white text-xs px-3 py-2 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                        {processingId === 'sending' ? <Icon icon="mdi:loading" className="animate-spin" /> : 'SEND REQ'}
                    </button>
                </div>
            )}
        </div>

        {/* --- ROSTER LIST --- */}
        <div>
            <h2 className="text-xs text-gray-500 mb-4 uppercase flex justify-between">
                <span>Active Personnel</span>
                <span>{team.length} ASSIGNED</span>
            </h2>
            
            {team.length === 0 ? (
                <div className="text-center text-gray-700 text-xs py-8 border border-dashed border-gray-800 rounded">
                    NO OPERATIVES ASSIGNED
                </div>
            ) : (
                <div className="space-y-3">
                    {team.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-gray-900 border border-gray-800 rounded hover:border-red-900/50 transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-red-900/20 rounded-full flex items-center justify-center text-red-500 border border-red-900/50 group-hover:border-red-500 transition-colors">
                                    <Icon icon="mdi:account" />
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-gray-200">{member.fullName || "Agent"}</div>
                                    <div className="text-gray-600 text-[10px]">{member.phoneNumber || "No Comms"}</div>
                                </div>
                            </div>
                            <button 
                                onClick={() => removeFromRoster(member)} 
                                className="text-gray-700 hover:text-red-500 transition-colors p-2"
                                title="Remove"
                            >
                                <Icon icon="mdi:trash-can-outline" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default Team;