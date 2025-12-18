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
  
  // Track specific errors for fields
  const [errors, setErrors] = useState({ fullName: '', phoneNumber: '' });

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '', 
    bloodType: '',
    emergencyContact: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return navigate('/login');

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        // Strip +234 for display
        let displayPhone = data.phoneNumber || '';
        if (displayPhone.startsWith('+234')) displayPhone = displayPhone.substring(4);
        else if (displayPhone.startsWith('0')) displayPhone = displayPhone.substring(1);

        setFormData({ ...data, phoneNumber: displayPhone });
      } else {
        setFormData(prev => ({...prev, fullName: user.displayName || ''}));
      }
      setLoading(false);
    };
    fetchProfile();
  }, [navigate]);

  // --- STRICT INPUT HANDLERS ---

  const handlePhoneInput = (e) => {
      // Allow only numbers
      const val = e.target.value.replace(/\D/g, '');
      // Strict Limit: Stop updating state if > 10
      if (val.length <= 10) {
          setFormData({ ...formData, phoneNumber: val });
          // Clear error if user is typing
          if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: '' });
      }
  };

  const handleNameInput = (e) => {
      setFormData({ ...formData, fullName: e.target.value });
      if (errors.fullName) setErrors({ ...errors, fullName: '' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({ fullName: '', phoneNumber: '' }); // Reset errors

    let hasError = false;
    const newErrors = {};

    // 1. Validation: Name Length
    if (formData.fullName.trim().length < 4) {
        newErrors.fullName = "Name is too short (Minimum 4 characters)";
        hasError = true;
    }

    // 2. Validation: Exact 10 Digits
    if (formData.phoneNumber.length !== 10) {
        newErrors.phoneNumber = `Invalid length: ${formData.phoneNumber.length}/10 digits entered`;
        hasError = true;
    }

    if (hasError) {
        setErrors(newErrors);
        setSaving(false);
        return;
    }

    try {
      const user = auth.currentUser;
      const fullPhoneNumber = `+234${formData.phoneNumber}`;

      const dataToSave = {
          ...formData,
          phoneNumber: fullPhoneNumber,
          email: user.email.toLowerCase(), 
          uid: user.uid
      };

      await setDoc(doc(db, "users", user.uid), dataToSave, { merge: true });
      navigate('/dashboard');
    } catch (error) {
      console.error("Error saving profile:", error);
      // Fallback alert for network errors
      alert("System Error: Could not save data.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-red-500 font-mono animate-pulse">LOADING DOSSIER...</div>;

  return (
    <div className="min-h-screen bg-black text-white font-mono p-6 flex flex-col items-center">
      
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
              className={`w-full bg-gray-900 border rounded p-3 pl-10 focus:outline-none focus:ring-1 ${errors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:border-cyan-500 focus:ring-cyan-500'}`}
              value={formData.fullName || ''}
              onChange={handleNameInput}
            />
          </div>
          {/* INLINE WARNING */}
          {errors.fullName && <p className="text-[10px] text-red-500 font-bold flex items-center gap-1"><Icon icon="mdi:alert-circle" /> {errors.fullName}</p>}
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <label className="text-xs text-gray-500 uppercase">Secure Comms (Phone)</label>
          <div className={`flex bg-gray-900 border rounded overflow-hidden ${errors.phoneNumber ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-700 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500'}`}>
            {/* Fixed Prefix */}
            <div className="bg-gray-800 px-3 py-3 text-gray-400 border-r border-gray-700 flex items-center font-bold select-none">
                +234
            </div>
            {/* Input - Type TEXT to remove arrows, InputMode NUMERIC for mobile keyboard */}
            <input 
              type="text" 
              inputMode="numeric"
              required
              placeholder="803 123 4567"
              className="flex-1 bg-transparent p-3 outline-none text-white appearance-none"
              value={formData.phoneNumber || ''}
              onChange={handlePhoneInput}
            />
          </div>
          
          <div className="flex justify-between items-start">
              {/* INLINE WARNING */}
              {errors.phoneNumber ? (
                  <p className="text-[10px] text-red-500 font-bold flex items-center gap-1"><Icon icon="mdi:alert-circle" /> {errors.phoneNumber}</p>
              ) : (
                  <p className="text-[10px] text-gray-500">Enter exactly 10 digits (omit the first '0')</p>
              )}
              {/* Character Counter */}
              <span className={`text-[10px] ${formData.phoneNumber.length === 10 ? 'text-green-500' : 'text-gray-600'}`}>
                  {formData.phoneNumber.length}/10
              </span>
          </div>
        </div>

        {/* Blood Type */}
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
          {saving ? 'SECURING DATA...' : 'UPDATE RECORD'}
        </button>

      </form>
    </div>
  );
};

export default Profile;