import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Camera, CameraView } from 'expo-camera';
import { StyleSheet, View } from 'react-native';
import type { ScannerCameraHandle, ScannerCameraProps } from '../types/visualInspection';

const VisualScannerCamera = forwardRef<ScannerCameraHandle, ScannerCameraProps>(function VisualScannerCamera({ onReady, onError }, ref) {
  const camera = useRef<CameraView>(null);
  const [granted, setGranted] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void Camera.requestCameraPermissionsAsync().then((permission) => {
      if (cancelled) return;
      if (permission.granted) setGranted(true); else onError('Kamera izni verilmedi.');
    }).catch(() => { if (!cancelled) onError('Kamera izni denetlenemedi.'); });
    return () => { cancelled = true; };
  }, [onError]);
  useImperativeHandle(ref, () => ({ capture: async () => {
    if (!camera.current) throw new Error('Kamera hazır değil.');
    const photo = await camera.current.takePictureAsync({ quality: 0.75, exif: false });
    if (!photo) throw new Error('Fotoğraf çekilemedi.');
    return { uri: photo.uri, width: photo.width, height: photo.height };
  } }), []);
  return <View style={StyleSheet.absoluteFill}>{granted && <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" mode="picture" mute mirror={false}
    onCameraReady={onReady} onMountError={() => onError('Arka kamera başlatılamadı.')} />}</View>;
});
export default VisualScannerCamera;
