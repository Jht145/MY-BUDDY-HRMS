'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, MapPin, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AttendanceKioskModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'checkin' | 'checkout';
  onSuccess?: () => void;
}

export function AttendanceKioskModal({ isOpen, onClose, mode, onSuccess }: AttendanceKioskModalProps) {
  const { user } = useAuth();
  const [photoCaptured, setPhotoCaptured] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<string>('Detecting...');
  
  // Real webcam refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Simulation switches to help the user test within/outside geofence easily
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{
    status: 'SUCCESS' | 'WARNING' | null;
    message: string;
  }>({ status: null, message: '' });

  // Get current browser position if available
  useEffect(() => {
    if (!isOpen) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setAccuracy(`High Accuracy (±${Math.round(position.coords.accuracy)}m)`);
        },
        (error) => {
          setLatitude(12.9716);
          setLongitude(77.5946);
          setAccuracy('Simulated coordinates (Location access denied)');
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLatitude(12.9716);
      setLongitude(77.5946);
      setAccuracy('Simulated coordinates (Not supported by browser)');
    }
  }, [isOpen]);

  // Request Webcam Access and play video stream
  useEffect(() => {
    if (!isOpen) return;

    setPhotoCaptured(null);

    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        streamRef.current = stream;
      })
      .catch((err) => {
        console.error('Camera access denied or unavailable:', err);
        setAccuracy('Camera Blocked / Not Detected');
      });

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  const handleCapturePhoto = () => {
    if (videoRef.current && streamRef.current) {
      setIsCapturing(true);
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Photo = canvas.toDataURL('image/jpeg');
        setPhotoCaptured(base64Photo);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      }
      setIsCapturing(false);
    }
  };

  const handleRetakePhoto = () => {
    setPhotoCaptured(null);
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        streamRef.current = stream;
      })
      .catch((err) => {
        console.error('Camera access denied or unavailable:', err);
      });
  };

  const handleConfirmAction = () => {
    if (!user) return;
    
    const isCheckIn = mode === 'checkin';
    const actionLabel = isCheckIn ? 'Check-in' : 'Check-out';
    const statusNote = isCheckIn ? 'Outside Office Radius (Check-In)' : 'Outside Office Radius (Check-Out)';
    
    if (isWithinGeofence) {
      setFeedback({
        status: 'SUCCESS',
        message: `Location Verified. ${actionLabel} Auto-Approved!`
      });
      
      const CHECKIN_KEY = `my_buddy_hrms_checkin_${user.user_id}`;
      if (isCheckIn) {
        // Save check-in record
        const newRecord = { timestamp: Date.now(), date: new Date().toISOString().slice(0, 10) };
        localStorage.setItem(CHECKIN_KEY, JSON.stringify(newRecord));
      } else {
        // Save check-out (remove active check-in key, save into history)
        const activeRaw = localStorage.getItem(CHECKIN_KEY);
        let checkInTimestamp = Date.now() - 8 * 3600000; // fallback 8 hours ago
        if (activeRaw) {
          try {
            checkInTimestamp = JSON.parse(activeRaw).timestamp;
          } catch { /* ignore */ }
        }
        
        const HISTORY_KEY = `my_buddy_hrms_attendance_history_${user.user_id}`;
        const historyRaw = localStorage.getItem(HISTORY_KEY);
        const history = historyRaw ? JSON.parse(historyRaw) : [];
        const newLog = {
          date: new Date().toISOString().slice(0, 10),
          checkIn: checkInTimestamp,
          checkOut: Date.now()
        };
        
        localStorage.setItem(HISTORY_KEY, JSON.stringify([newLog, ...history]));
        localStorage.removeItem(CHECKIN_KEY);
      }
    } else {
      setFeedback({
        status: 'WARNING',
        message: `Outside Office Radius. Submitted ${actionLabel} for Admin Approval.`
      });
      
      // If outside geofence, save to flagged check-ins in localStorage
      const flaggedRecord = {
        name: user.name || `${user.first_name} ${user.last_name}`.trim(),
        empId: user.employee_id,
        department: user.department || 'Product Engineering',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        note: statusNote,
        coordinates: `${latitude?.toFixed(6)}, ${longitude?.toFixed(6)}`,
        photo: photoCaptured,
      };
      
      const existingRaw = localStorage.getItem('my_buddy_hrms_flagged_checkins');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      localStorage.setItem('my_buddy_hrms_flagged_checkins', JSON.stringify([flaggedRecord, ...existing]));

      // Still update local storage state for checking in/out so the UI updates
      const CHECKIN_KEY = `my_buddy_hrms_checkin_${user.user_id}`;
      if (isCheckIn) {
        const newRecord = { timestamp: Date.now(), date: new Date().toISOString().slice(0, 10) };
        localStorage.setItem(CHECKIN_KEY, JSON.stringify(newRecord));
      } else {
        localStorage.removeItem(CHECKIN_KEY);
      }
    }

    setTimeout(() => {
      onSuccess?.();
      onClose();
      setFeedback({ status: null, message: '' });
      setPhotoCaptured(null);
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="p-5 border-b border-[var(--card-border)] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[var(--brand-teal)]" />
          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)]">
              Smart Kiosk {mode === 'checkin' ? 'Check-In' : 'Check-Out'}
            </h3>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Real-time, photo &amp; geofence-verified kiosk checkout</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Geofence simulation selector */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--input-bg)] border border-[var(--card-border)] text-xs">
            <span className="font-semibold text-[var(--foreground)]">Simulate Position:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsWithinGeofence(true)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${
                  isWithinGeofence
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-transparent border-[var(--card-border)] text-[var(--text-muted)]'
                }`}
              >
                Inside Office Geofence
              </button>
              <button
                type="button"
                onClick={() => setIsWithinGeofence(false)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${
                  !isWithinGeofence
                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                    : 'bg-transparent border-[var(--card-border)] text-[var(--text-muted)]'
                }`}
              >
                Outside Office
              </button>
            </div>
          </div>

          {/* Webcam Viewfinder */}
          <div className="relative aspect-video rounded-xl border border-[var(--card-border)] bg-black flex flex-col items-center justify-center overflow-hidden">
            {photoCaptured ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 text-white gap-2 p-4">
                <img
                  src={photoCaptured}
                  alt="Captured snapshot"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 p-4">
                  <CheckCircle className="w-10 h-10 text-emerald-500 filter drop-shadow-md" />
                  <p className="text-xs font-bold filter drop-shadow-md">Snapshot captured successfully!</p>
                  <button
                    onClick={handleRetakePhoto}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-[10px] font-bold transition-colors cursor-pointer border border-white/10"
                  >
                    Retake Photo
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full h-full relative flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    disabled={isCapturing}
                    className="px-4 py-1.5 bg-[var(--brand-teal)] text-white hover:bg-[var(--brand-teal-hover)] text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-md cursor-pointer border border-teal-500/20"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isCapturing ? 'Capturing...' : 'Capture Snapshot'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Geolocation Status Badge */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)]">
            <MapPin className="w-4 h-4 text-[var(--brand-teal)] mt-0.5" />
            <div>
              <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Geolocation Coordinates</p>
              <p className="text-xs font-bold text-[var(--foreground)] mt-0.5">
                {latitude !== null ? `${latitude.toFixed(6)}, ${longitude?.toFixed(6)}` : 'Detecting...'}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{accuracy}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleConfirmAction}
              disabled={!photoCaptured}
              className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Confirm {mode === 'checkin' ? 'Check-In' : 'Check-Out'}
            </button>
            <button
              onClick={onClose}
              className="px-4 h-10 bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] font-bold text-xs uppercase rounded-lg hover:bg-[var(--card-border)]/20 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Instant feedback alert banners */}
          {feedback.status === 'SUCCESS' && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-emerald-500 text-xs font-bold animate-fadeIn">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          {feedback.status === 'WARNING' && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center gap-2 text-amber-500 text-xs font-bold animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
