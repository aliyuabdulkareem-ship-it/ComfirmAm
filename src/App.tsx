/**
 * ConfirmAm - Multi-Source Counterfeit Product Detection
 * Complete Single-File Application
 *
 * FEATURES:
 * - Camera capture (FIXED: video element always in DOM)
 * - NAFDAC number verification
 * - Barcode verification
 * - Multi-source results (NAFDAC, Open Food Facts, Go-UPC)
 * - Desktop & Mobile responsive design
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Camera, Keyboard, Shield, AlertTriangle, CheckCircle, Info,
  X, RefreshCw, Upload, Zap, ArrowLeft, Scan, FileSearch, Database,
  Phone, ExternalLink, Home, Search, AlertCircle, XCircle,
  Barcode, Globe
} from 'lucide-react';
import {
  runMultiSourceVerification,
  validateNafdacFormat,
  VerificationResult,
  VerificationInput,
  SourceResult,
  VerificationStatus
} from './services/verificationEngine';

type AppScreen = 'home' | 'camera' | 'processing' | 'results' | 'manual' | 'barcode';
type ProcessingStage = 'analyzing' | 'extracting' | 'verifying' | 'completing';

// ============================================================================
// HOME SCREEN
// ============================================================================

const HomeScreen: React.FC<{ onNavigate: (screen: AppScreen) => void }> = ({ onNavigate }) => (
  <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50/30">
    {/* Desktop wrapper */}
    <div className="md:max-w-2xl md:mx-auto md:py-8">
      <div className="md:bg-white md:rounded-3xl md:shadow-xl md:overflow-hidden">
        {/* Header */}
        <header className="bg-gradient-to-br from-emerald-700 to-emerald-800 text-white px-5 py-6 pb-8 md:rounded-t-3xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ConfirmAm</h1>
              <p className="text-emerald-100 text-xs">Multi-Source Product Verifier</p>
            </div>
          </div>
          <p className="text-emerald-50 text-sm leading-relaxed">
            Verify products using NAFDAC registry, barcode databases, and global food APIs.
          </p>
        </header>

        {/* Main Content */}
        <main className="px-5 -mt-4 pb-8">
          {/* Scan Product */}
          <button
            onClick={() => onNavigate('camera')}
            className="w-full bg-white rounded-2xl shadow-md border border-gray-100 p-5 mb-3
                       hover:shadow-lg hover:border-emerald-200 transition-all duration-200 text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl
                            flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Camera className="w-7 h-7 text-emerald-700" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Scan Product</h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Take a photo of product packaging for AI analysis.
                </p>
                <div className="flex items-center gap-1 mt-2 text-emerald-700 text-xs font-semibold">
                  <span>Tap to start camera</span>
                  <span>→</span>
                </div>
              </div>
            </div>
          </button>

          {/* Enter NAFDAC Number */}
          <button
            onClick={() => onNavigate('manual')}
            className="w-full bg-white rounded-2xl shadow-md border border-gray-100 p-5 mb-3
                       hover:shadow-lg hover:border-blue-200 transition-all duration-200 text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl
                            flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Keyboard className="w-7 h-7 text-blue-700" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Enter NAFDAC Number</h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Verify against NAFDAC Greenbook registry.
                </p>
                <div className="flex items-center gap-1 mt-2 text-blue-700 text-xs font-semibold">
                  <span>NAFDAC verification</span>
                  <span>→</span>
                </div>
              </div>
            </div>
          </button>

          {/* Scan Barcode */}
          <button
            onClick={() => onNavigate('barcode')}
            className="w-full bg-white rounded-2xl shadow-md border border-gray-100 p-5 mb-6
                       hover:shadow-lg hover:border-purple-200 transition-all duration-200 text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl
                            flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Barcode className="w-7 h-7 text-purple-700" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Scan Barcode</h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Check barcode against global product databases.
                </p>
                <div className="flex items-center gap-1 mt-2 text-purple-700 text-xs font-semibold">
                  <span>Barcode verification</span>
                  <span>→</span>
                </div>
              </div>
            </div>
          </button>

          {/* Verification Sources */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              Verification Sources
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center text-base">🏛️</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">NAFDAC Greenbook</p>
                  <p className="text-xs text-gray-500">8,949+ registered products</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-base">🥫</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">Open Food Facts</p>
                  <p className="text-xs text-gray-500">4M+ food products globally</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center text-base">📊</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">Barcode Database</p>
                  <p className="text-xs text-gray-500">Global product lookup</p>
                </div>
              </div>
            </div>
          </div>

          {/* Result Meanings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <h3 className="text-base font-bold text-gray-900 mb-3">Result Meanings</h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Verified / Safe</p>
                  <p className="text-xs text-gray-500">Confirmed across multiple sources</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Warning / Unverified</p>
                  <p className="text-xs text-gray-500">Limited data, exercise caution</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-800">Likely Counterfeit</p>
                  <p className="text-xs text-gray-500">Do not use this product</p>
                </div>
              </div>
            </div>
          </div>

          <footer className="text-center pb-4">
            <p className="text-xs text-gray-400">ConfirmAm v2.0 • Multi-Source Verification</p>
            <p className="text-xs text-gray-400 mt-1">Results are advisory. Always consult professionals.</p>
          </footer>
        </main>
      </div>
    </div>
  </div>
);

// ============================================================================
// CAMERA CAPTURE (FIXED)
// ============================================================================

const CameraCapture: React.FC<{ onCapture: (imageBase64: string) => void; onBack: () => void }> = ({ onCapture, onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Initialize camera on mount
  useEffect(() => {
    let isMounted = true;

    const initCamera = async () => {
      try {
        // Request camera access
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (!isMounted) {
          mediaStream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = mediaStream;

        // CRITICAL FIX: Video element must be in DOM before we set srcObject
        // We wait a tick to ensure the video element is rendered
        await new Promise(resolve => setTimeout(resolve, 50));

        if (videoRef.current && isMounted) {
          videoRef.current.srcObject = mediaStream;

          // CRITICAL FIX: Explicitly call play() - don't rely on autoplay
          try {
            await videoRef.current.play();
          } catch (playError) {
            console.warn('[Camera] Play error:', playError);
          }

          // Wait for video to actually start playing
          const waitForVideo = () => new Promise<void>((resolve) => {
            if (!videoRef.current) { resolve(); return; }

            if (videoRef.current.readyState >= 2) {
              resolve();
              return;
            }

            const onLoaded = () => {
              resolve();
              videoRef.current?.removeEventListener('loadeddata', onLoaded);
            };

            videoRef.current.addEventListener('loadeddata', onLoaded);

            // Timeout fallback - resolve anyway after 2 seconds
            setTimeout(() => {
              resolve();
              videoRef.current?.removeEventListener('loadeddata', onLoaded);
            }, 2000);
          });

          await waitForVideo();

          if (isMounted) {
            setCameraReady(true);
            setIsLoading(false);
          }
        }
      } catch (err) {
        if (!isMounted) return;

        console.error('[Camera] Error:', err);

        let errorMessage = 'Could not access camera.';
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError') {
            errorMessage = 'Camera permission denied. Please allow camera access in your browser settings and try again.';
          } else if (err.name === 'NotFoundError') {
            errorMessage = 'No camera found on this device. You can upload a photo instead.';
          } else if (err.name === 'NotReadableError') {
            errorMessage = 'Camera is being used by another app. Please close other apps and try again.';
          }
        }

        setError(errorMessage);
        setIsLoading(false);
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.85);

    // Stop camera after capture
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setCapturedImage(imageData);
    setCameraReady(false);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setCapturedImage(result);
      setCameraReady(false);
    };
    reader.readAsDataURL(file);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setError(null);
    setIsLoading(true);
    // Re-init camera
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between safe-top">
        <button
          onClick={onBack}
          className="w-11 h-11 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center
                     active:bg-black/80 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <span className="text-white text-sm font-medium bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
          Scan Product
        </span>
        <div className="w-11" />
      </div>

      {/* Camera View Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
        {/*
          CRITICAL FIX: Video element is ALWAYS in the DOM.
          We control visibility with opacity, not conditional rendering.
          This ensures onloadedmetadata can fire properly.
        */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          style={{
            opacity: cameraReady && !capturedImage && !error ? 1 : 0,
            zIndex: 1
          }}
        />

        {/* Captured Image Preview */}
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured product"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ zIndex: 2 }}
          />
        )}

        {/* Loading State */}
        {isLoading && !error && !capturedImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-black" style={{ zIndex: 3 }}>
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white text-sm">Starting camera...</p>
              <p className="text-gray-400 text-xs mt-2">Please allow camera access if prompted</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !capturedImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-black px-6" style={{ zIndex: 3 }}>
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-10 h-10 text-gray-500" />
              </div>
              <p className="text-white text-sm mb-6 leading-relaxed">{error}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium
                           active:bg-emerald-700 transition-colors inline-flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload Photo Instead
              </button>
            </div>
          </div>
        )}

        {/* Scanning Guide Overlay */}
        {cameraReady && !capturedImage && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 4 }}>
            <div className="w-72 h-72 md:w-80 md:h-80 border-2 border-white/40 rounded-3xl relative">
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl" />
              <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl" />
              <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl" />
              <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl" />

              {/* Instruction */}
              <div className="absolute -bottom-16 left-0 right-0 text-center">
                <p className="text-white text-sm bg-black/70 backdrop-blur px-4 py-2 rounded-full inline-block">
                  Position product label within frame
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-black/95 backdrop-blur-sm p-6 pb-8 safe-bottom" style={{ zIndex: 5 }}>
        {capturedImage ? (
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={retakePhoto}
              className="w-14 h-14 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
              aria-label="Retake photo"
            >
              <RefreshCw className="w-6 h-6 text-white" />
            </button>

            <button
              onClick={() => capturedImage && onCapture(capturedImage)}
              className="w-20 h-20 bg-emerald-600 hover:bg-emerald-500 rounded-full flex items-center justify-center
                         shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
              aria-label="Analyze product"
            >
              <Zap className="w-8 h-8 text-white" />
            </button>

            <button
              onClick={onBack}
              className="w-14 h-14 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
              aria-label="Cancel"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        ) : !error && cameraReady ? (
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-14 h-14 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
              aria-label="Upload photo"
            >
              <Upload className="w-6 h-6 text-white" />
            </button>

            <button
              onClick={capturePhoto}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center
                         shadow-lg transition-all active:scale-95"
              aria-label="Take photo"
            >
              <div className="w-16 h-16 bg-white rounded-full border-4 border-gray-300
                            flex items-center justify-center">
                <Camera className="w-7 h-7 text-gray-700" />
              </div>
            </button>

            <div className="w-14" />
          </div>
        ) : null}

        {!capturedImage && !error && cameraReady && (
          <p className="text-center text-gray-400 text-xs mt-4">
            Make sure the product label is clearly visible and well-lit
          </p>
        )}
      </div>

      {/* Hidden elements */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
};

// ============================================================================
// BARCODE ENTRY
// ============================================================================

const BarcodeEntry: React.FC<{ onSubmit: (barcode: string) => void; onBack: () => void }> = ({ onSubmit, onBack }) => {
  const [barcode, setBarcode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = barcode.replace(/[\s-]/g, '');

    if (!clean) { setError('Please enter a barcode number'); return; }
    if (clean.length < 8 || clean.length > 14) { setError('Barcode should be 8-14 digits'); return; }
    if (!/^\d+$/.test(clean)) { setError('Barcode should contain only numbers'); return; }

    onSubmit(clean);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="md:max-w-2xl md:mx-auto md:py-8">
        <div className="md:bg-white md:rounded-3xl md:shadow-xl md:overflow-hidden">
          <header className="bg-gradient-to-br from-purple-700 to-purple-800 text-white px-5 py-4 pb-6 md:rounded-t-3xl">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={onBack} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-bold">Barcode Verification</h1>
            </div>
            <p className="text-purple-100 text-sm">Enter the barcode number found on the product packaging.</p>
          </header>

          <main className="px-5 -mt-3 pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
                <label className="block text-sm font-semibold text-gray-800 mb-2">Barcode Number *</label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => { setBarcode(e.target.value.replace(/\D/g, '')); setError(null); }}
                  placeholder="e.g., 6156000100158"
                  maxLength={14}
                  className={`w-full px-4 py-3.5 text-lg font-mono border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                  autoComplete="off"
                  inputMode="numeric"
                />
                {error && <div className="flex items-center gap-2 mt-2 text-red-600"><AlertCircle className="w-4 h-4" /><span className="text-xs">{error}</span></div>}
                <p className="text-xs text-gray-500 mt-2">Usually 13 digits (EAN) or 12 digits (UPC) found near the barcode stripes</p>
              </div>

              <button type="submit" disabled={!barcode} className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${barcode ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20 hover:bg-purple-500 active:scale-[0.98]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                <Search className="w-5 h-5" />Verify Barcode
              </button>
            </form>

            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 mt-6 mb-4">
              <p className="text-xs text-purple-800 font-medium mb-2">Example Barcodes (tap to try):</p>
              <div className="flex flex-wrap gap-2">
                {['6156000100158', '5449000000996', '7613034262288'].map(code => (
                  <button key={code} type="button" onClick={() => setBarcode(code)} className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-mono text-purple-700 hover:bg-purple-50">{code}</button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-gray-500" />Where to Find the Barcode
              </h3>
              <div className="space-y-2">
                <p className="text-xs text-gray-600">• On the back or side of packaging</p>
                <p className="text-xs text-gray-600">• Below the black and white stripes</p>
                <p className="text-xs text-gray-600">• Usually 12-13 digits long</p>
                <p className="text-xs text-gray-600">• Different from the NAFDAC number</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MANUAL NAFDAC ENTRY
// ============================================================================

const ManualCheck: React.FC<{ onSubmit: (nafdacNumber: string) => void; onBack: () => void }> = ({ onSubmit, onBack }) => {
  const [nafdacNumber, setNafdacNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleNafdacChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (cleaned.length > 2 && !cleaned.includes('-') && cleaned.length <= 10) {
      setNafdacNumber(`${cleaned.slice(0, 2)}-${cleaned.slice(2)}`);
    } else {
      setNafdacNumber(cleaned);
    }
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nafdacNumber.trim()) { setError('Please enter a NAFDAC number'); return; }
    const validation = validateNafdacFormat(nafdacNumber);
    if (!validation.valid) { setError('Invalid format. Use: A4-0123 or 04-1234'); return; }
    onSubmit(nafdacNumber.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="md:max-w-2xl md:mx-auto md:py-8">
        <div className="md:bg-white md:rounded-3xl md:shadow-xl md:overflow-hidden">
          <header className="bg-gradient-to-br from-blue-700 to-blue-800 text-white px-5 py-4 pb-6 md:rounded-t-3xl">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={onBack} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-bold">NAFDAC Verification</h1>
            </div>
            <p className="text-blue-100 text-sm">Enter the NAFDAC registration number from product packaging.</p>
          </header>

          <main className="px-5 -mt-3 pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
                <label className="block text-sm font-semibold text-gray-800 mb-2">NAFDAC Registration Number *</label>
                <input type="text" value={nafdacNumber} onChange={(e) => handleNafdacChange(e.target.value)} placeholder="e.g., A4-0123" maxLength={10} className={`w-full px-4 py-3.5 text-lg font-mono border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`} autoComplete="off" />
                {error && <div className="flex items-center gap-2 mt-2 text-red-600"><AlertCircle className="w-4 h-4" /><span className="text-xs">{error}</span></div>}
                <p className="text-xs text-gray-500 mt-2">Format: XX-XXXX (e.g., A4-0123, 04-1234, B4-5678)</p>
              </div>

              <button type="submit" disabled={!nafdacNumber} className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${nafdacNumber ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 active:scale-[0.98]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                <Search className="w-5 h-5" />Verify Product
              </button>
            </form>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mt-6 mb-4">
              <p className="text-xs text-blue-800 font-medium mb-2">Example NAFDAC Numbers (tap to try):</p>
              <div className="flex flex-wrap gap-2">
                {['A4-0123', '04-0123', '01-2345', 'A2-0789', '08-7712'].map(num => (
                  <button key={num} type="button" onClick={() => handleNafdacChange(num)} className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-sm font-mono text-blue-700 hover:bg-blue-50">{num}</button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-gray-500" />NAFDAC Number Prefixes
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 rounded-lg p-2"><span className="font-mono font-bold text-blue-700">01/A1</span> Food</div>
                <div className="bg-gray-50 rounded-lg p-2"><span className="font-mono font-bold text-blue-700">02/A2</span> Water</div>
                <div className="bg-gray-50 rounded-lg p-2"><span className="font-mono font-bold text-blue-700">03/A3</span> Medical Devices</div>
                <div className="bg-gray-50 rounded-lg p-2"><span className="font-mono font-bold text-blue-700">04/A4</span> Drugs (Local)</div>
                <div className="bg-gray-50 rounded-lg p-2"><span className="font-mono font-bold text-blue-700">05/A5</span> Cosmetics</div>
                <div className="bg-gray-50 rounded-lg p-2"><span className="font-mono font-bold text-blue-700">B4</span> Drugs (Imported)</div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PROCESSING SCREEN
// ============================================================================

const ProcessingScreen: React.FC<{ stage: ProcessingStage; currentSource?: string }> = ({ stage, currentSource }) => {
  const STAGES = [
    { id: 'analyzing', label: 'Analyzing Input', icon: Scan },
    { id: 'extracting', label: 'Checking Sources', icon: FileSearch },
    { id: 'verifying', label: 'Verifying Product', icon: Database },
    { id: 'completing', label: 'Generating Results', icon: CheckCircle },
  ];

  const currentIndex = STAGES.findIndex(s => s.id === stage);
  const CurrentIcon = STAGES[currentIndex]?.icon || Scan;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center px-6">
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full border-4 border-emerald-500/20 flex items-center justify-center">
          <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin" />
          <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700">
            <CurrentIcon className="w-10 h-10 text-emerald-400" />
          </div>
        </div>
      </div>

      <h2 className="text-white text-xl font-bold mb-2">{STAGES[currentIndex]?.label}</h2>
      {currentSource && <p className="text-emerald-400 text-sm mb-2">Checking: {currentSource}</p>}
      <p className="text-gray-400 text-sm text-center mb-8 max-w-xs">Verifying across multiple databases...</p>

      <div className="w-full max-w-xs space-y-3">
        {STAGES.map((stageItem, index) => {
          const StageIcon = stageItem.icon;
          const isActive = index === currentIndex;
          const isComplete = index < currentIndex;
          return (
            <div key={stageItem.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive ? 'bg-emerald-500/10 border border-emerald-500/30' : isComplete ? 'bg-gray-800/50 border border-gray-700/50' : 'bg-transparent border border-transparent'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-emerald-500/20' : isComplete ? 'bg-emerald-600' : 'bg-gray-700'}`}>
                {isComplete ? <CheckCircle className="w-4 h-4 text-white" /> : <StageIcon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-gray-500'}`} />}
              </div>
              <p className={`text-sm font-medium flex-1 ${isActive ? 'text-emerald-300' : isComplete ? 'text-gray-400' : 'text-gray-600'}`}>{stageItem.label}</p>
              {isActive && <div className="flex gap-1"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// RESULTS DASHBOARD
// ============================================================================

const ResultsDashboard: React.FC<{ result: VerificationResult; onNavigate: (screen: AppScreen) => void; onRescan: () => void }> = ({ result, onNavigate, onRescan }) => {
  const STATUS_CONFIG = {
    safe: { bgGradient: 'from-green-50 to-emerald-50', headerBg: 'bg-gradient-to-br from-green-600 to-emerald-700', textColor: 'text-green-800', label: 'Verified ✓', title: 'Product Appears Genuine', Icon: CheckCircle },
    warning: { bgGradient: 'from-amber-50 to-yellow-50', headerBg: 'bg-gradient-to-br from-amber-500 to-orange-600', textColor: 'text-amber-800', label: 'Warning ⚠', title: 'Limited Verification Data', Icon: AlertTriangle },
    counterfeit: { bgGradient: 'from-red-50 to-rose-50', headerBg: 'bg-gradient-to-br from-red-600 to-rose-700', textColor: 'text-red-800', label: 'Counterfeit ✕', title: 'Likely Counterfeit Product', Icon: XCircle },
    pending: { bgGradient: 'from-gray-50 to-slate-50', headerBg: 'bg-gray-500', textColor: 'text-gray-800', label: 'Pending', title: 'Verification Incomplete', Icon: AlertTriangle }
  };

  const config = STATUS_CONFIG[result.overallStatus];
  const StatusIcon = config.Icon;

  return (
    <div className={`min-h-screen bg-gradient-to-b ${config.bgGradient}`}>
      <div className="md:max-w-2xl md:mx-auto md:py-8">
        <div className="md:bg-white md:rounded-3xl md:shadow-xl md:overflow-hidden">
          <div className={`${config.headerBg} px-5 pt-5 pb-8 md:rounded-t-3xl`}>
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => onNavigate('home')} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <span className="text-white/90 text-sm font-medium">Verification Result</span>
              <div className="w-10" />
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <StatusIcon className="w-10 h-10 text-white" />
              </div>
              <div className="inline-block bg-white/20 px-4 py-1 rounded-full mb-3">
                <span className="text-white font-bold text-sm">{config.label}</span>
              </div>
              <h1 className="text-white text-2xl font-bold mb-1">{config.title}</h1>
              {result.productName && <p className="text-white/90 text-sm mt-2 font-medium">{result.productName}</p>}
              {result.manufacturer && <p className="text-white/70 text-xs mt-1">{result.manufacturer}</p>}
            </div>
          </div>

          <div className="px-5 -mt-4 pb-8">
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Confidence Level</span>
                <span className={`text-lg font-bold ${config.textColor}`}>{Math.round(result.overallConfidence)}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${result.overallStatus === 'safe' ? 'bg-green-500' : result.overallStatus === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${result.overallConfidence}%` }} />
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-gray-800">{result.details.sourcesChecked}</p>
                  <p className="text-xs text-gray-500">Sources</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600">{result.details.sourcesFound}</p>
                  <p className="text-xs text-gray-500">Found</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-800">{result.details.crossReferenceMatch ? '✓' : '—'}</p>
                  <p className="text-xs text-gray-500">Cross-Ref</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-4">
              <h3 className="text-base font-bold text-gray-900 mb-3">Verification Sources</h3>
              <div className="space-y-2">
                {result.sources.map((source) => <SourceCard key={source.id} source={source} />)}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-4">
              <h3 className="text-base font-bold text-gray-900 mb-3">What You Should Do</h3>
              <div className="space-y-2">
                {result.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold ${result.overallStatus === 'safe' ? 'bg-green-100 text-green-700' : result.overallStatus === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{index + 1}</span>
                    <p className="text-sm text-gray-700 leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            {result.overallStatus === 'counterfeit' && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                <h3 className="text-base font-bold text-red-800 mb-2 flex items-center gap-2"><Phone className="w-4 h-4" />Report This Product</h3>
                <div className="space-y-2">
                  <a href="tel:08006233221" className="flex items-center gap-2 bg-white border border-red-200 rounded-xl p-3 active:bg-red-50">
                    <Phone className="w-5 h-5 text-red-600" />
                    <div><p className="text-sm font-bold text-red-800">Call NAFDAC Hotline</p><p className="text-xs text-red-600">0800-NAFDAC-1 (0800-6233-221)</p></div>
                  </a>
                  <a href="https://registration.nafdac.gov.ng/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white border border-red-200 rounded-xl p-3 active:bg-red-50">
                    <ExternalLink className="w-5 h-5 text-red-600" />
                    <div><p className="text-sm font-bold text-red-800">Verify on NAFDAC Portal</p><p className="text-xs text-red-600">registration.nafdac.gov.ng</p></div>
                  </a>
                  <a href="https://greenbook.nafdac.gov.ng/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white border border-red-200 rounded-xl p-3 active:bg-red-50">
                    <ExternalLink className="w-5 h-5 text-red-600" />
                    <div><p className="text-sm font-bold text-red-800">Search NAFDAC Greenbook</p><p className="text-xs text-red-600">greenbook.nafdac.gov.ng</p></div>
                  </a>
                </div>
              </div>
            )}

            <div className="flex gap-3 mb-8">
              <button onClick={onRescan} className="flex-1 bg-white border-2 border-gray-200 rounded-xl py-3.5 px-4 font-medium text-gray-700 flex items-center justify-center gap-2 hover:border-gray-300 transition-colors">
                <RefreshCw className="w-4 h-4" />Scan Again
              </button>
              <button onClick={() => onNavigate('home')} className="flex-1 bg-emerald-600 rounded-xl py-3.5 px-4 font-medium text-white flex items-center justify-center gap-2 shadow-md hover:bg-emerald-500 transition-colors">
                <Home className="w-4 h-4" />Home
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 pb-4">
              Verified on {result.timestamp.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SourceCard: React.FC<{ source: SourceResult }> = ({ source }) => {
  const statusConfig = {
    found: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700', label: 'Found' },
    not_found: { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-600', label: 'Not Found' },
    error: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', label: 'Error' },
    skipped: { bg: 'bg-gray-50', border: 'border-gray-100', badge: 'bg-gray-100 text-gray-400', label: 'Skipped' },
  };

  const config = statusConfig[source.status];

  return (
    <div className={`${config.bg} border ${config.border} rounded-xl p-3`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{source.icon}</span>
        <span className="text-sm font-semibold text-gray-800 flex-1">{source.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badge}`}>{config.label}</span>
      </div>
      <p className="text-xs text-gray-600 ml-7">{source.details}</p>
      {source.productName && source.status === 'found' && (
        <div className="ml-7 mt-1 text-xs text-gray-500">
          <span className="font-medium">Product:</span> {source.productName}
          {source.manufacturer && <span> • {source.manufacturer}</span>}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('analyzing');
  const [currentSource, setCurrentSource] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleNavigate = useCallback((screen: AppScreen) => {
    setCurrentScreen(screen);
    setError(null);
    if (screen === 'home') { setVerificationResult(null); setProcessingStage('analyzing'); }
  }, []);

  const runVerification = useCallback(async (input: VerificationInput, fromScreen: AppScreen) => {
    setCurrentScreen('processing');
    setProcessingStage('analyzing');
    setError(null);

    try {
      setProcessingStage('extracting');
      setCurrentSource('Initializing...');
      await new Promise(resolve => setTimeout(resolve, 300));

      setProcessingStage('verifying');

      const result = await runMultiSourceVerification(input, (stage, source) => {
        setCurrentSource(source);
      });

      setProcessingStage('completing');
      await new Promise(resolve => setTimeout(resolve, 400));

      setVerificationResult(result);
      setCurrentScreen('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setCurrentScreen(fromScreen);
    }
  }, []);

  const handleNafdacSubmit = useCallback((nafdacNumber: string) => {
    runVerification({ nafdacNumber }, 'manual');
  }, [runVerification]);

  const handleBarcodeSubmit = useCallback((barcode: string) => {
    runVerification({ barcode }, 'barcode');
  }, [runVerification]);

  const handleImageCapture = useCallback(async (imageBase64: string) => {
    setCurrentScreen('processing');
    setProcessingStage('analyzing');
    setError(null);

    try {
      setProcessingStage('extracting');
      setCurrentSource('Analyzing image...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate OCR extraction (in production, use Tesseract.js)
      const mockExtracted: VerificationInput = {
        nafdacNumber: '04-0123',
        barcode: '6156000100158',
      };

      setProcessingStage('verifying');

      const result = await runMultiSourceVerification(mockExtracted, (stage, source) => {
        setCurrentSource(source);
      });

      setProcessingStage('completing');
      await new Promise(resolve => setTimeout(resolve, 400));

      setVerificationResult(result);
      setCurrentScreen('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setCurrentScreen('home');
    }
  }, []);

  useEffect(() => {
    if (error) { const timer = setTimeout(() => setError(null), 5000); return () => clearTimeout(timer); }
  }, [error]);

  return (
    <div className="relative min-h-screen w-full">
      {error && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto animate-slide-down">
          <div className="bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <span className="text-sm flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-white/80 hover:text-white text-lg">✕</button>
          </div>
        </div>
      )}

      {currentScreen === 'home' && <HomeScreen onNavigate={handleNavigate} />}
      {currentScreen === 'camera' && <CameraCapture onCapture={handleImageCapture} onBack={() => handleNavigate('home')} />}
      {currentScreen === 'manual' && <ManualCheck onSubmit={handleNafdacSubmit} onBack={() => handleNavigate('home')} />}
      {currentScreen === 'barcode' && <BarcodeEntry onSubmit={handleBarcodeSubmit} onBack={() => handleNavigate('home')} />}
      {currentScreen === 'processing' && <ProcessingScreen stage={processingStage} currentSource={currentSource} />}
      {currentScreen === 'results' && verificationResult && <ResultsDashboard result={verificationResult} onNavigate={handleNavigate} onRescan={() => { setVerificationResult(null); setCurrentScreen('home'); }} />}
    </div>
  );
}

export default App;
