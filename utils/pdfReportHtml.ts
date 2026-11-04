import type { ParsedListingResult } from '../types/listing';
import type { InspectionFacts, LabResults, ReportDetails, TestStatus } from '../types/inspection';
import type { TrustAssessment } from '../types/trust';
import { calculateTrustScore } from './trustScore';
import { calculateBargain } from './bargaining';
import { LAB_IDS, LAB_LABELS, STATUS_LABELS } from './inspection';
import { catalogDeviceName, listingMoney } from './listingAnalysisReport';
import { compareDevicePrice } from './deviceListingParser';
import { isSafeEvidencePhoto, visualScoreLabel } from './visualInspection';

export interface PdfReportInput {
  result: ParsedListingResult; checked: ReadonlySet<number>; lab: LabResults; facts: InspectionFacts; details: ReportDetails;
}
export interface PdfReportSnapshot { code: string; createdAt: string; html: string }
export const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export function buildPdfReport(input: PdfReportInput, uniqueId: string, date = new Date()): PdfReportSnapshot {
  const { result, checked, lab, facts, details } = input;
  if (!result.matchedDevice || result.matchedDevice.releaseYear === 0) throw new Error('Rapor için gerçek bir cihaz seçin.');
  if (result.detectedBattery !== undefined && (!Number.isFinite(result.detectedBattery) || result.detectedBattery < 0 || result.detectedBattery > 100)) throw new Error('Pil sağlığı 0 ile 100 arasında olmalıdır.');
  if (!Number.isFinite(date.getTime())) throw new Error('Geçerli bir rapor tarihi gerekli.');
  if (!/^[a-z0-9-]{8,80}$/i.test(uniqueId)) throw new Error('Geçerli bir benzersiz rapor kimliği gerekli.');
  const code = `SC-${date.getUTCFullYear()}-${uniqueId.toUpperCase()}`;
  const trust: TrustAssessment = calculateTrustScore(result, checked, lab, facts);
  const price = compareDevicePrice(result.matchedDevice, result.detectedPrice);
  const bargain = calculateBargain(result, facts);
  const valuation = bargain.valuation;
  const battery = valuation.battery;
  const e = escapeHtml;
  const money = (value?: number) => value === undefined ? 'Belirtilmedi' : listingMoney(value);
  const status = (value: TestStatus) => `<span class="status ${value}">${value === 'pass' ? '✓' : value === 'fail' ? '✕' : '—'} ${STATUS_LABELS[value]}</span>`;
  const rows: { name: string; status: TestStatus; source: string }[] = [
    { name: 'Ekran / ölü piksel', status: lab.pixels.status, source: lab.pixels.note || 'Laboratuvar testi bekleniyor' },
    { name: 'True Tone', status: facts.trueTone, source: 'Kullanıcı fiziksel kontrolü; her modelde bulunmaz' },
    { name: 'Face ID / parmak izi', status: facts.biometrics, source: 'Kullanıcı fiziksel kontrolü' },
    { name: 'Kameralar', status: facts.cameras, source: 'Kullanıcı fiziksel kontrolü' },
    { name: 'Hoparlör / ahize', status: lab.audio.status, source: lab.audio.note || 'Bağımsız ahize testi yapılmadı' },
    { name: 'Sıvı teması', status: facts.liquid, source: 'Kullanıcı fiziksel kontrolü' },
    { name: 'Kasa durumu', status: facts.caseCondition, source: facts.visualInspection ? `Kılavuzlu kullanıcı gözlemi: ${visualScoreLabel(facts.visualInspection)}` : 'Kullanıcı fiziksel kontrolü' },
  ];
  const critical = result.matchedDevice.criticalChecks.map((check, index) => `<li><b>${checked.has(index) ? '✓ Kontrol edildi' : '— Bekliyor'}</b> ${e(check)}</li>`).join('');
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(code)} | SecondCheck</title>
  <style>@page{size:A4;margin:15mm}*{box-sizing:border-box}body{margin:0;background:#eef2f6;color:#0f172a;font:12px/1.5 Arial,Helvetica,sans-serif}.report{max-width:800px;margin:24px auto;padding:38px;background:#fff}header{border-bottom:3px solid #0284c7;padding-bottom:16px;display:flex;gap:20px;justify-content:space-between}h1{font-size:24px;margin:5px 0}h2{font-size:16px;margin:24px 0 10px;color:#075985}p{margin:6px 0}.brand{font-weight:800;color:#0369a1;letter-spacing:2px}.meta{font-size:10px;color:#475569;overflow-wrap:anywhere}.summary{display:flex;gap:16px;margin:20px 0}.device{flex:1;padding:16px;border:1px solid #e2e8f0;border-radius:12px}.score{min-width:155px;padding:16px;border-radius:12px;background:#f1f5f9;text-align:center}.score strong{font-size:32px;color:${trust.color}}table{width:100%;border-collapse:collapse;font-size:11px}th{text-align:left;background:#e0f2fe;color:#075985}th,td{padding:9px;border-bottom:1px solid #e2e8f0;vertical-align:top}tr{break-inside:avoid}thead{display:table-header-group}.status{font-weight:700}.pass{color:#047857}.fail{color:#b91c1c}.pending,.unsupported{color:#475569}.price{padding:14px;border-radius:10px;background:#f8fafc;display:flex;gap:20px;flex-wrap:wrap}.price strong{display:block;font-size:17px}ul{padding-left:18px}li{margin:7px 0;break-inside:avoid}.seal{border:2px solid #0369a1;border-radius:14px;padding:12px;text-align:center;color:#0369a1;min-width:150px;font-weight:800;transform:rotate(-3deg)}footer{margin-top:24px;border-top:1px solid #cbd5e1;padding-top:14px;display:flex;align-items:center;gap:22px;break-inside:avoid}.note{font-size:10px;color:#475569}.print{display:block;margin:16px auto;padding:12px 20px;border:0;border-radius:10px;color:white;background:#0369a1;cursor:pointer}@media print{body{background:#fff}.report{max-width:none;margin:0;padding:0}.print{display:none}a{color:inherit}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}@media(max-width:560px){.report{padding:20px;margin:0}.summary{flex-direction:column}header{flex-direction:column}footer{flex-direction:column;align-items:flex-start}}</style></head><body>
  <style>
  header{background:#0b0f19;color:#f0ffff;padding:22px;border-radius:14px;border-bottom-color:#10b981;break-inside:avoid}
  header .brand{color:#00f2fe}header .meta{color:#a6bdcd}header h1{font-size:18px;line-height:1.45;letter-spacing:.4px}
  header>div:first-child{flex:1}header>div:last-child{max-width:190px}
  h2{break-after:avoid}.summary,.battery-card,.valuation-card{break-inside:avoid}
  .battery-card{padding:18px;border:1px solid #cce9e4;border-radius:12px;background:#f1faf8;margin:18px 0}
  .battery-card h2{margin:0 0 8px;color:#065f46}.battery-value{font-size:26px;font-weight:800;color:#0f766e}
  .valuation-card{padding:20px;border-radius:14px;background:#0b0f19;color:#e2f6f4;margin:20px 0}
  .valuation-card h2{color:#92e6d4;margin:0 0 12px}.valuation-card .note{color:#bdd0d6}
  .valuation-row{display:flex;justify-content:space-between;gap:16px;padding:7px 0;border-bottom:1px solid #ffffff20}
  .valuation-offer{color:#5eead4;font-size:30px;font-weight:800;margin:8px 0}.valuation-label{margin-top:18px;font-weight:700}
  @media print{.report{padding:0}header{padding:18px}table{font-size:10px}th,td{padding:7px}.summary{margin:15px 0}}
  </style>
  <button class="print" onclick="window.print()">Yazdır / PDF olarak kaydet</button><main class="report">
  <header><div><div class="brand">SECONDCHECK</div><h1>SECONDCHECK - DONANIM EKSPERTİZ &amp; DEĞERLEME RAPORU</h1><p class="meta">${e(date.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }))} (İstanbul)</p></div><div class="meta">Rastgele rapor / doğrulama kodu<br><b>#${e(code)}</b><br>Yerel kontrol kaydı</div></header>
  <div class="summary"><div class="device"><h2 style="margin-top:0">${e(catalogDeviceName(result))}</h2><p>Hafıza: ${e(result.detectedStorage ?? 'Belirtilmedi')}</p><p>Renk: ${e(details.color.trim() || 'Belirtilmedi')}</p><p>IMEI son 4: ${/^\d{4}$/.test(details.imeiLast4) ? e(details.imeiLast4) : 'Belirtilmedi'}</p></div><div class="score"><strong>${trust.score}/100</strong><p><b>${trust.grade} Durum</b></p><p class="meta">${e(trust.label)}</p></div></div>
  <h2>Piyasa değerleme özeti</h2><div class="price"><div>İlan fiyatı<strong>${e(money(result.detectedPrice))}</strong></div><div>Katalog ortalaması<strong>${result.matchedDevice.estimatedPriceBand.avgTry > 0 ? e(money(result.matchedDevice.estimatedPriceBand.avgTry)) : 'Referans yok'}</strong></div><div>Fiyat durumu<strong>${price?.status ?? 'Değerlendirilemedi'}</strong></div></div>
  <p class="note">Piyasa değeri tahmini katalog referansıdır; canlı teklif veya satış garantisi değildir. Güven skoru kullanıcı beyanları ve kontrollerden hesaplanan ön değerlendirmedir.</p>
  <section class="battery-card"><h2>Donanım &amp; Pil Durumu</h2><div class="battery-value">${battery.health === undefined ? 'Pil bilgisi yok' : `%${battery.health}`}</div>
  <p><b>${e(battery.label)}</b></p><p>Tahmini orijinal batarya değişim bütçesi: <b>${e(money(battery.replacementCost))}</b></p>
  <p>Batarya düşüm tutarı: <b>${e(money(battery.deduction))}</b></p>
  <p class="note">Pil yüzdesi kullanıcı girdisi / ilan beyanıdır; otomatik cihaz ölçümü değildir. Tutarlar belirtilen model bütçeleridir, güncel yetkili servis tarifesi değildir. 4-7 ay, ölçülmüş kalan ömür değil yüzdeye dayalı bir tahmin senaryosudur.</p></section>
  <section class="valuation-card"><h2>Nihai Değerleme Özeti</h2>
  <div class="valuation-row"><span>Ham Piyasa Değeri</span><b>${e(money(valuation.marketValue))}</b></div>
  ${valuation.deductions.map((entry) => `<div class="valuation-row"><span>${e(entry.label)}</span><span>-${e(money(entry.amount))}</span></div>`).join('')}
  <div class="valuation-row"><span>Kusur &amp; Batarya Kesintileri Toplamı</span><b>-${e(money(valuation.totalDeduction))}</b></div>
  <div class="valuation-label">Tavsiye Edilen Adil Alım/Teklif Fiyatı</div><div class="valuation-offer">${e(money(valuation.fairOffer))}</div>
  <p class="note">Ham piyasa referansından kesintiler bir kez uygulanır. Toplam kesinti piyasa değerini aşamaz; teklif alt sınırı 0 TL'dir.</p></section>
  <h2>Donanım kontrol tablosu</h2><table><thead><tr><th>Kontrol</th><th>Durum</th><th>Kaynak / kapsam</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${e(row.name)}</td><td>${status(row.status)}</td><td>${e(row.source)}</td></tr>`).join('')}</tbody></table>
  <h2>Canlı laboratuvar sonuçları</h2><table><thead><tr><th>Test</th><th>Sonuç</th><th>Not</th></tr></thead><tbody>${LAB_IDS.map((id) => `<tr><td>${LAB_LABELS[id]}</td><td>${status(lab[id].status)}</td><td>${e(lab[id].note || 'Test yapılmadı')}${lab[id].completedAt ? `<br><span class="meta">${e(lab[id].completedAt!)}</span>` : ''}</td></tr>`).join('')}</tbody></table>
  <section style="break-inside:avoid"><h2>Modele özel kritik kontroller · ${trust.completed}/${trust.total}</h2><ul>${critical}</ul></section>
  ${facts.fieldInspection ? `<h2>Sesli saha testi · 6/6 tamamlandı</h2><p class="note">Sonuçlar kullanıcının yerinde gözlemidir; birden çok parçayı kapsayan adım, arızalı parçayı tek başına belirlemez.</p><table><thead><tr><th>Adım</th><th>Sonuç</th><th>Gözlem zamanı</th></tr></thead><tbody>${facts.fieldInspection.results.map((step) => `<tr><td>${e(step.title)}</td><td>${status(step.status)}</td><td>${e(step.answeredAt)}</td></tr>`).join('')}</tbody></table>` : ''}
  ${facts.visualInspection ? `<section style="break-inside:avoid"><h2>Fotoğraflı şasi ve kasa incelemesi · ${e(visualScoreLabel(facts.visualInspection))}</h2><p>Şasi: ${facts.visualInspection.chassis === 'bent' ? 'Eğrilik / kasa açıklığı bildirildi' : 'Düz olarak onaylandı'}</p><p class="note">Kılavuzla kullanıcı gözlemi; otomatik AI tespiti veya hassas ölçüm değildir. Fotoğraflar kullanıcı tarafından kaydedilmiştir.</p><table><tr>${(['chassis', 'corners'] as const).map((target) => {
    const photo = facts.visualInspection!.photos[target];
    return `<td style="width:50%">${isSafeEvidencePhoto(photo) ? `<img alt="${target === 'chassis' ? 'Şasi' : 'Köşe'} tespit fotoğrafı" src="${e(photo.dataUri)}" style="display:block;max-width:100%;height:180px;object-fit:contain"/>` : 'Geçerli fotoğraf yok'}<p class="meta">${target === 'chassis' ? 'Şasi' : 'Köşe / çizik'} · ${photo.source === 'camera' ? 'Kamera çekimi' : 'Cihazdan yükleme'} · ${e(photo.recordedAt)}</p></td>`;
  }).join('')}</tr></table></section>` : ''}
  <h2>Güven skoru gerekçeleri</h2><ul>${trust.adjustments.map((item) => `<li>${item.points > 0 ? '+' : ''}${item.points} · ${e(item.label)}</li>`).join('') || '<li>Ek düzeltme yok.</li>'}</ul>
  <h2>İlan Fiyatından Pazarlık Özeti</h2><p>İlan fiyatından kesintili karşı teklif: <b>${e(money(bargain.offer))}</b> · Gerekçeli tasarruf: <b>${e(money(bargain.saving))}</b></p><p class="note">Bu karşı teklif ilan fiyatından, yukarıdaki adil alım fiyatı katalog referansından hesaplanır. Model bazlı batarya bütçesi ve sabit kusur varsayımları kullanılır.</p>
  <footer><div class="seal">✓ SecondCheck<br>Doğrulandı</div><div><b>Bu rapor SecondCheck AI Değerleme Motoru tarafından üretilmiştir.</b><p class="note">Bu damga, uygulamada kaydedilen kullanıcı kontrol beyanını belirtir. Resmi servis belgesi, dijital imza veya cihazın arızasız olduğuna ilişkin garanti değildir. Rapor kimliği çevrimiçi doğrulama hizmetine bağlı değildir.</p></div></footer>
  </main></body></html>`;
  return { code, createdAt: date.toISOString(), html };
}
