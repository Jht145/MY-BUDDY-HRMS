'use client';

import React, { useState, useEffect } from 'react';
import { X, Camera, MapPin, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AttendanceKioskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckInSuccess?: () => void;
}

export function AttendanceKioskModal({ isOpen, onClose, onCheckInSuccess }: AttendanceKioskModalProps) {
  const { user } = useAuth();
  const [photoCaptured, setPhotoCaptured] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<string>('Detecting...');
  
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
          // Fallback to mock coordinates if blocked
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

  const handleCapturePhoto = () => {
    setIsCapturing(true);
    setTimeout(() => {
      // Simulate photo capture snapshot (base64 string placeholder)
      setPhotoCaptured('/public/logo_light.png'); // Use any valid reference
      setIsCapturing(false);
    }, 800);
  };

  const handleCheckIn = () => {
    if (!user) return;
    
    if (isWithinGeofence) {
      setFeedback({
        status: 'SUCCESS',
        message: 'Location Verified. Check-in Auto-Approved!'
      });
      // Save record in localStorage
      const CHECKIN_KEY = `my_buddy_hrms_checkin_${user.user_id}`;
      const newRecord = { timestamp: Date.now(), date: new Date().toISOString().slice(0, 10) };
      localStorage.setItem(CHECKIN_KEY, JSON.stringify(newRecord));
    } else {
      setFeedback({
        status: 'WARNING',
        message: 'Outside Office Radius. Submitted for Admin Approval.'
      });
    }

    setTimeout(() => {
      onCheckInSuccess?.();
      onClose();
      // Reset feedback
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
            <h3 className="text-sm font-bold text-[var(--foreground)]">Smart Kiosk Attendance</h3>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Real-time, photo &amp; geofence-verified kiosk checkout</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Geofence simulation selector (interactive toggle for user testing) */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--input-bg)] border border-[var(--card-border)] text-xs">
            <span className="font-semibold text-[var(--foreground)]">Simulate Kiosk Position:</span>
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
                Inside Office Geofence (Allowed)
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
                Outside Office (Flagged)
              </button>
            </div>
          </div>

          {/* Webcam Viewfinder Simulation */}
          <div className="relative aspect-video rounded-xl border border-[var(--card-border)] bg-black flex flex-col items-center justify-center overflow-hidden">
            {photoCaptured ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 text-white gap-2 p-4">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
                <p className="text-xs font-bold">Snapshot captured successfully!</p>
                <button
                  onClick={() => setPhotoCaptured(null)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-bold transition-colors"
                >
                  Retake Photo
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center p-4 gap-3">
                <Camera className="w-10 h-10 text-zinc-500 animate-pulse" />
                <div>
                  <p className="text-xs font-semibold text-zinc-400">Live Webcam Viewfinder</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Capturing: check_in_photo_url</p>
                </div>
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  disabled={isCapturing}
                  className="px-3 py-1.5 bg-[var(--brand-teal)] text-white hover:bg-[var(--brand-teal-hover)] text-xs font-bold rounded-lg transition-all"
                >
                  {isCapturing ? 'Capturing...' : 'Capture Snapshot'}
                </button>
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
              onClick={handleCheckIn}
              disabled={!photoCaptured}
              className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirm Check-In
            </button>
            <button
              onClick={onClose}
              className="px-4 h-10 bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] font-bold text-xs uppercase rounded-lg hover:bg-[var(--card-border)]/20 transition-colors"
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
