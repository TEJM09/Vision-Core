
import React, { useRef, useEffect, useState } from 'react';
import { TrackingConfig } from '../types';

interface VisionTrackerProps {
  onHandUpdate: (x: number, detected: boolean) => void;
  config: TrackingConfig;
}

const VisionTracker: React.FC<VisionTrackerProps> = ({ onHandUpdate, config }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const procCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const [error, setError] = useState<string | null>(null);

  // Kalman Filter State for high-precision 1D tracking
  const kalmanX = useRef({
    x: 0.5,    // Estimated position
    p: 1.0,    // Error covariance
    q: 0.015,  // Process noise (how much the object is expected to move)
    r: 0.15    // Measurement noise (how much jitter is in the sensor)
  });

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 320 }, 
            height: { ideal: 240 }, 
            frameRate: { ideal: 60 }
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        setError("SENSOR OFFLINE");
      }
    }
    setupCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const procCanvas = procCanvasRef.current;
    procCanvas.width = 40; 
    procCanvas.height = 30;
    const procCtx = procCanvas.getContext('2d', { willReadFrequently: true });

    const processFrame = () => {
      const video = videoRef.current;
      const displayCanvas = canvasRef.current;
      
      if (!video || !displayCanvas || video.readyState !== 4 || !procCtx) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      const displayCtx = displayCanvas.getContext('2d');
      if (!displayCtx) return;

      // Draw mirrored mini-feed for preview
      displayCtx.save();
      displayCtx.scale(-1, 1);
      displayCtx.drawImage(video, -displayCanvas.width, 0, displayCanvas.width, displayCanvas.height);
      displayCtx.restore();

      // Draw to small proc canvas for processing
      procCtx.save();
      procCtx.scale(-1, 1);
      procCtx.drawImage(video, -procCanvas.width, 0, procCanvas.width, procCanvas.height);
      procCtx.restore();

      const imageData = procCtx.getImageData(0, 0, procCanvas.width, procCanvas.height);
      const data = imageData.data;
      
      let sumX = 0;
      let count = 0;

      // Centroid calculation using high-luminance pixels
      for (let i = 0; i < data.length; i += 16) { 
        const r = data[i], g = data[i+1], b = data[i+2];
        const brightness = (r + g + b) / 3;

        if (brightness > 150) { 
          const px = (i / 4) % procCanvas.width;
          sumX += px;
          count++;
        }
      }

      if (count > 8) { 
        const rawMeasurement = (sumX / count) / procCanvas.width;
        
        // Range mapping for player comfort (outer 10% on edges is mapped to full bounds)
        let z = (rawMeasurement - 0.15) / 0.7;
        z = Math.max(0, Math.min(1, z));

        // --- Kalman Filter Update Step ---
        const k = kalmanX.current;
        
        // 1. Prediction (Time Update)
        // x = x (assuming position is mostly same, motion covered by process noise q)
        k.p = k.p + k.q;
        
        // 2. Kalman Gain Calculation
        const gain = k.p / (k.p + k.r);
        
        // 3. Measurement Update (Correction)
        k.x = k.x + gain * (z - k.x);
        
        // 4. Update Error Covariance
        k.p = (1 - gain) * k.p;

        onHandUpdate(k.x, true);
        
        // Tracking HUD Overlay
        const dx = k.x * displayCanvas.width;
        displayCtx.strokeStyle = '#22c55e';
        displayCtx.lineWidth = 4;
        displayCtx.shadowBlur = 10;
        displayCtx.shadowColor = '#22c55e';
        displayCtx.beginPath();
        displayCtx.arc(dx, displayCanvas.height/2, 14, 0, Math.PI * 2);
        displayCtx.stroke();
        
        // Horizontal scan line
        displayCtx.lineWidth = 1;
        displayCtx.beginPath();
        displayCtx.moveTo(dx, 0);
        displayCtx.lineTo(dx, displayCanvas.height);
        displayCtx.stroke();
        displayCtx.shadowBlur = 0;
      } else {
        onHandUpdate(kalmanX.current.x, false);
      }

      animationFrameId = requestAnimationFrame(processFrame);
    };

    animationFrameId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animationFrameId);
  }, [onHandUpdate]);

  return (
    <div className="relative w-full h-40 rounded-3xl overflow-hidden border border-white/10 bg-black shadow-inner">
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} width={160} height={120} className="w-full h-full object-cover opacity-60 grayscale sepia brightness-110 contrast-125" />
      
      {/* UI Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none p-3 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="flex gap-1">
             <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
             <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse delay-75" />
             <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse delay-150" />
          </div>
          <span className="text-[7px] font-black text-white/40 uppercase tracking-[0.2em]">Kalman Filter Active</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="h-[1px] flex-1 bg-white/10" />
          <div className="text-[9px] font-black tracking-widest text-white/50 uppercase">Neural Stream</div>
          <div className="h-[1px] flex-1 bg-white/10" />
        </div>
      </div>

      {error && (
        <div className="absolute inset-0 bg-red-500/40 backdrop-blur-md flex flex-col items-center justify-center gap-2 border-2 border-red-500/50">
          <span className="text-3xl">⚠️</span>
          <span className="text-[10px] font-black text-white uppercase tracking-tighter">{error}</span>
          <span className="text-[8px] text-white/70">CHECK PERMISSIONS</span>
        </div>
      )}
    </div>
  );
};

export default VisionTracker;
