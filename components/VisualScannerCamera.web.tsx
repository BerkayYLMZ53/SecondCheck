import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { ScannerCameraHandle, ScannerCameraProps } from '../types/visualInspection';

const VisualScannerCamera = forwardRef<ScannerCameraHandle, ScannerCameraProps>(function VisualScannerCamera({ onReady, onError }, ref) {
  const video = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => ({ capture: async () => {
    const element = video.current;
    if (!element || element.readyState < 2 || !element.videoWidth) throw new Error('Kamera henüz fotoğraf çekmeye hazır değil.');
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1280 / Math.max(element.videoWidth, element.videoHeight));
    canvas.width = Math.round(element.videoWidth * scale); canvas.height = Math.round(element.videoHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Fotoğraf alanı hazırlanamadı.');
    context.drawImage(element, 0, 0, canvas.width, canvas.height);
    return { uri: canvas.toDataURL('image/jpeg', 0.75), width: canvas.width, height: canvas.height };
  } }), []);
  useEffect(() => {
    let cancelled = false; let stream: MediaStream | null = null;
    const element = video.current;
    if (!element) return;
    const ready = () => { if (!cancelled && element.videoWidth > 0) onReady(); };
    element.addEventListener('loadeddata', ready);
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Kamera için HTTPS veya desteklenen bir tarayıcı gerekli.');
        const opened = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (cancelled) { opened.getTracks().forEach((track) => track.stop()); return; }
        stream = opened; element.srcObject = opened; await element.play(); ready();
      } catch (reason) { if (!cancelled) { stream?.getTracks().forEach((track) => track.stop()); onError(reason instanceof Error ? reason.message : 'Kamera kullanılamadı.'); } }
    })();
    return () => { cancelled = true; element.removeEventListener('loadeddata', ready); stream?.getTracks().forEach((track) => track.stop()); element.pause(); element.srcObject = null; };
  }, [onReady, onError]);
  return <video ref={video} autoPlay muted playsInline aria-label="Şasi incelemesi için canlı kamera" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />;
});
export default VisualScannerCamera;
