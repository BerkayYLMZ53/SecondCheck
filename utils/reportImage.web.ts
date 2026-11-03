import type { CaptureReportSvg, ReportImageArtifact } from './reportImage.types';

export async function prepareReportImage(svg: string, width: number, height: number, filename: string, _capture?: CaptureReportSvg): Promise<ReportImageArtifact> {
  const source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Görsel hazırlanamadı.')); image.src = source; });
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Bu tarayıcıda görsel oluşturma desteklenmiyor.');
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('PNG oluşturulamadı.')), 'image/png'));
    return { uri: URL.createObjectURL(blob), blob, filename };
  } finally { URL.revokeObjectURL(source); }
}

export async function saveReportImage(artifact: ReportImageArtifact): Promise<void> {
  const link = document.createElement('a');
  link.href = artifact.uri; link.download = artifact.filename;
  document.body.appendChild(link); link.click(); link.remove();
}

export async function shareReportImage(artifact: ReportImageArtifact, text: string): Promise<'shared' | 'cancelled'> {
  if (!artifact.blob) throw new Error('PNG henüz hazır değil.');
  const file = new File([artifact.blob], artifact.filename, { type: 'image/png' });
  if (!navigator.share || !navigator.canShare?.({ files: [file] })) throw new Error('Bu tarayıcı dosya paylaşımını desteklemiyor. PNG Olarak Kaydet seçeneğini kullanın.');
  try { await navigator.share({ files: [file], title: 'SecondCheck Ekspertiz Kartı', text }); return 'shared'; }
  catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'; throw new Error('Paylaşım tamamlanamadı. PNG olarak kaydedebilirsiniz.'); }
}

export async function releaseReportImage(artifact: ReportImageArtifact): Promise<void> { URL.revokeObjectURL(artifact.uri); }
