import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ScannerRawPhoto, VisualEvidencePhoto } from '../types/visualInspection';
import { isSafeEvidencePhoto } from './visualInspection';
import { cleanupScannerPhoto } from './scannerPhotoCleanup';

/** Re-encode locally to a bounded JPEG; never retain EXIF, a remote URL, or a full-resolution original. */
export async function prepareScannerPhoto(raw: ScannerRawPhoto, source: VisualEvidencePhoto['source']): Promise<VisualEvidencePhoto> {
  if (!Number.isFinite(raw.width) || !Number.isFinite(raw.height) || raw.width <= 0 || raw.height <= 0 || raw.width * raw.height > 60_000_000) throw new Error('Fotoğraf boyutu desteklenmiyor. Daha küçük bir görsel seçin.');
  if (!/^(?:data:image\/(?:jpeg|png|webp);base64,|blob:|file:|content:)/i.test(raw.uri)) throw new Error('Yalnızca cihazdan seçilen veya çekilen fotoğraflar kullanılabilir.');
  const context = ImageManipulator.manipulate(raw.uri);
  const scale = Math.min(1, 1280 / Math.max(raw.width, raw.height));
  context.resize({ width: Math.max(1, Math.round(raw.width * scale)), height: Math.max(1, Math.round(raw.height * scale)) });
  let image: Awaited<ReturnType<typeof context.renderAsync>> | null = null;
  let generatedUri: string | undefined;
  try {
    image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.65, base64: true });
    generatedUri = saved.uri;
    const photo: VisualEvidencePhoto = { dataUri: `data:image/jpeg;base64,${saved.base64 ?? ''}`, width: saved.width, height: saved.height, source, recordedAt: new Date().toISOString() };
    if (!isSafeEvidencePhoto(photo)) throw new Error('Fotoğraf işlenemedi veya çok büyük. Daha küçük bir fotoğraf deneyin.');
    return photo;
  } finally {
    image?.release(); context.release(); cleanupScannerPhoto(generatedUri);
    if (source === 'camera') cleanupScannerPhoto(raw.uri);
  }
}
