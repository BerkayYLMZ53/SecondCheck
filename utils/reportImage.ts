import { File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import type { CaptureReportSvg, ReportImageArtifact } from './reportImage.types';

export async function prepareReportImage(_svg: string, width: number, height: number, filename: string, capture?: CaptureReportSvg): Promise<ReportImageArtifact> {
  if (!capture) throw new Error('Görsel önizlemesi henüz hazır değil.');
  const base64 = (await capture(width, height)).replace(/^data:image\/png;base64,/, '');
  if (!base64) throw new Error('PNG görseli oluşturulamadı.');
  const file = new File(Paths.cache, filename);
  await file.create({ overwrite: true });
  await file.write(base64, { encoding: 'base64' });
  return { uri: file.uri, filename };
}

export async function saveReportImage(artifact: ReportImageArtifact): Promise<void> {
  const permission = await requestPermissionsAsync(true, ['photo']);
  if (!permission.granted) throw new Error('Görseli galeriye kaydetmek için fotoğraf ekleme izni gerekir. Paylaş seçeneğini de kullanabilirsiniz.');
  await Asset.create(artifact.uri);
}

export async function shareReportImage(artifact: ReportImageArtifact, _text: string): Promise<'shared' | 'cancelled'> {
  if (!await Sharing.isAvailableAsync()) throw new Error('Bu cihazda paylaşım kullanılamıyor. PNG olarak kaydetmeyi deneyin.');
  await Sharing.shareAsync(artifact.uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'SecondCheck Ekspertiz Kartı' });
  return 'shared';
}

export async function releaseReportImage(artifact: ReportImageArtifact): Promise<void> {
  try { await new File(artifact.uri).delete(); } catch { /* The OS may have already cleared its cache. */ }
}
