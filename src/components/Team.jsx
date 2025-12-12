// src/components/Team.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, getDoc, arrayRemove } from 'firebase/firestore';

const Team = () => {
  const navigate = useNavigate();
  const [searchEmail, setSearchEmail] = useState('');
  const [team, setTeam] = useState([]);
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. FETCH MY ROSTER
  useEffect(() => {
    const fetchRoster = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const myDocRef = doc(db, "users", user.uid);
      const myDoc = await getDoc(myDocRef);

      if (myDoc.exists() && myDoc.data().roster) {
        const rosterUids = myDoc.data().roster;
        if (rosterUids.length > 0) {
            const q = query(collection(db, "users"), where("__name__", "in", rosterUids));
            const querySnapshot = await getDocs(q);
            const teamData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setTeam(teamData);
        }
      }
      setLoading(false);
    };
    fetchRoster();
  }, []);

  // 2. SEARCH FOR USER (UPDATED)
  const handleSearch = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSearchResult(null);

    const emailToSearch = searchEmail.trim().toLowerCase(); // Normalize input

    if (emailToSearch === auth.currentUser.email.toLowerCase()) {
        setError("CANNOT ADD YOURSELF");
        return;
    }

    try {
        const q = query(collection(db, "users"), where("email", "==", emailToSearch));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            setError("OPERATIVE NOT FOUND (Check Email Spelling)");
        } else {
            const userFound = querySnapshot.docs[0];
            setSearchResult({ id: userFound.id, ...userFound.data() });
        }
    } catch (err) {
        console.error("Search Error:", err);
        setError("SYSTEM ERROR: CHECK CONSOLE");
    }
  };

  // 3. ADD TO ROSTER
  const addToRoster = async () => {
    if (!searchResult) return;
    try {
        const myDocRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(myDocRef, {
            roster: arrayUnion(searchResult.id)
        });
        
        setSuccess(`AGENT ${searchResult.fullName || 'UNKNOWN'} ADDED`);
        setTeam(prev => [...prev, searchResult]);
        setSearchResult(null);
        setSearchEmail('');
    } catch (err) {
        console.error(err);
        setError("DATABASE WRITE FAILED");
    }
  };

  // 4. REMOVE FROM ROSTER
  const removeFromRoster = async (uid) => {
      if(!window.confirm("Remove operative from team?")) return;
      try {
        const myDocRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(myDocRef, { roster: arrayRemove(uid) });
        setTeam(prev => prev.filter(p => p.id !== uid));
      } catch(err) { console.error(err); }
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
        
        {/* --- SEARCH SECTION --- */}
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800">
            <h2 className="text-xs text-gray-500 mb-2 uppercase">Recruit Operative</h2>
            <form onSubmit={handleSearch} className="flex gap-2">
                <input 
                    type="email" 
                    placeholder="Enter Agent Email"
                    className="flex-1 bg-black border border-gray-700 rounded p-2 text-sm focus:border-red-500 outline-none"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                />
                <button type="submit" className="bg-gray-800 hover:bg-gray-700 px-4 rounded text-red-500">
                    <Icon icon="mdi:magnify" />
                </button>
            </form>

            {/* Error/Success Messages */}
            {error && <div className="text-red-500 text-xs mt-2">{error}</div>}
            {success && <div className="text-green-500 text-xs mt-2">{success}</div>}

            {/* Search Result Card */}
            {searchResult && (
                <div className="mt-4 p-3 border border-green-900 bg-green-900/10 rounded flex justify-between items-center animate-in fade-in">
                    <div>
                        <div className="text-green-500 font-bold text-sm">{searchResult.fullName || "Unknown"}</div>
                        <div className="text-gray-500 text-xs">{searchResult.email}</div>
                    </div>
                    <button onClick={addToRoster} className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-2 rounded">
                        ADD
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
                <div className="text-center text-gray-700 text-sm py-8 border border-dashed border-gray-800 rounded">
                    NO OPERATIVES ASSIGNED
                </div>
            ) : (
                <div className="space-y-3">
                    {team.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-gray-900 border border-gray-800 rounded hover:border-red-900/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-red-900/20 rounded-full flex items-center justify-center text-red-500 border border-red-900/50">
                                    <Icon icon="mdi:account" />
                                </div>
                                <div>
                                    <div className="font-bold text-sm">{member.fullName || "Agent"}</div>
                                    <div className="text-gray-500 text-[10px]">{member.phoneNumber || "No Comms"}</div>
                                </div>
                            </div>
                            <button onClick={() => removeFromRoster(member.id)} className="text-gray-600 hover:text-red-500">
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