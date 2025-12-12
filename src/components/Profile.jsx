// src/components/Profile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    bloodType: '',
    emergencyContact: ''
  });

  // Load existing data
  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return navigate('/login');

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setFormData(docSnap.data());
      } else {
        // Pre-fill display name if available from Auth
        setFormData(prev => ({...prev, fullName: user.displayName || ''}));
      }
      setLoading(false);
    };
    fetchProfile();
  }, [navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const user = auth.currentUser;
      
      // --- THE FIX IS HERE ---
      // We combine the form data with the Auth data (Email & UID)
      // This ensures the email is permanently saved to the database for searching.
      const dataToSave = {
          ...formData,
          email: user.email.toLowerCase(), // <--- INJECTING EMAIL HERE
          uid: user.uid
      };

      // Save to "users" collection with UID as document ID
      await setDoc(doc(db, "users", user.uid), dataToSave, { merge: true });
      
      navigate('/dashboard');
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-green-500 font-mono">LOADING DOSSIER...</div>;

  return (
    <div className="min-h-screen bg-black text-white font-mono p-6 flex flex-col items-center">
      
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-xl font-bold text-cyan-500 tracking-widest">AGENT PROFILE</h1>
        <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white">
          <Icon icon="mdi:close" className="text-2xl" />
        </button>
      </div>

      <form onSubmit={handleSave} className="w-full max-w-md space-y-6">
        
        {/* Full Name */}
        <div className="space-y-2">
          <label className="text-xs text-gray-500 uppercase">Operative Name</label>
          <div className="relative">
            <Icon icon="mdi:account" className="absolute left-3 top-3.5 text-cyan-600" />
            <input 
              type="text" 
              required
              className="w-full bg-gray-900 border border-gray-700 rounded p-3 pl-10 focus:border-cyan-500 focus:outline-none"
              value={formData.fullName || ''} // Added || '' to prevent uncontrolled input warning
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            />
          </div>
        </div>

        {/* Phone Number (Crucial) */}
        <div className="space-y-2">
          <label className="text-xs text-gray-500 uppercase">Secure Comms (Phone)</label>
          <div className="relative">
            <Icon icon="mdi:phone" className="absolute left-3 top-3.5 text-cyan-600" />
            <input 
              type="tel" 
              required
              placeholder="+234..."
              className="w-full bg-gray-900 border border-gray-700 rounded p-3 pl-10 focus:border-cyan-500 focus:outline-none"
              value={formData.phoneNumber || ''}
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
            />
          </div>
        </div>

        {/* Blood Type / Medical */}
        <div className="flex gap-4">
          <div className="space-y-2 flex-1">
            <label className="text-xs text-gray-500 uppercase">Blood Type</label>
            <select 
              className="w-full bg-gray-900 border border-gray-700 rounded p-3 focus:border-cyan-500 focus:outline-none"
              value={formData.bloodType || ''}
              onChange={(e) => setFormData({...formData, bloodType: e.target.value})}
            >
              <option value="">Unknown</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="space-y-2">
            <label className="text-xs text-gray-500 uppercase">Next of Kin (Phone)</label>
            <input 
              type="tel" 
              className="w-full bg-gray-900 border border-gray-700 rounded p-3 focus:border-cyan-500 focus:outline-none"
              value={formData.emergencyContact || ''}
              onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
            />
        </div>

        <button 
          type="submit" 
          disabled={saving}
          className="w-full bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-4 rounded shadow-[0_0_20px_rgba(6,182,212,0.3)] mt-8 uppercase tracking-widest transition-all"
        >
          {saving ? 'UPLOADING...' : 'UPDATE RECORD'}
        </button>

      </form>
    </div>
  );
};

export default Profile;