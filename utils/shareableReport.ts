import type { ParsedListingResult } from '../types/listing';
import type { TrustAssessment } from '../types/trust';
import { calculateTrustScore } from './trustScore';
import { buildListingAnalysisReport, catalogDeviceName } from './listingAnalysisReport';

export type ReportCardFormat = 'story' | 'square';
export interface ShareableReportSnapshot {
  deviceId: string;
  deviceName: string;
  storage: string;
  battery: string;
  trust: TrustAssessment;
  confirmedChecks: string[];
  completed: number;
  total: number;
  dateLabel: string;
  createdAt: string;
  plainText: string;
}

function checkLabel(check: string): string {
  if (/IMEI/.test(check)) return 'IMEI ve şebeke kontrol edildi';
  if (/Aktivasyon|FRP/.test(check)) return 'Hesap kilidi kontrol edildi';
  if (/Face ID/.test(check)) return 'Face ID kontrolü yapıldı';
  if (/Touch ID|parmak izi/.test(check)) return 'Parmak izi kontrolü yapıldı';
  if (/True Tone/.test(check)) return 'True Tone kontrolü yapıldı';
  if (/pil sağlığı|Pil sağlığı|parça\/servis|pil tanılaması/.test(check)) return 'Pil ve parça geçmişi incelendi';
  if (/ProMotion/.test(check)) return 'ProMotion ve telefoto denendi';
  if (/OLED|LCD|dokunmati/.test(check)) return 'Ekran ve dokunmatik incelendi';
  if (/OIS|netleme|kamera/.test(check)) return 'Kamera ve netleme denendi';
  if (/USB-C|Lightning/.test(check)) return 'Şarj ve veri bağlantısı denendi';
  return check.length > 75 ? `${check.slice(0, 72).trim()}…` : check;
}

export function createShareableReport(
  result: ParsedListingResult, checked: ReadonlySet<number>, title = '', date = new Date(),
): ShareableReportSnapshot {
  const device = result.matchedDevice;
  if (!device || device.releaseYear === 0) throw new Error('Paylaşım için geçerli bir cihaz analizi gerekir.');
  const report = buildListingAnalysisReport(result, checked, title, date);
  const trust = calculateTrustScore(result, checked);
  if (!trust.total || trust.completed !== trust.total) throw new Error('Paylaşım kartı için bütün kritik kontrolleri tamamlayın.');
  return {
    deviceId: device.id, deviceName: catalogDeviceName(result),
    storage: result.detectedStorage?.replace(/(\d)(GB|TB)$/, '$1 $2') ?? 'Depolama belirtilmedi',
    battery: result.detectedBattery === undefined ? 'Pil bilgisi yok' : `Pil %${result.detectedBattery}`,
    trust, confirmedChecks: [...new Set(report.completed.map(checkLabel))], completed: trust.completed, total: trust.total,
    dateLabel: date.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }), createdAt: report.createdAt,
    plainText: `${report.plainText}\n\nGüven skoru: ${trust.score}/100 • ${trust.grade}\nsecondcheck.gen.tr`,
  };
}

export function reportCardSize(format: ReportCardFormat): { width: number; height: number } {
  return { width: 1080, height: format === 'story' ? 1920 : 1080 };
}

export function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function wrap(value: string, max: number, lines = 2): string[] {
  const words = value.replace(/\s+/g, ' ').trim().split(' ');
  const output: string[] = [];
  let line = '';
  for (const word of words) {
    if (line && `${line} ${word}`.length > max) { output.push(line); line = word; } else line = line ? `${line} ${word}` : word;
  }
  if (line) output.push(line);
  if (output.length > lines) return [...output.slice(0, lines - 1), `${(output[lines - 1] ?? '').slice(0, max - 1)}…`];
  return output;
}

/** Self-contained vector card: no remote assets, HTML, fonts or user-supplied markup. */
export function buildReportCardSvg(snapshot: ShareableReportSnapshot, format: ReportCardFormat): string {
  const { width, height } = reportCardSize(format);
  const story = format === 'story';
  const accent = snapshot.trust.color;
  const cx = story ? 540 : 250, cy = story ? 640 : 445, radius = story ? 155 : 112;
  const circumference = 2 * Math.PI * radius;
  const maxChecks = story ? 7 : 3;
  const shown = snapshot.confirmedChecks.slice(0, maxChecks);
  const titleLines = wrap(snapshot.deviceName, story ? 25 : 31);
  const text = (x: number, y: number, content: string, size: number, fill = '#f8fafc', weight = 500, anchor = 'start') =>
    `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${escapeXml(content)}</text>`;
  const titleY = story ? 205 : 155;
  const checksY = story ? 1050 : 680;
  const footerY = story ? 1710 : 938;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b0f19"/><stop offset="1" stop-color="#14233c"/></linearGradient>
    <radialGradient id="aura"><stop offset="0" stop-color="${accent}" stop-opacity=".2"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs>
    <rect width="1080" height="${height}" fill="url(#background)"/>
    <circle cx="930" cy="220" r="400" fill="url(#aura)"/><circle cx="160" cy="${height - 250}" r="380" fill="url(#aura)"/>
    <rect x="36" y="36" width="1008" height="${height - 72}" rx="48" fill="#ffffff" fill-opacity=".025" stroke="#ffffff" stroke-opacity=".12"/>
    ${text(80, story ? 100 : 80, 'SECONDCHECK', 27, '#38bdf8', 800)}
    ${text(1000, story ? 100 : 80, snapshot.dateLabel, 22, '#94a3b8', 500, 'end')}
    ${titleLines.map((line, index) => text(80, titleY + index * (story ? 78 : 58), line, story ? 65 : 49, '#f8fafc', 800)).join('')}
    ${text(80, story ? 365 : 280, `${snapshot.storage}  •  ${snapshot.battery}`, story ? 31 : 27, '#cbd5e1')}
    <circle cx="${cx}" cy="${cy}" r="${radius + 34}" fill="url(#aura)"/>
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#0b0f19" fill-opacity=".6" stroke="#27344d" stroke-width="${story ? 18 : 14}"/>
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${accent}" stroke-width="${story ? 18 : 14}" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * (1 - snapshot.trust.score / 100)}" transform="rotate(-90 ${cx} ${cy})"/>
    ${text(cx, cy + 26, String(snapshot.trust.score), story ? 110 : 83, '#f8fafc', 800, 'middle')}
    ${text(cx, cy + 75, '/ 100', 28, '#94a3b8', 600, 'middle')}
    ${text(story ? 540 : 440, story ? 885 : 420, `${snapshot.trust.grade}  GÜVEN SKORU`, story ? 44 : 36, accent, 800, story ? 'middle' : 'start')}
    ${text(story ? 540 : 440, story ? 940 : 470, `${snapshot.completed}/${snapshot.total} kritik kontrol`, 28, '#cbd5e1', 600, story ? 'middle' : 'start')}
    ${!story ? text(440, 515, 'Kullanıcı beyanına dayalı', 23, '#94a3b8') : ''}
    ${text(80, checksY - 32, 'TAMAMLANAN KONTROLLER', 23, '#94a3b8', 700)}
    ${shown.map((check, index) => {
      const y = checksY + 35 + index * (story ? 72 : 54);
      return `<circle cx="104" cy="${y - 10}" r="17" fill="#10b981" fill-opacity=".15"/><path d="M95 ${y - 10}l6 6 12-13" fill="none" stroke="#6ee7b7" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${wrap(check, story ? 45 : 48, 1).map((line) => text(140, y, line, story ? 29 : 25)).join('')}`;
    }).join('')}
    ${snapshot.confirmedChecks.length > shown.length ? text(140, checksY + (story ? 35 : 20) + shown.length * (story ? 72 : 54), `+${snapshot.confirmedChecks.length - shown.length} kontrol daha tamamlandı`, 23, '#94a3b8') : ''}
    <rect x="70" y="${footerY - 60}" width="940" height="104" rx="25" fill="#38bdf8" fill-opacity=".06" stroke="#38bdf8" stroke-opacity=".2"/>
    ${text(540, footerY - 7, 'SecondCheck ile Doğrulandı', story ? 31 : 29, '#38bdf8', 800, 'middle')}
    ${text(540, footerY + 29, 'secondcheck.gen.tr', 24, '#cbd5e1', 600, 'middle')}
    ${text(540, height - (story ? 100 : 49), 'Kontrol kaydı kullanıcı beyanıdır; teknik garanti değildir.', story ? 23 : 20, '#94a3b8', 500, 'middle')}
  </svg>`;
}
