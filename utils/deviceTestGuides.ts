import type { DeviceItem } from '../types/catalog';

export type TestPoint = 'screen' | 'camera' | 'battery' | 'port';
export interface DeviceTestGuide { id: TestPoint; title: string; steps: readonly [string, string, string] }

export function getDeviceTestGuides(device: DeviceItem): DeviceTestGuide[] {
  const apple = device.brand === 'Apple';
  const touchId = apple && /^iPhone (?:[678]s?(?: Plus)?\b|SE\b)/.test(device.model);
  const trueTone = apple && device.releaseYear >= 2017;
  const ois = apple
    ? !/^iPhone (?:6s?$|SE \(1st)/.test(device.model)
    : device.brand === 'Samsung' || (device.brand === 'Xiaomi' && !/Lite/.test(device.model)) ||
      /Note (?:12 Pro.*5G|13 Pro)/.test(device.model);
  return [
    { id: 'screen', title: 'Ekran & biyometri', steps: [
      '0–10 sn: Beyaz, gri ve ana renk ekranlarda leke, ölü piksel ve görüntü izi arayın.',
      trueTone ? '10–20 sn: Ekran ayarlarında True Tone geçişini deneyin; varlığı tek başına orijinallik kanıtı değildir.' : '10–20 sn: Parlaklığı değiştirin ve parmağınızı ekranın bütün kenarlarında gezdirerek dokunmatiği deneyin.',
      apple && !touchId ? '20–30 sn: Satıcının izniyle Face ID kaydı veya kilit açmayı deneyin; sensör çevresinde hasar arayın.' : '20–30 sn: Satıcının izniyle parmak izi kaydı ve kilit açmayı deneyin; sensörün modeldeki konumunu doğrulayın.',
    ] },
    { id: 'camera', title: 'Kamera modülü', steps: [
      '0–10 sn: Lensleri ışığa tutun; camda çizik, içeride toz veya buğu arayın.',
      '10–20 sn: Yakın ve uzak nesnelere odaklanın, mevcut kameralar arasında geçiş yapın.',
      ois ? '20–30 sn: Yürüyerek kısa video çekin; OIS sırasında görüntü atlaması veya odak kaçırma arayın. Telefonu sallamayın.' : '20–30 sn: Kısa video çekip netlik ve sesi kontrol edin; bu sürümde OIS bulunduğunu varsaymayın.',
    ] },
    { id: 'battery', title: 'Batarya & parça geçmişi', steps: [
      apple ? '0–10 sn: Ayarlardaki pil sağlığı ve servis uyarılarını kontrol edin; kapasiteyi ilanla karşılaştırın.' : '0–10 sn: Üreticinin pil tanılamasını ve pil tüketim ekranını açın; kapasite bilgisi her modelde sunulmaz.',
      '10–20 sn: Varsa parça/servis geçmişini ve pil uyarılarını inceleyin; yalnızca uyarı yokluğundan orijinallik sonucu çıkarmayın.',
      '20–30 sn: Ekran/kapak kalkması veya şişme belirtisini dışarıdan inceleyin. Cihazı sıkıştırmayın, kasayı açmayın.',
    ] },
    { id: 'port', title: 'Alt port & kasa', steps: [
      '0–10 sn: Uyumlu kabloyla şarjı deneyin; kabloyu zorlamadan temas kesintisi olup olmadığını gözleyin.',
      '10–20 sn: Portta korozyon ve kasada eğrilik arayın; telefonu bükmeyin, porta metal cisim sokmayın.',
      '20–30 sn: Görünür bir sıvı temas göstergesi varsa dışarıdan inceleyin. Kasayı açmayın, suya daldırarak test etmeyin.',
    ] },
  ];
}
