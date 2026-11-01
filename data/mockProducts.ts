import type {
  Alternative,
  Category,
  ChecklistItem,
  ChronicIssue,
  Product,
  Severity,
} from '../types/product';

/**
 * Deterministic Turkish marketplace-style catalog, valuation date 2026-11-01.
 * Modeled asking-price estimates, not live quotes or completed-sale medians.
 * Assumes working, locally usable / registered devices; warranty, IMEI, city and
 * condition affect actual offers. Family year is not unit manufacture date.
 * Color, board partner, boxed/tray and bundles are commercial variants.
 * Sources for calibration / SKU constraints:
 * https://www.sahibinden.com/iphone-13
 * https://www.sahibinden.com/ekran-karti-masaustu
 * https://support.apple.com/en-nz/121031
 * https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3060-3060ti/
 * https://www.intel.com/content/www/us/en/support/articles/000027144/processors/intel-core-processors.html
 * https://www.amd.com/en/partner/articles/ryzen-9000-series-processors.html
 * Inspection risks are not measured defect-prevalence claims. No random, network
 * or current-date dependencies: IDs, order, prices and generation are repeatable.
 * Published prices are recalibrated to the supplied Turkey 2026 benchmarks.
 * Exact benchmark triples take precedence over approximate percentage spreads.
 */
const PRICING_YEAR = 2026;
type Tier = 'entry' | 'mid' | 'high' | 'flagship';
type IssueSpec = readonly [
  title: string,
  severity: Severity,
  description: string,
  repair: string,
];
type CheckSpec = readonly [title: string, instruction: string, area: string];
interface Profile {
  issues: readonly IssueSpec[];
  checks: readonly CheckSpec[];
}
interface Seed {
  key: string;
  name: string;
  brand: string;
  category: Category;
  year: number;
  /** Synthetic 2026 TL replacement-value anchor before age/tier retention. */
  anchor: number;
  tier: Tier;
  profile: string;
}
interface Variant {
  key: string;
  label: string;
  premium?: number;
  extraTL?: number;
  storageGB?: number;
  baseStorageGB?: number;
  issues?: readonly IssueSpec[];
  checks?: readonly CheckSpec[];
}
const repair =
  'Teşhis sonrası parça ve işçilik için güncel servis teklifi alın.';
const PROFILES: Record<string, Profile> = {
  iphone: {
    issues: [
      [
        'Pil kapasitesi kaybı',
        'medium',
        'Pil sağlığı, servis uyarıları ve gerçek kullanım süresini birlikte değerlendirin.',
        'Pil değişimi için güncel teklif alın.',
      ],
      [
        'Panel / biyometri onarım geçmişi',
        'high',
        'Dokunmatik ve Face ID / Touch ID hasarını kontrol edin. True Tone tek başına orijinallik kanıtı değildir.',
        repair,
      ],
    ],
    checks: [
      [
        'Aktivasyon kilidi',
        'Hesap çıkışı ve Bul kapatmayı satıcıyla doğrulayın; sıfırlama sonrası etkinleştirmeyi tamamlayın.',
        'Hesap / Kilit',
      ],
      [
        'Panel / kamera / biyometri',
        'Tek renklerde iz ve piksel kusuru arayın; mevcut kameraları, biyometrik kaydı ve dokunmatiği deneyin.',
        'Panel / Sensörler',
      ],
      [
        'Pil, kapasite ve IMEI',
        'Depolama, parça uyarıları ve pil sağlığını sistemden doğrulayın; SIM, ses ve şarjı deneyin. IMEI durumunu resmi kanaldan kontrol edin.',
        'Kimlik / Pil',
      ],
    ],
  },
  android: {
    issues: [
      [
        'Panel / dokunmatik yıpranması',
        'medium',
        'OLED panelde sabit iz, LCD panelde aydınlatma düzensizliği ve her modelde dokunmatik kaybı arayın.',
        repair,
      ],
      [
        'Pil / USB soketi aşınması',
        'medium',
        'Şarj kesilmesi, kısa kullanım süresi ve aşırı ısıyı sağlam adaptörle tekrar test edin.',
        repair,
      ],
    ],
    checks: [
      [
        'Hesap ve model kodu',
        'Google / üretici hesabı kaldırıldıktan sonra kurulumu deneyin; IMEI ve bölgesel 4G/5G varyantını doğrulayın.',
        'Hesap / Kimlik',
      ],
      [
        'Panel ve kamera testi',
        'Tek renklerde piksel ve iz arayın; odak, video, tüm dokunmatik alanları ve biyometriyi deneyin.',
        'Panel / Sensörler',
      ],
      [
        'Pil ve bağlantılar',
        'SIM araması, Wi-Fi, Bluetooth, ses ve şarjı test edin; RAM ve depolama bilgisini sistemden kontrol edin.',
        'Pil / Bağlantılar',
      ],
    ],
  },
  gpu: {
    issues: [
      [
        'Fan / termal bakım yorgunluğu',
        'medium',
        'Yaş, toz ve uzun yük geçmişi tıkırtı veya termal temas kaybı oluşturabilir; madencilik geçmişi tek başına arıza kanıtı değildir.',
        'Fan, macun ve doğru ped ölçüsü için bakım teklifi alın.',
      ],
      [
        'VRAM / güç devresi kararsızlığı',
        'high',
        'Artefakt, sürücü sıfırlanması ve görüntü kesilmesini sağlam sistem ve kabloyla tekrar deneyin.',
        repair,
      ],
    ],
    checks: [
      [
        'GPU-Z ve kart etiketi',
        'GPU, VRAM, veri yolu, üretici kodu ve BIOS bilgisini eşleştirin; VRAM varyantlarını karıştırmayın.',
        'Donanım Orijinalliği',
      ],
      [
        'Oyun / VRAM yük testi',
        'OCCT VRAM ve oyunda hata, fan, sıcaklık ve saat hızını izleyin. Aşırı ısıda durdurun; kısa test garanti değildir.',
        'Termal / VRAM',
      ],
      [
        'PCB / portlar / fan',
        'Güç kesikken oksit, çatlak ve soket kararması arayın; mevcut portları ve fan hızlarını test edin.',
        'Fiziksel / Bağlantılar',
      ],
    ],
  },
  am4: {
    issues: [
      [
        'Eğik / eksik AM4 pinleri',
        'high',
        'Soğutucu sökümü ve taşıma pinleri zedeleyebilir; dört yönden inceleyin.',
        'Uzman pin onarımı veya değişim teklifi alın.',
      ],
      [
        'Stok CPU / bellek kararsızlığı',
        'medium',
        'OC, RAM veya anakart sorunu CPU hatasıyla karışabilir; stok ayarla karşılaştırın.',
        repair,
      ],
    ],
    checks: [
      [
        'Kapak kodu ve pin muayenesi',
        'Kapak yazısını CPU-Z ile eşleştirin; sökülmüş işlemcinin pinlerini büyüteçle inceleyin.',
        'Kimlik / Pinler',
      ],
      [
        'BIOS ve stok yük',
        'Tam CPU destek listesi / BIOS sürümünü doğrulayın; stok ayarda OCCT veya Cinebench ile hata ve sıcaklığı izleyin.',
        'BIOS / Kararlılık',
      ],
      [
        'Bellek kanalları ve grafik',
        'İki kanalı ayrı test edin. Dahili grafiği olmayan modelde harici GPU kullanın; aynı soket her BIOS ile uyum demek değildir.',
        'Bellek / Platform',
      ],
    ],
  },
  lga: {
    issues: [
      [
        'Temas / soket hasarı',
        'high',
        'CPU kontaklarını ve anakart LGA pinlerini ayrı inceleyin; pinler işlemcide değildir.',
        repair,
      ],
      [
        'Termal temas / bellek kararsızlığı',
        'medium',
        'Soğutucu, voltaj ve bellek profilini stok ayarlarda karşılaştırın.',
        repair,
      ],
    ],
    checks: [
      [
        'CPU kimliği ve platform',
        'CPU-Z ile kapak kodunu eşleştirin; soket, BIOS ve DDR neslini tam SKU destek listesinden doğrulayın.',
        'Donanım Orijinalliği',
      ],
      [
        'Stok yük / soğuk açılış',
        'Varsayılan ayarda yük, yeniden başlatma ve soğuk açılış testi yapın; hata ve sıcaklığı izleyin.',
        'Termal / Kararlılık',
      ],
      [
        'Bellek ve grafik',
        'Her bellek kanalını test edin; Intel F/KF modellerinde harici GPU gerekir. AM5 grafik desteğini tam SKU ile doğrulayın.',
        'Bellek / Grafik',
      ],
    ],
  },
  gamingLaptop: {
    issues: [
      [
        'Menteşe / kasa yıpranması',
        'medium',
        'Kapağı yavaş açarken çıtırtı, ayrılma ve esneme arayın; zorlamayın.',
        repair,
      ],
      [
        'CPU / GPU soğutma yorgunluğu',
        'medium',
        'Toz, macun ve fan yükte hız düşüşü yapabilir; tek sıcaklığı tüm modeller için eşik saymayın.',
        'Fan ve termal bakım teklifi alın.',
      ],
    ],
    checks: [
      [
        'Donanım / adaptör',
        'CPU/GPU, RAM/SSD, SSD sağlığı ve uygun güçlü adaptörü doğrulayın; yükseltilen parçaların uyumunu kontrol edin.',
        'Orijinallik / Depolama',
      ],
      [
        'Prizde oyun testi',
        'Performans modunu not edip oyun ve kısa yük testi yapın; sıcaklık, fan, güç ve hataları izleyin.',
        'Termal / Kararlılık',
      ],
      [
        'Panel / pil / mekanik',
        'Renk desenleri, tüm tuşlar, Wi-Fi indirme, portlar, pil raporu ve menteşeyi deneyin.',
        'Ekran / Mekanik',
      ],
    ],
  },
  macbook: {
    issues: [
      [
        'Panel / kapak baskı hasarı',
        'high',
        'Ekran kenarı ve kamera çevresinde çatlak arayın; kamera kapağı / klavye örtüsü geçmişini sorun.',
        'Ekran grubu teklifi alın.',
      ],
      [
        'Pil / SSD yıpranması',
        'medium',
        'Pil kapasitesi ve SSD raporunu inceleyin; swap kullanımı tek başına SSD arızası kanıtı değildir.',
        repair,
      ],
    ],
    checks: [
      [
        'Aktivasyon / MDM',
        'Hesap çıkışı ve Bul kapatmayı doğrulayın; sıfırlama sonrası kurulumda aktivasyon veya MDM kilidi çıkmadığını kontrol edin.',
        'Hesap / MDM',
      ],
      [
        'RAM / SSD / pil raporu',
        'Sistem Bilgileri ile yapılandırma, pil kapasitesi ve döngüsünü doğrulayın; döngü tek başına sağlık ölçütü değildir.',
        'Donanım / Pil',
      ],
      [
        'Panel ve bağlantılar',
        'Renk testleri, klavye, trackpad, kamera, ses ve mevcut şarj / USB portlarını deneyin.',
        'Panel / Giriş çıkış',
      ],
    ],
  },
  console: {
    issues: [
      [
        'Kontrolcü analog / tuş aşınması',
        'medium',
        'Merkez sapması, bumper kaçırma ve tetik tepkisini her kontrolcüde deneyin.',
        'Analog veya kontrolcü değişimi teklifi alın.',
      ],
      [
        'Soğutma / bağlantı yorgunluğu',
        'medium',
        'Toz, kapalı yerleşim, HDMI gevşekliği ve yükte kapanmayı inceleyin.',
        repair,
      ],
    ],
    checks: [
      [
        'Hesap ve çevrimiçi erişim',
        'Satıcıyla hesap çıkışı / sıfırlamayı doğrulayın; desteklenen çevrimiçi hizmete erişimi kontrol edin.',
        'Hesap / Sistem',
      ],
      [
        'Oyun / görüntü yükü',
        'Yoğun oyunda fan, kopma ve kapanmayı izleyin; depolamayı modelin kullanılabilir alanıyla karşılaştırın.',
        'Termal / HDMI',
      ],
      [
        'Paket ve disk',
        'Kontrolcü / aksesuarları test edin. Yalnız diskli modelde sağlam disk deneyin; dijital modele sürücü varsaymayın.',
        'Paket / Kontrolcü',
      ],
    ],
  },
  handheld: {
    issues: [
      [
        'Analog / bumper aşınması',
        'medium',
        'Darbe sonrası merkez sapması ve kaçıran tuş arayın.',
        repair,
      ],
      [
        'Pil / fan / kart okuyucu',
        'medium',
        'Yüzde sıçraması, tiz fan ve kart kopmasını oyun yükünde test edin.',
        repair,
      ],
    ],
    checks: [
      [
        'Dahili giriş testi',
        'Modelin aracında mevcut tüm analog, tetik, tuş ve dokunmatik alanları deneyin.',
        'Girdi / Kontrolcü',
      ],
      [
        'Pil / oyun yükü',
        'Pil sağlığıyla gerçek oyunda yüzde düşüşünü karşılaştırın; fan, şarj ve ekranı test edin.',
        'Pil / Termal',
      ],
      [
        'Depolama / dock',
        'Kapasiteyi doğrulayın; yedeklenmiş önemsiz microSD verisiyle okuma / yazma deneyin. Dock varsa görüntü ve şarjı kontrol edin.',
        'Depolama / Aksesuar',
      ],
    ],
  },
  ram: {
    issues: [
      [
        'Karışık kit / profil uyumsuzluğu',
        'medium',
        'Aynı seri farklı revizyon içerebilir; XMP/EXPO her CPU / kartta garanti değildir.',
        'Uyumlu kit maliyetini karşılaştırın.',
      ],
      [
        'Hücre / kontak hatası',
        'high',
        'Stokta da görülen hata modül, yuva veya denetleyiciden olabilir; ayrı test edin.',
        'Garanti / kit değişimi teklifi alın.',
      ],
    ],
    checks: [
      [
        'SPD ve kit etiketi',
        'Modül kodu / kapasitesini etiketle eşleştirin; fiyatın tek modül mü kit mi olduğunu doğrulayın.',
        'Orijinallik',
      ],
      [
        'JEDEC / profil testi',
        'Modülleri ayrı ve çift kanalda MemTest86 ile deneyin; önce stok, sonra destekleniyorsa XMP/EXPO kullanın.',
        'Bellek / Kararlılık',
      ],
      [
        'DDR nesli / form faktörü',
        'DDR4 ve DDR5 birbirinin yerine geçmez; DIMM / SO-DIMM ile MT/s / gerçek saat ayrımını kontrol edin.',
        'Uyumluluk',
      ],
    ],
  },
  motherboard: {
    issues: [
      [
        'Soket / yuva hasarı',
        'high',
        'Pin, mandal, çizik yol, oksit ve montaj izlerini güç kesikken inceleyin.',
        repair,
      ],
      [
        'BIOS / CPU / RAM uyumu',
        'medium',
        'Aynı soket her nesli desteklemez; DDR varyantı ve BIOS tam modele bağlıdır.',
        repair,
      ],
    ],
    checks: [
      [
        'Tam model / destek listesi',
        'PCB modeli / revizyonunu BIOS ile eşleştirin; CPU listesi, DDR nesli ve minimum BIOS sürümünü doğrulayın.',
        'BIOS / Uyumluluk',
      ],
      [
        'Yuvalar / bağlantılar',
        'Kanallar, PCIe, M.2, LAN, USB, ses ve varsa Wi-Fi’yi uyumlu sağlam parçalarla deneyin.',
        'Giriş çıkış',
      ],
      [
        'PCB / güç devresi',
        'İki yüzde sıvı, kararma ve hasar arayın; stok ayarda yük ve yeniden başlatma deneyin.',
        'Fiziksel / VRM',
      ],
    ],
  },
  monitor: {
    issues: [
      [
        'Piksel / panel homojenliği',
        'medium',
        'Tek renklerde piksel / renk farklarını inceleyin; IPS glow gibi davranışları kusurla karıştırmayın.',
        'Panel için servis değerlendirmesi alın.',
      ],
      [
        'Port / adaptör / ayak aşınması',
        'low',
        'Kopmayı sağlam kabloyla deneyin; port başına üst hız sınırı değişebilir.',
        repair,
      ],
    ],
    checks: [
      [
        'Panel desenleri',
        'Tek renklerde piksel, çizik, kalıcı iz ve homojenliği normal görüş mesafesinde inceleyin.',
        'Ekran / Panel',
      ],
      [
        'Çözünürlük / yenileme',
        'Desteklenen port / kabloyla ilan edilen hızı seçin; hareketli görüntü ve varsa VRR deneyin.',
        'Görüntü / Yenileme',
      ],
      [
        'Soğuk açılış / mekanik',
        'Giriş, OSD, adaptör ve ayağı deneyin; tam kodu arka etiketten doğrulayın.',
        'Güç / Mekanik',
      ],
    ],
  },
};
const RETENTION: Record<Category, number> = {
  phone: 0.9,
  gpu: 0.9,
  cpu: 0.9,
  laptop: 0.87,
  console: 0.94,
  handheld: 0.91,
  ram: 0.94,
  motherboard: 0.92,
  monitor: 0.91,
};
const TIER: Record<Tier, number> = {
  entry: 0.96,
  mid: 1,
  high: 1.04,
  flagship: 1.08,
};
const STORAGE_STEP: Record<Category, number> = {
  phone: 1800,
  laptop: 900,
  handheld: 1100,
  console: 800,
  gpu: 0,
  cpu: 0,
  ram: 0,
  motherboard: 0,
  monitor: 0,
};
const LABELS: Record<Category, string> = {
  phone: 'telefon cep telefonu',
  gpu: 'ekran kartı gpu',
  cpu: 'işlemci cpu',
  laptop: 'laptop dizüstü bilgisayar',
  console: 'oyun konsolu',
  handheld: 'el konsolu taşınabilir',
  ram: 'ram bellek',
  motherboard: 'anakart motherboard',
  monitor: 'monitör ekran monitor',
};
const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/\+/g, '-plus-')
    .replace(/ı/g, 'i')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const normalize = (s: string): string =>
  s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const roundTL = (n: number): number => Math.max(50, Math.round(n / 50) * 50);
const capacity = (gb: number): string =>
  gb >= 1024 ? `${gb / 1024}TB` : `${gb}GB`;
// Retained only to reproduce existing alternative targets and text unchanged.
// These reference prices are replaced by calibrated prices before export is read.
function legacyAlternativePrices(
  seed: Seed,
  variant: Variant,
): Pick<Product, 'marketPriceMin' | 'fairPrice' | 'marketPriceMax'> {
  const age = Math.max(0, PRICING_YEAR - seed.year);
  const retention = Math.max(0.24, RETENTION[seed.category] ** age);
  const steps = Math.max(
    0,
    Math.log2(
      (variant.storageGB ?? 1) /
        (variant.baseStorageGB ?? variant.storageGB ?? 1),
    ),
  );
  const storage =
    steps * STORAGE_STEP[seed.category] * Math.max(0.45, 1 - age * 0.05);
  const fairPrice = roundTL(
    seed.anchor * retention * TIER[seed.tier] * (variant.premium ?? 1) +
      storage +
      (variant.extraTL ?? 0),
  );
  const spread = Math.min(0.24, 0.11 + age * 0.008);
  return {
    marketPriceMin: roundTL(fairPrice * (1 - spread)),
    fairPrice,
    marketPriceMax: roundTL(fairPrice * (1 + spread)),
  };
}
const PRICING_INPUTS = new Map<string, { seed: Seed; variant: Variant }>();
function createProduct(seed: Seed, variant: Variant): Product {
  const id = `${seed.category}-${seed.key}-${variant.key}`,
    profile = PROFILES[seed.profile];
  if (!profile) throw new Error(`Bilinmeyen tanı profili: ${seed.profile}`);
  PRICING_INPUTS.set(id, { seed, variant });
  return {
    id,
    name: `${seed.name} (${variant.label})`,
    brand: seed.brand,
    category: seed.category,
    releaseYear: seed.year,
    ...legacyAlternativePrices(seed, variant),
    chronicIssues: [...profile.issues, ...(variant.issues ?? [])].map(
      (
        [title, severity, description, estimatedRepairCost],
        i,
      ): ChronicIssue => ({
        id: `${id}-issue-${i + 1}`,
        title,
        severity,
        description,
        estimatedRepairCost,
      }),
    ),
    checklist: [...profile.checks, ...(variant.checks ?? [])].map(
      ([title, instruction, targetArea], i): ChecklistItem => ({
        id: `${id}-check-${i + 1}`,
        title,
        instruction,
        targetArea,
      }),
    ),
    alternatives: [],
  };
}

// Intentionally supported capacity/color lists, not a universal storage cross-product.
type PhoneRow = readonly [
  model: string,
  year: number,
  anchor: number,
  capacities: readonly number[],
  colors: readonly string[],
];
const IPHONES: readonly PhoneRow[] = [
  ['8', 2017, 16000, [64, 128, 256], ['Uzay Grisi', 'Gümüş']],
  ['8 Plus', 2017, 19000, [64, 128, 256], ['Uzay Grisi', 'Gümüş']],
  ['X', 2017, 22000, [64, 256], ['Uzay Grisi', 'Gümüş']],
  ['XR', 2018, 21000, [64, 128, 256], ['Siyah', 'Beyaz']],
  ['XS', 2018, 24000, [64, 256, 512], ['Uzay Grisi', 'Gümüş']],
  ['XS Max', 2018, 28000, [64, 256, 512], ['Uzay Grisi', 'Gümüş']],
  ['11', 2019, 26000, [64, 128, 256], ['Siyah', 'Beyaz']],
  ['11 Pro', 2019, 31000, [64, 256, 512], ['Uzay Grisi', 'Gümüş']],
  ['11 Pro Max', 2019, 35000, [64, 256, 512], ['Uzay Grisi', 'Gümüş']],
  ['SE (2020)', 2020, 17500, [64, 128, 256], ['Siyah', 'Beyaz']],
  ['12 mini', 2020, 27000, [64, 128, 256], ['Siyah', 'Beyaz']],
  ['12', 2020, 33000, [64, 128, 256], ['Siyah', 'Beyaz']],
  ['12 Pro', 2020, 40000, [128, 256, 512], ['Grafit', 'Gümüş']],
  ['12 Pro Max', 2020, 45000, [128, 256, 512], ['Grafit', 'Gümüş']],
  ['13 mini', 2021, 35000, [128, 256, 512], ['Gece Yarısı', 'Yıldız Işığı']],
  ['13', 2021, 42000, [128, 256, 512], ['Gece Yarısı', 'Yıldız Işığı']],
  ['13 Pro', 2021, 49000, [128, 256, 512, 1024], ['Grafit', 'Gümüş']],
  ['13 Pro Max', 2021, 55000, [128, 256, 512, 1024], ['Grafit', 'Gümüş']],
  ['SE (2022)', 2022, 22000, [64, 128, 256], ['Gece Yarısı', 'Yıldız Işığı']],
  ['14', 2022, 43000, [128, 256, 512], ['Gece Yarısı', 'Yıldız Işığı']],
  ['14 Plus', 2022, 47000, [128, 256, 512], ['Gece Yarısı', 'Yıldız Işığı']],
  ['14 Pro', 2022, 57000, [128, 256, 512, 1024], ['Uzay Siyahı', 'Gümüş']],
  ['14 Pro Max', 2022, 63000, [128, 256, 512, 1024], ['Uzay Siyahı', 'Gümüş']],
  ['15', 2023, 46000, [128, 256, 512], ['Siyah', 'Mavi']],
  ['15 Plus', 2023, 50000, [128, 256, 512], ['Siyah', 'Mavi']],
  [
    '15 Pro',
    2023,
    64000,
    [128, 256, 512, 1024],
    ['Siyah Titanyum', 'Doğal Titanyum'],
  ],
  [
    '15 Pro Max',
    2023,
    74000,
    [256, 512, 1024],
    ['Siyah Titanyum', 'Doğal Titanyum'],
  ],
  ['16', 2024, 54000, [128, 256, 512], ['Siyah', 'Beyaz']],
  ['16 Plus', 2024, 59000, [128, 256, 512], ['Siyah', 'Beyaz']],
  [
    '16 Pro',
    2024,
    75000,
    [128, 256, 512, 1024],
    ['Siyah Titanyum', 'Doğal Titanyum'],
  ],
  [
    '16 Pro Max',
    2024,
    85000,
    [256, 512, 1024],
    ['Siyah Titanyum', 'Doğal Titanyum'],
  ],
];
const SAMSUNG_PHONES: readonly PhoneRow[] = [
  ['S9', 2018, 15000, [64, 128, 256], ['Gece Siyahı', 'Lila Mor']],
  ['S9+', 2018, 18000, [64, 128, 256], ['Gece Siyahı', 'Lila Mor']],
  ['S10e', 2019, 17000, [128, 256], ['Prizma Siyah', 'Prizma Beyaz']],
  ['S10', 2019, 21000, [128, 512], ['Prizma Siyah', 'Prizma Beyaz']],
  ['S10+', 2019, 24000, [128, 512], ['Prizma Siyah', 'Prizma Beyaz']],
  [
    'S10+ Ceramic',
    2019,
    28000,
    [512, 1024],
    ['Seramik Siyah', 'Seramik Beyaz'],
  ],
  ['S20', 2020, 24000, [128], ['Kozmik Gri', 'Bulut Mavi']],
  ['S20+', 2020, 27000, [128], ['Kozmik Siyah', 'Kozmik Gri']],
  ['S20 Ultra', 2020, 32000, [128, 256, 512], ['Kozmik Siyah', 'Kozmik Gri']],
  ['S20 FE', 2020, 21000, [128, 256], ['Bulut Lacivert', 'Bulut Beyaz']],
  ['S21', 2021, 27000, [128, 256], ['Hayalet Gri', 'Hayalet Beyaz']],
  ['S21+', 2021, 31000, [128, 256], ['Hayalet Siyah', 'Hayalet Gümüş']],
  [
    'S21 Ultra',
    2021,
    38000,
    [128, 256, 512],
    ['Hayalet Siyah', 'Hayalet Gümüş'],
  ],
  ['S21 FE', 2022, 25000, [128, 256], ['Grafit', 'Beyaz']],
  ['S22', 2022, 29000, [128, 256], ['Hayalet Siyah', 'Hayalet Beyaz']],
  ['S22+', 2022, 34000, [128, 256], ['Hayalet Siyah', 'Hayalet Beyaz']],
  [
    'S22 Ultra',
    2022,
    45000,
    [128, 256, 512, 1024],
    ['Hayalet Siyah', 'Hayalet Beyaz'],
  ],
  ['S23', 2023, 34000, [128, 256], ['Hayalet Siyah', 'Krem']],
  ['S23+', 2023, 40000, [256, 512], ['Hayalet Siyah', 'Krem']],
  ['S23 Ultra', 2023, 54000, [256, 512, 1024], ['Hayalet Siyah', 'Krem']],
  ['S23 FE', 2023, 29000, [128, 256], ['Grafit', 'Krem']],
  ['S24', 2024, 42000, [128, 256], ['Oniks Siyah', 'Mermer Gri']],
  ['S24+', 2024, 51000, [256, 512], ['Oniks Siyah', 'Mermer Gri']],
  [
    'S24 Ultra',
    2024,
    65000,
    [256, 512, 1024],
    ['Titanyum Siyah', 'Titanyum Gri'],
  ],
  ['Note8', 2017, 16000, [64, 128, 256], ['Gece Siyahı', 'Akçaağaç Altın']],
  ['Note9', 2018, 21000, [128, 512], ['Gece Siyahı', 'Okyanus Mavisi']],
  ['Note10', 2019, 24000, [256], ['Aura Siyah', 'Aura Parıltı']],
  ['Note10+', 2019, 29000, [256, 512], ['Aura Siyah', 'Aura Parıltı']],
  ['Note20', 2020, 28000, [128, 256], ['Mistik Gri', 'Mistik Bronz']],
  [
    'Note20 Ultra',
    2020,
    36000,
    [128, 256, 512],
    ['Mistik Siyah', 'Mistik Bronz'],
  ],
  ['A12', 2020, 11000, [32, 64, 128], ['Siyah', 'Mavi']],
  ['A21s', 2020, 12000, [32, 64, 128], ['Siyah', 'Mavi']],
  ['A22', 2021, 13500, [64, 128], ['Siyah', 'Beyaz']],
  ['A32', 2021, 15500, [64, 128], ['Siyah', 'Beyaz']],
  ['A33 5G', 2022, 18000, [128, 256], ['Siyah', 'Beyaz']],
  ['A34 5G', 2023, 19500, [128, 256], ['Grafit', 'Gümüş']],
  ['A35 5G', 2024, 22000, [128, 256], ['Lacivert', 'Buz Mavisi']],
  ['A50', 2019, 14000, [64, 128], ['Siyah', 'Beyaz']],
  ['A51', 2019, 15500, [64, 128], ['Prizma Siyah', 'Prizma Beyaz']],
  ['A52', 2021, 18000, [128, 256], ['Siyah', 'Beyaz']],
  ['A53 5G', 2022, 21000, [128, 256], ['Siyah', 'Beyaz']],
  ['A54 5G', 2023, 24000, [128, 256], ['Grafit', 'Beyaz']],
  ['A55 5G', 2024, 28000, [128, 256], ['Lacivert', 'Buz Mavisi']],
];
const XIAOMI_PHONES: readonly PhoneRow[] = [
  ['Mi 9', 2019, 15000, [64, 128], ['Siyah', 'Mavi']],
  ['Mi 10', 2020, 21000, [128, 256], ['Gri', 'Yeşil']],
  ['Mi 11', 2021, 27000, [128, 256], ['Gri', 'Mavi']],
  ['12', 2022, 30000, [128, 256], ['Gri', 'Mavi']],
  ['13', 2023, 38000, [128, 256, 512], ['Siyah', 'Beyaz']],
  ['13T', 2023, 30000, [256], ['Siyah', 'Mavi']],
  ['14', 2024, 47000, [256, 512], ['Siyah', 'Beyaz']],
  ['Redmi Note 8', 2019, 10000, [32, 64, 128], ['Siyah', 'Mavi']],
  ['Redmi Note 8 Pro', 2019, 12000, [64, 128, 256], ['Gri', 'Yeşil']],
  ['Redmi Note 9', 2020, 11000, [64, 128], ['Gri', 'Yeşil']],
  ['Redmi Note 9 Pro', 2020, 13500, [64, 128], ['Gri', 'Beyaz']],
  ['Redmi Note 10', 2021, 14000, [64, 128], ['Gri', 'Beyaz']],
  ['Redmi Note 10 Pro', 2021, 17000, [64, 128], ['Gri', 'Bronz']],
  ['Redmi Note 11', 2022, 15000, [64, 128], ['Grafit', 'Mavi']],
  ['Redmi Note 11 Pro', 2022, 19000, [64, 128], ['Grafit', 'Beyaz']],
  ['Redmi Note 12', 2023, 16500, [128, 256], ['Gri', 'Mavi']],
  ['Redmi Note 12 Pro 5G', 2023, 24000, [128, 256], ['Siyah', 'Mavi']],
  ['Redmi Note 13', 2024, 19000, [128, 256], ['Siyah', 'Mavi']],
  ['Redmi Note 13 Pro 5G', 2024, 28000, [128, 256, 512], ['Siyah', 'Mor']],
  ['Redmi Note 14', 2025, 20000, [128, 256], ['Siyah', 'Mavi']],
  ['Redmi Note 14 Pro 5G', 2025, 30000, [256, 512], ['Siyah', 'Mor']],
];
function generatePhones(): Product[] {
  const products: Product[] = [];
  for (const group of [
    { rows: IPHONES, brand: 'Apple', prefix: 'iPhone', profile: 'iphone' },
    {
      rows: SAMSUNG_PHONES,
      brand: 'Samsung',
      prefix: 'Galaxy',
      profile: 'android',
    },
    { rows: XIAOMI_PHONES, brand: 'Xiaomi', prefix: '', profile: 'android' },
  ])
    for (const [model, year, anchor, capacities, colors] of group.rows) {
      const name = `${group.brand} ${group.prefix} ${model}`
        .replace(/\s+/g, ' ')
        .trim();
      const seed: Seed = {
        key: slug(name),
        name,
        brand: group.brand,
        category: 'phone',
        year,
        anchor,
        tier: /Pro Max|Ultra/.test(model)
          ? 'flagship'
          : /Pro|Plus|\+/.test(model)
            ? 'high'
            : 'mid',
        profile: group.profile,
      };
      const issues: IssueSpec[] = [];
      if (group.brand === 'Apple' && /^(13|14) Pro/.test(model))
        issues.push([
          'OLED çizgi / tek renk ekran belirtisi',
          'high',
          'Parlaklık değişimi ve video altında paneli test edin; tek renk ekran veya çizgi görülürse yazılım kaynaklı olduğunu varsaymadan servis değerlendirmesi isteyin.',
          repair,
        ]);
      if (group.brand === 'Samsung' && /^S22/.test(model))
        issues.push([
          'Yükte ısınma / kısa ekran süresi',
          'medium',
          'Uzun kamera veya oyun kullanımında sıcaklık ve pil düşüşünü gözlemleyin; Snapdragon / Exynos varyantını ve pil yaşını ayrı değerlendirin.',
          repair,
        ]);
      if (group.brand === 'Xiaomi')
        issues.push([
          'Bootloader / ROM ve güncelleme geçmişi',
          'medium',
          'Satıcı ROM, bootloader ve onarım geçmişini açıklamalıdır; modelle uyuşmayan yazılım bankacılık, OTA veya açılışı etkileyebilir.',
          'Önce resmi yazılım ve kilit durumu için uzman teşhisi alın.',
        ]);
      for (const storageGB of capacities)
        for (const color of colors)
          products.push(
            createProduct(seed, {
              key: `${storageGB}gb-${slug(color)}`,
              label: `${capacity(storageGB)} / ${color}`,
              storageGB,
              baseStorageGB: Math.min(...capacities),
              issues,
              checks:
                /Note/.test(model) && group.brand === 'Samsung'
                  ? [
                      [
                        'S Pen ve yuvası',
                        'Kalemin çıkışını, ekranın tüm alanlarında yazmayı, tuşu ve modelin desteklediği işlevleri deneyin.',
                        'S Pen',
                      ],
                    ]
                  : [],
            }),
          );
    }
  return products;
}

type GpuRow = readonly [
  model: string,
  vram: number,
  year: number,
  anchor: number,
];
const NVIDIA_GPUS: readonly GpuRow[] = [
  ['GTX 1050 Ti', 4, 2016, 7500],
  ['GTX 1060', 3, 2016, 7000],
  ['GTX 1060', 6, 2016, 8500],
  ['GTX 1070', 8, 2016, 11000],
  ['GTX 1070 Ti', 8, 2017, 12000],
  ['GTX 1080', 8, 2016, 13500],
  ['GTX 1080 Ti', 11, 2017, 16000],
  ['GTX 1650', 4, 2019, 7500],
  ['GTX 1650 Super', 4, 2019, 8500],
  ['GTX 1660', 6, 2019, 9500],
  ['GTX 1660 Super', 6, 2019, 10500],
  ['GTX 1660 Ti', 6, 2019, 11000],
  ['RTX 2060', 6, 2019, 12000],
  ['RTX 2060', 12, 2021, 14000],
  ['RTX 2060 Super', 8, 2019, 14000],
  ['RTX 2070', 8, 2018, 15000],
  ['RTX 2070 Super', 8, 2019, 16500],
  ['RTX 2080', 8, 2018, 18000],
  ['RTX 2080 Super', 8, 2019, 19500],
  ['RTX 2080 Ti', 11, 2018, 24000],
  ['RTX 3050', 8, 2022, 12500],
  ['RTX 3050', 6, 2024, 10500],
  ['RTX 3060', 8, 2022, 12500],
  ['RTX 3060', 12, 2021, 14000],
  ['RTX 3060 Ti', 8, 2020, 16500],
  ['RTX 3070', 8, 2020, 18500],
  ['RTX 3070 Ti', 8, 2021, 20000],
  ['RTX 3080', 10, 2020, 24500],
  ['RTX 3080', 12, 2022, 26500],
  ['RTX 3080 Ti', 12, 2021, 29000],
  ['RTX 3090', 24, 2020, 39000],
  ['RTX 4060', 8, 2023, 17500],
  ['RTX 4060 Ti', 8, 2023, 22000],
  ['RTX 4060 Ti', 16, 2023, 26000],
  ['RTX 4070', 12, 2023, 29000],
  ['RTX 4070 Super', 12, 2024, 32000],
  ['RTX 4070 Ti', 12, 2023, 36000],
  ['RTX 4080', 16, 2022, 51000],
  ['RTX 4090', 24, 2022, 85000],
];
const AMD_GPUS: readonly GpuRow[] = [
  ['RX 570', 4, 2017, 5500],
  ['RX 570', 8, 2017, 6500],
  ['RX 580', 4, 2017, 6500],
  ['RX 580', 8, 2017, 8000],
  ['RX 5500 XT', 4, 2019, 8000],
  ['RX 5500 XT', 8, 2019, 9000],
  ['RX 5600 XT', 6, 2020, 11500],
  ['RX 5700', 8, 2019, 12000],
  ['RX 5700 XT', 8, 2019, 14000],
  ['RX 6600', 8, 2021, 11000],
  ['RX 6600 XT', 8, 2021, 12500],
  ['RX 6700 XT', 12, 2021, 16000],
  ['RX 6800', 16, 2020, 20000],
  ['RX 6800 XT', 16, 2020, 24000],
  ['RX 6900 XT', 16, 2020, 29000],
  ['RX 6950 XT', 16, 2022, 31000],
  ['RX 7600', 8, 2023, 16000],
  ['RX 7700 XT', 12, 2023, 24000],
  ['RX 7800 XT', 16, 2023, 28000],
  ['RX 7900 XTX', 24, 2022, 47000],
];
function generateGpus(): Product[] {
  const products: Product[] = [];
  for (const [vendor, rows, partners] of [
    [
      'NVIDIA',
      NVIDIA_GPUS,
      ['ASUS', 'MSI', 'Gigabyte', 'Zotac', 'Palit', 'Gainward', 'Inno3D'],
    ],
    ['AMD', AMD_GPUS, ['Sapphire', 'PowerColor', 'XFX']],
  ] as const)
    for (const [model, vram, year, anchor] of rows)
      for (const partner of partners) {
        const name = `${partner} ${vendor} ${vendor === 'NVIDIA' ? 'GeForce' : 'Radeon'} ${model}`;
        // Board-partner families: no invented cooler/OC SKU. Confirm the exact part label.
        const gddr6x =
          vendor === 'NVIDIA' &&
          /RTX (3070 Ti|3080|3090|4070|4080|4090)/.test(model);
        products.push(
          createProduct(
            {
              key: `${slug(vendor + '-' + model)}-${vram}gb-${slug(partner)}`,
              name,
              brand: partner,
              category: 'gpu',
              year,
              anchor,
              tier:
                anchor >= 39000 ? 'flagship' : anchor >= 20000 ? 'high' : 'mid',
              profile: 'gpu',
            },
            {
              key: 'standard',
              label: `${vram}GB VRAM / Üretici Tasarımı`,
              premium: partner === 'ASUS' ? 1.04 : partner === 'MSI' ? 1.02 : 1,
              issues: gddr6x
                ? [
                    [
                      'Bellek soğutması / termal ped teması',
                      'high',
                      'GDDR6X kullanan tam varyantta bellek sıcaklığı ve ped geçmişini kontrol edin; okunamayan sensörü doğrulanmış saymayın.',
                      'Uygun kalınlıkta ped ve montaj için servis teklifi alın.',
                    ],
                  ]
                : /RX (570|580)$/.test(model)
                  ? [
                      [
                        'Madencilik BIOS’u / shader varyantı',
                        'high',
                        'GPU-Z ile BIOS, saat ve shader sayısını etikete göre doğrulayın; RX 580 2048SP ayrı bir varyanttır ve bu orijinal-model kaydıyla karıştırılmamalıdır.',
                        repair,
                      ],
                    ]
                  : /RX 5700/.test(model)
                    ? [
                        [
                          'Hotspot / blok teması',
                          'medium',
                          'GPU ile hotspot farkını yük ve soğutucuyla birlikte inceleyin; büyük farkın nedenini tek başına macun olarak teşhis etmeyin.',
                          repair,
                        ],
                      ]
                    : [],
              checks: /RTX (4080|4090)/.test(model)
                ? [
                    [
                      'Yüksek güçlü bağlantı incelemesi',
                      'Güç kesikken kararma, erime ve gevşek pin arayın; hasarlı soketle yük testi yapmayın.',
                      'Güç girişi',
                    ],
                  ]
                : [],
            },
          ),
        );
      }
  return products;
}

// Explicit SKU allowlists prevent impossible suffix combinations (e.g. i3-14900K).
interface CpuGroup {
  brand: 'AMD' | 'Intel';
  year: number;
  models: string;
  anchor: number;
  platform: 'am4' | 'lga';
}
const CPU_GROUPS: readonly CpuGroup[] = [
  {
    brand: 'AMD',
    year: 2017,
    models:
      '3 1200,3 1300X,5 1400,5 1500X,5 1600,5 1600X,7 1700,7 1700X,7 1800X',
    anchor: 3800,
    platform: 'am4',
  },
  {
    brand: 'AMD',
    year: 2018,
    models: '3 2200G,5 2400G,5 2600,5 2600X,7 2700,7 2700X',
    anchor: 4300,
    platform: 'am4',
  },
  {
    brand: 'AMD',
    year: 2019,
    models:
      '3 3200G,5 3400G,5 3500X,5 3600,5 3600X,7 3700X,7 3800X,9 3900X,9 3950X',
    anchor: 4800,
    platform: 'am4',
  },
  {
    brand: 'AMD',
    year: 2020,
    models: '3 3100,3 3300X,5 3600XT,7 3800XT,9 3900XT',
    anchor: 4900,
    platform: 'am4',
  },
  {
    brand: 'AMD',
    year: 2020,
    models: '5 5600X,7 5800X,9 5900X,9 5950X',
    anchor: 5500,
    platform: 'am4',
  },
  {
    brand: 'AMD',
    year: 2021,
    models: '5 5600G,7 5700G',
    anchor: 5000,
    platform: 'am4',
  },
  {
    brand: 'AMD',
    year: 2022,
    models: '5 5500,5 5600,7 5700X,7 5800X3D',
    anchor: 5000,
    platform: 'am4',
  },
  {
    brand: 'AMD',
    year: 2024,
    models: '7 5700X3D',
    anchor: 6000,
    platform: 'am4',
  },
  {
    brand: 'AMD',
    year: 2022,
    models: '5 7600X,7 7700X,9 7900X,9 7950X',
    anchor: 8200,
    platform: 'lga',
  },
  {
    brand: 'AMD',
    year: 2023,
    models: '5 7600,7 7700,9 7900,7 7800X3D,9 7900X3D,9 7950X3D',
    anchor: 7600,
    platform: 'lga',
  },
  {
    brand: 'AMD',
    year: 2024,
    models: '5 9600X,7 9700X,9 9900X,9 9950X,7 9800X3D',
    anchor: 10500,
    platform: 'lga',
  },
  {
    brand: 'AMD',
    year: 2025,
    models: '9 9900X3D,9 9950X3D',
    anchor: 13000,
    platform: 'lga',
  },
  {
    brand: 'Intel',
    year: 2017,
    models: 'i3-8100,i3-8350K,i5-8400,i5-8600K,i7-8700,i7-8700K',
    anchor: 4200,
    platform: 'lga',
  },
  {
    brand: 'Intel',
    year: 2018,
    models: 'i3-8300,i5-8500,i5-8600,i5-9600K,i7-9700K,i9-9900K',
    anchor: 4800,
    platform: 'lga',
  },
  {
    brand: 'Intel',
    year: 2019,
    models:
      'i3-9100,i3-9100F,i5-9400,i5-9400F,i5-9500,i5-9600KF,i7-9700,i7-9700F,i7-9700KF,i9-9900,i9-9900KF',
    anchor: 4800,
    platform: 'lga',
  },
  {
    brand: 'Intel',
    year: 2020,
    models:
      'i3-10100,i3-10100F,i3-10300,i3-10320,i5-10400,i5-10400F,i5-10500,i5-10600,i5-10600K,i5-10600KF,i7-10700,i7-10700F,i7-10700K,i7-10700KF,i9-10850K,i9-10900,i9-10900F,i9-10900K,i9-10900KF',
    anchor: 5000,
    platform: 'lga',
  },
  {
    brand: 'Intel',
    year: 2021,
    models:
      'i3-10105,i3-10105F,i5-11400,i5-11400F,i5-11500,i5-11600,i5-11600K,i5-11600KF,i7-11700,i7-11700F,i7-11700K,i7-11700KF,i9-11900,i9-11900F,i9-11900K,i9-11900KF',
    anchor: 5500,
    platform: 'lga',
  },
  {
    brand: 'Intel',
    year: 2022,
    models:
      'i3-12100,i3-12100F,i3-12300,i5-12400,i5-12400F,i5-12500,i5-12600,i5-12600K,i5-12600KF,i7-12700,i7-12700F,i7-12700K,i7-12700KF,i9-12900,i9-12900F,i9-12900K,i9-12900KF',
    anchor: 5700,
    platform: 'lga',
  },
  {
    brand: 'Intel',
    year: 2023,
    models:
      'i3-13100,i3-13100F,i5-13400,i5-13400F,i5-13500,i5-13600,i5-13600K,i5-13600KF,i7-13700,i7-13700F,i7-13700K,i7-13700KF,i9-13900,i9-13900F,i9-13900K,i9-13900KF',
    anchor: 6700,
    platform: 'lga',
  },
  {
    brand: 'Intel',
    year: 2024,
    models:
      'i3-14100,i3-14100F,i5-14400,i5-14400F,i5-14500,i5-14600,i5-14600K,i5-14600KF,i7-14700,i7-14700F,i7-14700K,i7-14700KF,i9-14900,i9-14900F,i9-14900K,i9-14900KF',
    anchor: 7500,
    platform: 'lga',
  },
];
function generateCpus(): Product[] {
  const products: Product[] = [];
  for (const group of CPU_GROUPS)
    for (const model of group.models.split(',')) {
      const digit = Number(model.charAt(group.brand === 'AMD' ? 0 : 1));
      const classFactor =
        digit === 9 ? 2.8 : digit === 7 ? 1.7 : digit === 3 ? 0.65 : 1;
      const suffix = /X3D$/.test(model)
        ? 1.55
        : /KF$/.test(model)
          ? 1.14
          : /[KX]$/.test(model)
            ? 1.2
            : /F$/.test(model)
              ? 0.94
              : 1;
      const name = `${group.brand} ${group.brand === 'AMD' ? 'Ryzen' : 'Core'} ${model}`;
      const year =
        group.brand === 'Intel' && group.year >= 2022 && /K(F)?$/.test(model)
          ? group.year - 1
          : group.year;
      const seed: Seed = {
        key: slug(name),
        name,
        brand: group.brand,
        category: 'cpu',
        year,
        anchor: group.anchor * classFactor * suffix,
        tier: digit === 9 ? 'flagship' : digit === 7 ? 'high' : 'mid',
        profile: group.platform,
      };
      for (const packaging of ['Tray / Kutusuz', 'Box / Orijinal Kutulu'])
        products.push(
          createProduct(seed, {
            key: slug(packaging),
            label: packaging,
            premium: packaging.startsWith('Box') ? 1.04 : 1,
            checks: [
              [
                'Paket / garanti kontrolü',
                'Kutu kodunu CPU ile eşleştirin. Kutu bulunması soğutucu veya aktif garanti bulunduğu anlamına gelmez; aksesuar ve belgeyi ayrı doğrulayın.',
                'Paket / Garanti',
              ],
            ],
            issues:
              group.brand === 'Intel' && /i[79]-1[34]/.test(model)
                ? [
                    [
                      '13./14. nesil kararlılık geçmişi',
                      'high',
                      'Güncel BIOS ve stok ayarda oyun / yük testi yapın; hata ve servis geçmişini sorun. Güncelleme mevcut fiziksel hasarı onardığı anlamına gelmez.',
                      'Kararsızlık sürüyorsa garanti / değişim için servis değerlendirsin.',
                    ],
                  ]
                : /X3D$/.test(model)
                  ? [
                      [
                        'X3D kimliği / voltaj geçmişi',
                        'high',
                        'CPU-Z önbelleği ve modelini resmi SKU ile eşleştirin; kapak yazısı tek başına kanıt değildir. Güncel BIOS ve stok ayarda test edin.',
                        repair,
                      ],
                    ]
                  : [],
          }),
        );
    }
  return products;
}

type LaptopRow = readonly [
  name: string,
  year: number,
  anchor: number,
  ram: readonly number[],
  ssd: readonly number[],
];
const LAPTOPS: readonly LaptopRow[] = [
  ['Monster Abra A5 / GTX 1650', 2019, 36000, [8, 16, 32], [256, 512, 1024]],
  ['Monster Abra A5 / RTX 3050', 2021, 40000, [8, 16, 32], [256, 512, 1024]],
  ['Monster Abra A7 / RTX 3050 Ti', 2021, 43000, [8, 16, 32], [256, 512, 1024]],
  ['Monster Tulpar T5 / RTX 2060', 2020, 42000, [8, 16, 32], [256, 512, 1024]],
  ['Monster Tulpar T5 / RTX 3060', 2021, 47000, [8, 16, 32], [256, 512, 1024]],
  ['Monster Tulpar T7 / RTX 3070', 2021, 55000, [16, 32], [512, 1024]],
  [
    'ASUS TUF Gaming FX505 / GTX 1650',
    2019,
    35000,
    [8, 16, 32],
    [256, 512, 1024],
  ],
  [
    'ASUS TUF Gaming A15 / RTX 3050',
    2021,
    41000,
    [8, 16, 32],
    [256, 512, 1024],
  ],
  [
    'ASUS TUF Gaming A15 / RTX 3060',
    2021,
    48000,
    [8, 16, 32],
    [256, 512, 1024],
  ],
  ['ASUS TUF Gaming F15 / RTX 4060', 2023, 50000, [8, 16, 32], [512, 1024]],
  ['ASUS ROG Strix G15 / RTX 3060', 2021, 53000, [8, 16, 32], [256, 512, 1024]],
  ['ASUS ROG Strix G16 / RTX 4060', 2023, 60000, [16, 32], [512, 1024]],
  [
    'Lenovo IdeaPad Gaming 3 / GTX 1650',
    2020,
    34000,
    [8, 16, 32],
    [256, 512, 1024],
  ],
  [
    'Lenovo IdeaPad Gaming 3 / RTX 3050',
    2021,
    40000,
    [8, 16, 32],
    [256, 512, 1024],
  ],
  ['Lenovo Legion 5 / RTX 2060', 2020, 43000, [8, 16, 32], [256, 512, 1024]],
  ['Lenovo Legion 5 / RTX 3060', 2021, 51000, [8, 16, 32], [256, 512, 1024]],
  ['Lenovo Legion 5 Pro / RTX 3070', 2021, 62000, [16, 32], [512, 1024]],
  ['Acer Nitro 5 / GTX 1650', 2019, 33000, [8, 16, 32], [256, 512, 1024]],
  ['Acer Nitro 5 / RTX 3050', 2021, 39000, [8, 16, 32], [256, 512, 1024]],
  ['Acer Nitro 5 / RTX 3060', 2021, 46000, [8, 16, 32], [256, 512, 1024]],
  ['Acer Predator Helios 300 / RTX 3060', 2021, 53000, [16, 32], [512, 1024]],
  ['HP Victus 16 / RTX 3050', 2021, 41000, [8, 16, 32], [256, 512, 1024]],
  ['HP Victus 16 / RTX 4060', 2023, 49000, [8, 16, 32], [512, 1024]],
  ['HP Omen 15 / RTX 2060', 2020, 44000, [8, 16, 32], [256, 512, 1024]],
  ['HP Omen 16 / RTX 3060', 2021, 54000, [16, 32], [512, 1024]],
  ['Apple MacBook Air Intel 2017', 2017, 32000, [8], [128, 256, 512]],
  ['Apple MacBook Air Intel 2018', 2018, 35000, [8, 16], [128, 256, 512]],
  ['Apple MacBook Air Intel 2019', 2019, 36000, [8, 16], [128, 256, 512]],
  ['Apple MacBook Air Intel 2020', 2020, 37000, [8, 16], [256, 512, 1024]],
  ['Apple MacBook Pro 13 Intel 2017', 2017, 40000, [8, 16], [128, 256, 512]],
  ['Apple MacBook Pro 13 Intel 2018', 2018, 44000, [8, 16], [256, 512, 1024]],
  ['Apple MacBook Pro 13 Intel 2019', 2019, 45000, [8, 16], [128, 256, 512]],
  ['Apple MacBook Pro 13 Intel 2020', 2020, 46000, [8, 16], [256, 512, 1024]],
  ['Apple MacBook Air M1', 2020, 43000, [8, 16], [256, 512, 1024]],
  ['Apple MacBook Pro 13 M1', 2020, 48000, [8, 16], [256, 512, 1024]],
  ['Apple MacBook Air M2', 2022, 49000, [8, 16], [256, 512, 1024]],
  ['Apple MacBook Pro 13 M2', 2022, 54000, [8, 16], [256, 512, 1024]],
  ['Apple MacBook Air M3', 2024, 53000, [8, 16], [256, 512, 1024]],
  ['Apple MacBook Pro 14 M3', 2023, 66000, [8, 16], [512, 1024]],
];
function generateLaptops(): Product[] {
  return LAPTOPS.flatMap(([name, year, anchor, ramOptions, ssdOptions]) => {
    const apple = name.startsWith('Apple');
    const seed: Seed = {
      key: slug(name),
      name,
      brand: name.split(' ')[0] ?? name,
      category: 'laptop',
      year,
      anchor,
      tier: /Pro|ROG|Legion|Predator|Omen|Tulpar/.test(name) ? 'high' : 'mid',
      profile: apple ? 'macbook' : 'gamingLaptop',
    };
    return ramOptions.flatMap((ram) =>
      ssdOptions.map((ssd) =>
        createProduct(seed, {
          key: `${ram}gb-ram-${ssd}gb-ssd`,
          label: `${ram}GB RAM / ${capacity(ssd)} SSD`,
          storageGB: ssd,
          baseStorageGB: Math.min(...ssdOptions),
          extraTL:
            Math.max(0, ram - Math.min(...ramOptions)) * (apple ? 180 : 65),
          checks: [
            [
              apple ? 'Fabrika yapılandırması' : 'RAM / SSD yükseltme kontrolü',
              apple
                ? 'Apple silicon ve birçok Intel MacBook’ta RAM/SSD kullanıcı tarafından yükseltilemez; kapasiteyi çalışan sistemden doğrulayın.'
                : 'RAM/SSD satıcı yükseltmesi olabilir; tam kasa kodunu, kanal sayısını, modül uyumunu, SSD sağlığını ve montajı doğrulayın.',
              'Yapılandırma',
            ],
          ],
          issues:
            apple &&
            (/Pro 13 Intel 201[789]/.test(name) ||
              /Air Intel 201[89]/.test(name))
              ? [
                  [
                    'Kelebek klavye / tuş tekrarı',
                    'medium',
                    'Kelebek mekanizma bulunan tam modelde takılan veya çift yazan tuşları tek tek deneyin; servis değişim geçmişini sorun.',
                    repair,
                  ],
                ]
              : /ASUS TUF/.test(name)
                ? [
                    [
                      'Kablosuz kart / sürücü kopması',
                      'medium',
                      'MediaTek kart bulunan varyantlarda ısındıktan sonra indirme ve yeniden bağlanmayı test edin; her TUF aynı Wi-Fi kartını kullanmaz.',
                      repair,
                    ],
                  ]
                : [],
        }),
      ),
    );
  });
}

type GamingRow = readonly [
  name: string,
  brand: string,
  year: number,
  storage: number,
  anchor: number,
  category: 'console' | 'handheld',
];
const GAMING: readonly GamingRow[] = [
  ['PlayStation 4 Fat', 'Sony', 2013, 500, 19000, 'console'],
  ['PlayStation 4 Fat', 'Sony', 2015, 1024, 20500, 'console'],
  ['PlayStation 4 Slim', 'Sony', 2016, 500, 17000, 'console'],
  ['PlayStation 4 Slim', 'Sony', 2016, 1024, 19000, 'console'],
  ['PlayStation 4 Pro', 'Sony', 2016, 1024, 22000, 'console'],
  ['PlayStation 5 Digital Fat', 'Sony', 2020, 825, 29000, 'console'],
  ['PlayStation 5 Disc Fat', 'Sony', 2020, 825, 32000, 'console'],
  ['PlayStation 5 Slim Digital', 'Sony', 2023, 1024, 31000, 'console'],
  ['PlayStation 5 Slim Disc', 'Sony', 2023, 1024, 35000, 'console'],
  ['PlayStation 5 Pro', 'Sony', 2024, 2048, 57000, 'console'],
  ['Xbox One', 'Microsoft', 2013, 500, 14000, 'console'],
  ['Xbox One', 'Microsoft', 2015, 1024, 15500, 'console'],
  ['Xbox One S', 'Microsoft', 2016, 500, 16000, 'console'],
  ['Xbox One S', 'Microsoft', 2016, 1024, 18000, 'console'],
  ['Xbox One S', 'Microsoft', 2016, 2048, 20000, 'console'],
  ['Xbox One X', 'Microsoft', 2017, 1024, 22000, 'console'],
  ['Xbox Series S', 'Microsoft', 2020, 512, 15500, 'console'],
  ['Xbox Series S', 'Microsoft', 2023, 1024, 18500, 'console'],
  ['Xbox Series X Disc', 'Microsoft', 2020, 1024, 32000, 'console'],
  ['Xbox Series X Digital', 'Microsoft', 2024, 1024, 30000, 'console'],
  ['Xbox Series X Disc', 'Microsoft', 2024, 2048, 38000, 'console'],
  ['Nintendo Switch V1', 'Nintendo', 2017, 32, 17000, 'console'],
  ['Nintendo Switch V2', 'Nintendo', 2019, 32, 17500, 'console'],
  ['Nintendo Switch OLED', 'Nintendo', 2021, 64, 23000, 'console'],
  ['Nintendo Switch Lite', 'Nintendo', 2019, 32, 13500, 'console'],
  ['Valve Steam Deck LCD', 'Valve', 2022, 64, 18000, 'handheld'],
  ['Valve Steam Deck LCD', 'Valve', 2022, 256, 20000, 'handheld'],
  ['Valve Steam Deck LCD', 'Valve', 2022, 512, 23000, 'handheld'],
  ['Valve Steam Deck OLED', 'Valve', 2023, 512, 29000, 'handheld'],
  ['Valve Steam Deck OLED', 'Valve', 2023, 1024, 33000, 'handheld'],
  ['ASUS ROG Ally Z1', 'ASUS', 2023, 512, 24000, 'handheld'],
  ['ASUS ROG Ally Z1 Extreme', 'ASUS', 2023, 512, 29000, 'handheld'],
  ['Lenovo Legion Go', 'Lenovo', 2023, 512, 32000, 'handheld'],
  ['Lenovo Legion Go', 'Lenovo', 2023, 1024, 35000, 'handheld'],
];
function generateGamingDevices(): Product[] {
  return GAMING.flatMap(([name, brand, year, storage, anchor, category]) => {
    const portable = category === 'handheld',
      nintendo = brand === 'Nintendo';
    const seed: Seed = {
      key: `${slug(name)}-${storage}gb`,
      name,
      brand,
      category,
      year,
      anchor,
      tier: /Pro|OLED|Extreme|Series X/.test(name) ? 'high' : 'mid',
      profile: portable ? 'handheld' : 'console',
    };
    return [false, true].map((bundle) =>
      createProduct(seed, {
        key: bundle ? 'aksesuar-paketi' : 'standart-paket',
        label: `${capacity(storage)} / ${bundle ? (portable ? 'Dock + Çanta Dahil' : nintendo ? 'Pro Kontrolcü Dahil' : '2 Kontrolcü Dahil') : 'Standart Paket'}`,
        extraTL: bundle
          ? portable
            ? 2000
            : nintendo
              ? 2300
              : brand === 'Sony' && /5/.test(name)
                ? 3500
                : 2000
          : 0,
        issues: /ROG Ally/.test(name)
          ? [
              [
                'microSD okuyucu / ısı altında erişim',
                'high',
                'İlk Ally ailesinde okuyucu arızası geçmişini sorun; yükte kart algılama ve önemsiz dosyalarla okuma/yazma deneyin.',
                repair,
              ],
            ]
          : nintendo
            ? [
                [
                  'Joy-Con / analog kayması',
                  'medium',
                  'Kalibrasyon ekranında merkez sapmasını test edin; Lite kontrolleri ayrılmaz.',
                  repair,
                ],
              ]
            : /PlayStation 4 Pro/.test(name)
              ? [
                  [
                    'Yükte yüksek fan sesi',
                    'medium',
                    'Yoğun oyunda fan sesini ve bakım geçmişini kontrol edin; toz, macun veya fan sorununu ayrı değerlendirin.',
                    repair,
                  ],
                ]
              : /PlayStation 5.*Fat/.test(name)
                ? [
                    [
                      'Soğutma / sıvı metal servis geçmişi',
                      'medium',
                      'Yükte aşırı ısı ve kapanmayı araştırın; dikey kullanım tek başına kuru nokta veya arıza kanıtı değildir. Cihazı açmadan uzman servis geçmişini sorun.',
                      repair,
                    ],
                  ]
                : [],
        checks: nintendo
          ? [
              [
                'Switch / dock uyumu',
                'V1/V2 ve seri kodunu doğrulayın; her V1 unpatched değildir. Switch Lite TV çıkışı vermez; aksesuar bu özelliği eklemez.',
                'Model / Uyumluluk',
              ],
            ]
          : [],
      }),
    );
  });
}

function generateRam(): Product[] {
  const products: Product[] = [];
  for (const [brand, family, ddr, year, speeds] of [
    ['Corsair', 'Vengeance LPX', 'DDR4', 2015, [2666, 3000, 3200, 3600]],
    ['Kingston', 'FURY Beast', 'DDR4', 2021, [2666, 3000, 3200, 3600]],
    ['G.Skill', 'Ripjaws V', 'DDR4', 2015, [2666, 3000, 3200, 3600]],
    ['Kingston', 'FURY Beast', 'DDR5', 2021, [4800, 5200, 5600, 6000, 6400]],
    ['Corsair', 'Vengeance', 'DDR5', 2021, [4800, 5200, 5600, 6000, 6400]],
  ] as const)
    for (const total of ddr === 'DDR4' ? [8, 16, 32] : [16, 32, 64])
      for (const speed of speeds) {
        const modules = total === (ddr === 'DDR4' ? 8 : 16) ? 1 : 2;
        products.push(
          createProduct(
            {
              key: slug(`${brand}-${family}-${ddr}`),
              name: `${brand} ${family} ${ddr}`,
              brand,
              category: 'ram',
              year,
              anchor: total * (ddr === 'DDR4' ? 125 : 165),
              tier: 'mid',
              profile: 'ram',
            },
            {
              key: `${total}gb-${modules}x${total / modules}-${speed}`,
              label: `${total}GB / ${modules}×${total / modules}GB / ${speed}MT/s UDIMM`,
              premium: 1 + (speed - (ddr === 'DDR4' ? 2666 : 4800)) / 12000,
              checks: [
                [
                  'Tam kit kodu / profil tipi',
                  'Bu kayıt kapasite/hız ailesidir; tam SKU, gecikme, voltaj ve XMP/EXPO desteğini etiketten doğrulayın. Her DDR5 kitinde EXPO varsaymayın.',
                  'Kit / Profil',
                ],
              ],
            },
          ),
        );
      }
  return products;
}
type BoardRow = readonly [
  name: string,
  year: number,
  ddr: 'DDR4' | 'DDR5',
  anchor: number,
];
const BOARDS: readonly BoardRow[] = [
  ['MSI B450 TOMAHAWK MAX', 2019, 'DDR4', 4300],
  ['ASUS TUF B450-PLUS GAMING', 2018, 'DDR4', 4200],
  ['Gigabyte B450 AORUS ELITE', 2018, 'DDR4', 4100],
  ['ASRock B450M Pro4', 2018, 'DDR4', 3300],
  ['MSI B550M PRO-VDH WIFI', 2020, 'DDR4', 5000],
  ['ASUS TUF GAMING B550-PLUS', 2020, 'DDR4', 5800],
  ['Gigabyte B550 AORUS ELITE', 2020, 'DDR4', 5600],
  ['ASRock B550M Pro4', 2020, 'DDR4', 4300],
  ['MSI MPG X570 GAMING PLUS', 2019, 'DDR4', 7200],
  ['ASUS TUF GAMING X570-PLUS', 2019, 'DDR4', 7800],
  ['Gigabyte X570 AORUS ELITE', 2019, 'DDR4', 7600],
  ['MSI PRO B650-P WIFI', 2022, 'DDR5', 8000],
  ['ASUS TUF GAMING B650-PLUS', 2022, 'DDR5', 9000],
  ['Gigabyte B650 AORUS ELITE AX', 2022, 'DDR5', 9500],
  ['ASRock B650M Pro RS', 2023, 'DDR5', 6500],
  ['MSI PRO X670-P WIFI', 2022, 'DDR5', 11500],
  ['ASUS PRIME X670-P', 2022, 'DDR5', 11000],
  ['Gigabyte X670 AORUS ELITE AX', 2022, 'DDR5', 12500],
  ['MSI PRO B660M-A DDR4', 2022, 'DDR4', 5700],
  ['ASUS PRIME B660-PLUS D4', 2022, 'DDR4', 5500],
  ['Gigabyte B660M DS3H DDR4', 2022, 'DDR4', 4700],
  ['MSI PRO B760M-A WIFI DDR4', 2023, 'DDR4', 6500],
  ['ASUS TUF GAMING B760-PLUS WIFI', 2023, 'DDR5', 8500],
  ['Gigabyte B760 GAMING X', 2023, 'DDR5', 7200],
  ['MSI PRO Z690-A DDR4', 2021, 'DDR4', 8500],
  ['ASUS PRIME Z690-P', 2021, 'DDR5', 9500],
  ['Gigabyte Z690 UD DDR4', 2021, 'DDR4', 8000],
  ['MSI PRO Z790-A WIFI', 2022, 'DDR5', 12000],
  ['ASUS PRIME Z790-P', 2022, 'DDR5', 11000],
  ['Gigabyte Z790 AORUS ELITE AX', 2022, 'DDR5', 14000],
];
function generateBoards(): Product[] {
  return BOARDS.map(([name, year, ddr, anchor]) =>
    createProduct(
      {
        key: slug(name),
        name,
        brand: name.split(' ')[0] ?? name,
        category: 'motherboard',
        year,
        anchor,
        tier: /X[56]70|Z[67]90/.test(name) ? 'high' : 'mid',
        profile: 'motherboard',
      },
      {
        key: ddr.toLowerCase(),
        label: `${ddr} / ${/B450|B550|X570/.test(name) ? 'AM4' : /B650|X670/.test(name) ? 'AM5' : 'LGA1700'}`,
      },
    ),
  );
}
type MonitorRow = readonly [
  name: string,
  year: number,
  resolution: string,
  hz: number,
  inches: number,
  anchor: number,
];
const MONITORS: readonly MonitorRow[] = [
  ['AOC 24G2U/BK', 2019, '1080p', 144, 23.8, 7500],
  ['ASUS VG249Q', 2019, '1080p', 144, 23.8, 8000],
  ['MSI Optix G241', 2020, '1080p', 144, 23.8, 7500],
  ['BenQ ZOWIE XL2411P', 2017, '1080p', 144, 24, 8500],
  ['LG 24GN600-B', 2020, '1080p', 144, 23.8, 7800],
  ['ASUS VG259QM', 2020, '1080p', 240, 24.5, 11500],
  ['BenQ ZOWIE XL2546K', 2020, '1080p', 240, 24.5, 18000],
  ['Dell S2522HG', 2021, '1080p', 240, 24.5, 11000],
  ['LG 27GL850-B', 2019, '1440p / 2K', 144, 27, 13500],
  ['ASUS VG27AQ', 2019, '1440p / 2K', 144, 27, 14000],
  ['Dell S2721DGF', 2020, '1440p / 2K', 165, 27, 14500],
  ['Gigabyte M27Q', 2020, '1440p / 2K', 170, 27, 14000],
  ['MSI G274QPF-QD', 2023, '1440p / 2K', 170, 27, 14000],
  ['Samsung Odyssey G7 C27G75T', 2020, '1440p / 2K', 240, 27, 19000],
  ['Gigabyte M27Q X', 2022, '1440p / 2K', 240, 27, 20000],
  ['LG 27GR83Q-B', 2023, '1440p / 2K', 240, 27, 21000],
  ['LG 27GP950-B', 2021, '2160p / 4K', 144, 27, 26000],
  ['Gigabyte M28U', 2021, '2160p / 4K', 144, 28, 25000],
  ['ASUS VG28UQL1A', 2021, '2160p / 4K', 144, 28, 28000],
  ['Samsung Odyssey Neo G8 S32BG85', 2022, '2160p / 4K', 240, 32, 39000],
];
function generateMonitors(): Product[] {
  return MONITORS.map(([name, year, resolution, hz, inches, anchor]) =>
    createProduct(
      {
        key: slug(name),
        name,
        brand: name.split(' ')[0] ?? name,
        category: 'monitor',
        year,
        anchor,
        tier: /4K/.test(resolution) ? 'high' : 'mid',
        profile: 'monitor',
      },
      {
        key: `${slug(resolution)}-${hz}hz`,
        label: `${inches} inç / ${resolution} / ${hz}Hz`,
        checks: [
          [
            'Port / hız modu',
            'İlan edilen hız desteklenen temel veya OC modudur; tam modelin port başına sınırını ve OSD modunu doğrulayın. Her girişte aynı hızı beklemeyin.',
            'Yenileme / Port',
          ],
        ],
      },
    ),
  );
}

/** Pre-generated once at module load; each variant owns its nested objects. */
export const PRODUCTS_DATABASE: Product[] = [
  ...generatePhones(),
  ...generateGpus(),
  ...generateCpus(),
  ...generateLaptops(),
  ...generateGamingDevices(),
  ...generateRam(),
  ...generateBoards(),
  ...generateMonitors(),
];
const PRODUCTS_BY_ID = new Map<string, Product>();
const PRODUCTS_BY_CATEGORY = new Map<Category, Product[]>();
for (const p of PRODUCTS_DATABASE) {
  if (PRODUCTS_BY_ID.has(p.id))
    throw new Error(`Tekrarlanan ürün kimliği: ${p.id}`);
  PRODUCTS_BY_ID.set(p.id, p);
  const bucket = PRODUCTS_BY_CATEGORY.get(p.category);
  if (bucket) bucket.push(p);
  else PRODUCTS_BY_CATEGORY.set(p.category, [p]);
}
// Guard the promised coverage when seed tables are edited in the future.
const categorySize = (category: Category): number =>
  PRODUCTS_BY_CATEGORY.get(category)?.length ?? 0;
if (
  PRODUCTS_DATABASE.length < 1000 ||
  categorySize('phone') < 300 ||
  categorySize('gpu') < 250 ||
  categorySize('cpu') < 200 ||
  categorySize('laptop') < 150 ||
  categorySize('console') + categorySize('handheld') < 60 ||
  categorySize('ram') + categorySize('motherboard') + categorySize('monitor') <
    100
) {
  throw new Error('Katalog kategori kapsamı gereken minimumun altında.');
}
// Nearby-price alternatives point to real generated IDs, excluding same-model
// color/packaging siblings. This is a comparison, not a performance guarantee.
const family = (p: Product): string => p.name.replace(/ \([^)]*\)$/, '');
for (const products of PRODUCTS_BY_CATEGORY.values()) {
  const sorted = [...products].sort(
    (a, b) => a.fairPrice - b.fairPrice || a.id.localeCompare(b.id),
  );
  for (let index = 0; index < sorted.length; index += 1) {
    const p = sorted[index];
    if (!p) continue;
    const candidates: Product[] = [];
    for (
      let distance = 1;
      distance < sorted.length && candidates.length < 2;
      distance += 1
    ) {
      for (const other of [
        sorted[index - distance],
        sorted[index + distance],
      ]) {
        if (
          other &&
          family(other) !== family(p) &&
          !candidates.some((c) => family(c) === family(other))
        )
          candidates.push(other);
        if (candidates.length === 2) break;
      }
    }
    p.alternatives = candidates.map((other): Alternative => {
      const diff = other.fairPrice - p.fairPrice;
      const compatibility = ['cpu', 'ram', 'motherboard'].includes(p.category)
        ? ' Soket, BIOS ve DDR nesli uyumunu ayrıca doğrulayın; doğrudan parça uyumu varsaymayın.'
        : '';
      return {
        id: other.id,
        name: other.name,
        priceDiffNote:
          diff === 0
            ? 'Benzer tahmini adil fiyat'
            : `${Math.abs(diff).toLocaleString('tr-TR')} TL ${diff < 0 ? 'daha uygun' : 'ek bütçe'} (tahmini)`,
        reason: `${diff <= 0 ? 'Daha düşük veya benzer bütçede aynı kategoriden seçenek.' : 'Yakın bütçede farklı donanım / özellik seçeneği.'} Kapasite, kondisyon ve kullanım amacınızı karşılaştırın.${compatibility}`,
      };
    });
  }
}
type PriceRange = Pick<
  Product,
  'marketPriceMin' | 'fairPrice' | 'marketPriceMax'
>;
type Benchmark = readonly [minimum: number, fair: number, maximum: number];

function exactRange([
  marketPriceMin,
  fairPrice,
  marketPriceMax,
]: Benchmark): PriceRange {
  return { marketPriceMin, fairPrice, marketPriceMax };
}

// Unlisted configurations use a consistent 90% / 112.5% envelope. Round bounds
// to 10 TL so inexpensive components still meet the percentage constraints.
function standardRange(value: number): PriceRange {
  const fairPrice = roundTL(value);
  return {
    marketPriceMin: Math.round((fairPrice * 0.9) / 10) * 10,
    fairPrice,
    marketPriceMax: Math.round((fairPrice * 1.125) / 10) * 10,
  };
}
function requiredFair(
  table: Readonly<Record<string, number>>,
  key: string,
): number {
  const fair = table[key];
  if (fair === undefined)
    throw new Error(`Eksik 2026 fiyat kalibrasyonu: ${key}`);
  return fair;
}

const IPHONE_FAIR_2026: Readonly<Record<string, number>> = {
  '8': 6500,
  '8 Plus': 7500,
  X: 8000,
  XR: 9500,
  XS: 11000,
  'XS Max': 12500,
  '11': 14200,
  '11 Pro': 18000,
  '11 Pro Max': 20000,
  'SE (2020)': 8500,
  '12 mini': 15500,
  '12': 18500,
  '12 Pro': 27000,
  '12 Pro Max': 30000,
  '13 mini': 29500,
  '13': 34500,
  '13 Pro': 41000,
  '13 Pro Max': 45000,
  'SE (2022)': 11500,
  '14': 38000,
  '14 Plus': 41000,
  '14 Pro': 50500,
  '14 Pro Max': 54500,
  '15': 45000,
  '15 Plus': 48500,
  '15 Pro': 62000,
  '15 Pro Max': 70000,
  '16': 56500,
  '16 Plus': 61000,
  '16 Pro': 75500,
  '16 Pro Max': 85500,
};
const SAMSUNG_FAIR_2026: Readonly<Record<string, number>> = {
  S9: 6500,
  'S9+': 7500,
  S10e: 8500,
  S10: 9500,
  'S10+': 11000,
  'S10+ Ceramic': 12500,
  S20: 12500,
  'S20+': 14000,
  'S20 Ultra': 16500,
  'S20 FE': 10500,
  S21: 14500,
  'S21+': 16000,
  'S21 Ultra': 21000,
  'S21 FE': 13500,
  S22: 17800,
  'S22+': 21000,
  'S22 Ultra': 28500,
  S23: 27500,
  'S23+': 32000,
  'S23 Ultra': 40000,
  'S23 FE': 21000,
  S24: 35500,
  'S24+': 42000,
  'S24 Ultra': 52000,
  Note8: 7500,
  Note9: 9500,
  Note10: 11500,
  'Note10+': 14000,
  Note20: 15500,
  'Note20 Ultra': 20000,
  A12: 7200,
  A21s: 7000,
  A22: 8000,
  A32: 8500,
  'A33 5G': 9000,
  'A34 5G': 10500,
  'A35 5G': 12500,
  A50: 7500,
  A51: 7800,
  A52: 9500,
  'A53 5G': 10500,
  'A54 5G': 12500,
  'A55 5G': 15000,
};
const XIAOMI_FAIR_2026: Readonly<Record<string, number>> = {
  'Mi 9': 8500,
  'Mi 10': 11000,
  'Mi 11': 14500,
  '12': 20000,
  '13': 26500,
  '13T': 23000,
  '14': 34000,
  'Redmi Note 8': 7200,
  'Redmi Note 8 Pro': 7450,
  'Redmi Note 9': 7300,
  'Redmi Note 9 Pro': 7700,
  'Redmi Note 10': 7600,
  'Redmi Note 10 Pro': 8000,
  'Redmi Note 11': 7800,
  'Redmi Note 11 Pro': 8250,
  'Redmi Note 12': 8000,
  'Redmi Note 12 Pro 5G': 8500,
  'Redmi Note 13': 8200,
  'Redmi Note 13 Pro 5G': 8750,
  'Redmi Note 14': 8400,
  'Redmi Note 14 Pro 5G': 8950,
};
function calibratedPhone(seed: Seed, variant: Variant): PriceRange {
  const storage = variant.storageGB ?? 0;
  const baseStorage = variant.baseStorageGB ?? storage;
  const steps = Math.max(0, Math.log2(storage / baseStorage));
  if (seed.brand === 'Apple') {
    const model = seed.name.replace(/^Apple iPhone /, '');
    // The supplied 11 benchmark explicitly covers both 64GB and 128GB.
    if (model === '11' && storage <= 128)
      return exactRange([12500, 14200, 16000]);
    if (model === '12' && storage === 128)
      return exactRange([18500, 21000, 23500]);
    if (model === '13' && storage === 128)
      return exactRange([31000, 34500, 38000]);
    if (model === '14 Pro' && storage === 128)
      return exactRange([46000, 50500, 55000]);
    const paidSteps =
      model === '11' ? Math.max(0, Math.log2(storage / 128)) : steps;
    return standardRange(
      requiredFair(IPHONE_FAIR_2026, model) + paidSteps * 2500,
    );
  }
  if (seed.brand === 'Samsung') {
    const model = seed.name.replace(/^Samsung Galaxy /, '');
    if (model === 'S22' && storage === 128)
      return exactRange([15500, 17800, 20000]);
    if (model === 'S23' && storage === 128)
      return exactRange([24500, 27500, 31000]);
    return standardRange(requiredFair(SAMSUNG_FAIR_2026, model) + steps * 2000);
  }
  const model = seed.name.replace(/^Xiaomi /, '');
  const baseline = requiredFair(XIAOMI_FAIR_2026, model);
  if (model.startsWith('Redmi Note')) {
    return standardRange(
      Math.min(9450, Math.max(7050, baseline + steps * 200)),
    );
  }
  return standardRange(baseline + steps * 1200);
}

// Exact key matching prevents 3060/3060 Ti, 3070/3070 Ti and 8/12GB collisions.
const GPU_BENCHMARKS: Readonly<Record<string, Benchmark>> = {
  'RX 580|8': [2200, 2800, 3400],
  'GTX 1060|6': [2200, 2800, 3400],
  'RTX 2060|6': [4500, 5400, 6200],
  'RTX 2060|12': [4500, 5400, 6200],
  'GTX 1660 Super|6': [4500, 5400, 6200],
  'RTX 3060|12': [8000, 9200, 10500],
  'RX 6700 XT|12': [9500, 10800, 12500],
  'RTX 3070 Ti|8': [12500, 14000, 15800],
  'RTX 4060|8': [11500, 13200, 14800],
  'RTX 4070|12': [23000, 25800, 28500],
  'RTX 3080|10': [15000, 17200, 19500],
};
const GPU_FAIR_2026: Readonly<Record<string, number>> = {
  'GTX 1050 Ti|4': 2200,
  'GTX 1060|3': 2300,
  'GTX 1070|8': 3800,
  'GTX 1070 Ti|8': 4500,
  'GTX 1080|8': 4800,
  'GTX 1080 Ti|11': 5800,
  'GTX 1650|4': 3600,
  'GTX 1650 Super|4': 4200,
  'GTX 1660|6': 4600,
  'GTX 1660 Ti|6': 5600,
  'RTX 2060 Super|8': 6500,
  'RTX 2070|8': 6800,
  'RTX 2070 Super|8': 7500,
  'RTX 2080|8': 7800,
  'RTX 2080 Super|8': 8500,
  'RTX 2080 Ti|11': 10000,
  'RTX 3050|8': 7000,
  'RTX 3050|6': 6200,
  'RTX 3060|8': 8200,
  'RTX 3060 Ti|8': 10500,
  'RTX 3070|8': 11800,
  'RTX 3080|12': 18500,
  'RTX 3080 Ti|12': 20500,
  'RTX 3090|24': 26000,
  'RTX 4060 Ti|8': 17000,
  'RTX 4060 Ti|16': 19500,
  'RTX 4070 Super|12': 28500,
  'RTX 4070 Ti|12': 31000,
  'RTX 4080|16': 43500,
  'RTX 4090|24': 72500,
  'RX 570|4': 1800,
  'RX 570|8': 2200,
  'RX 580|4': 2300,
  'RX 5500 XT|4': 3100,
  'RX 5500 XT|8': 3800,
  'RX 5600 XT|6': 4400,
  'RX 5700|8': 4800,
  'RX 5700 XT|8': 5800,
  'RX 6600|8': 5800,
  'RX 6600 XT|8': 6800,
  'RX 6800|16': 14000,
  'RX 6800 XT|16': 17000,
  'RX 6900 XT|16': 19500,
  'RX 6950 XT|16': 21500,
  'RX 7600|8': 9500,
  'RX 7700 XT|12': 16500,
  'RX 7800 XT|16': 20500,
  'RX 7900 XTX|24': 34500,
};
function calibratedGpu(seed: Seed, variant: Variant): PriceRange {
  const model = seed.name.split(/GeForce |Radeon /)[1];
  const vram = variant.label.match(/^(\d+)GB/)?.[1];
  const key = `${model}|${vram}`;
  const benchmark = GPU_BENCHMARKS[key];
  if (benchmark) return exactRange(benchmark);
  return standardRange(
    requiredFair(GPU_FAIR_2026, key) * (variant.premium ?? 1),
  );
}

const CPU_BENCHMARKS: Readonly<Record<string, Benchmark>> = {
  'AMD Ryzen 5 3600': [1800, 2300, 2800],
  'Intel Core i5-10400F': [1800, 2300, 2800],
  'AMD Ryzen 5 5600': [3200, 3800, 4300],
  'AMD Ryzen 7 7800X3D': [15500, 17200, 19000],
  'Intel Core i7-13700K': [12500, 14200, 16000],
};
const AMD_CPU_FAIR_2026: Readonly<Record<string, number>> = {
  '1200': 1000,
  '1300X': 1200,
  '1400': 1300,
  '1500X': 1500,
  '1600': 1700,
  '1600X': 1900,
  '1700': 2100,
  '1700X': 2300,
  '1800X': 2600,
  '2200G': 1600,
  '2400G': 2200,
  '2600': 2100,
  '2600X': 2400,
  '2700': 2900,
  '2700X': 3200,
  '3200G': 2000,
  '3400G': 2600,
  '3500X': 2100,
  '3600X': 2600,
  '3700X': 3700,
  '3800X': 4000,
  '3900X': 6500,
  '3950X': 8500,
  '3100': 1700,
  '3300X': 2000,
  '3600XT': 2800,
  '3800XT': 4300,
  '3900XT': 7000,
  '5600X': 4200,
  '5800X': 6500,
  '5900X': 9000,
  '5950X': 12000,
  '5600G': 3500,
  '5700G': 5000,
  '5500': 2800,
  '5700X': 6000,
  '5800X3D': 10500,
  '5700X3D': 8500,
  '7600X': 7500,
  '7700X': 10000,
  '7900X': 14000,
  '7950X': 19000,
  '7600': 6800,
  '7700': 9000,
  '7900': 13000,
  '7900X3D': 19000,
  '7950X3D': 24000,
  '9600X': 9500,
  '9700X': 13000,
  '9900X': 19000,
  '9950X': 26000,
  '9800X3D': 24500,
  '9900X3D': 30000,
  '9950X3D': 36000,
};
const INTEL_CPU_FAIR_2026: Readonly<Record<string, number>> = {
  '8-3': 1100,
  '8-5': 1900,
  '8-7': 3500,
  '9-3': 1400,
  '9-5': 2300,
  '9-7': 4100,
  '9-9': 6500,
  '10-3': 1600,
  '10-5': 2500,
  '10-7': 4800,
  '10-9': 7000,
  '11-5': 3300,
  '11-7': 5500,
  '11-9': 7800,
  '12-3': 2700,
  '12-5': 4400,
  '12-7': 7800,
  '12-9': 11200,
  '13-3': 3400,
  '13-5': 6200,
  '13-7': 11500,
  '13-9': 17200,
  '14-3': 4000,
  '14-5': 7200,
  '14-7': 14500,
  '14-9': 21000,
};
function calibratedCpu(seed: Seed, variant: Variant): PriceRange {
  const benchmark = CPU_BENCHMARKS[seed.name];
  if (benchmark) return exactRange(benchmark);
  const boxed = variant.key.startsWith('box') ? 250 : 0;
  if (seed.brand === 'AMD') {
    const sku = seed.name.replace(/^AMD Ryzen \d /, '');
    return standardRange(requiredFair(AMD_CPU_FAIR_2026, sku) + boxed);
  }
  const match = seed.name.match(/Core i([3579])-(\d{4,5})(KF|K|F)?$/);
  if (!match) throw new Error(`Bilinmeyen Intel fiyat modeli: ${seed.name}`);
  const tier = Number(match[1]),
    digits = match[2] ?? '',
    suffix = match[3] ?? '';
  const generation = Number(digits.slice(0, digits.length === 4 ? 1 : 2));
  const baseline = requiredFair(INTEL_CPU_FAIR_2026, `${generation}-${tier}`);
  const step =
    Number(digits.slice(-3)) / 100 -
    (tier === 3 ? 1 : tier === 5 ? 4 : tier === 7 ? 7 : 9);
  const premium =
    suffix === 'K' ? 1.18 : suffix === 'KF' ? 1.14 : suffix === 'F' ? 0.96 : 1;
  return standardRange((baseline + Math.max(0, step) * 450) * premium + boxed);
}

const LAPTOP_FAIR_2026: Readonly<Record<string, number>> = {
  'Monster Abra A5 / GTX 1650': 16500,
  'Monster Abra A5 / RTX 3050': 16500,
  'Monster Abra A7 / RTX 3050 Ti': 18500,
  'Monster Tulpar T5 / RTX 2060': 21000,
  'Monster Tulpar T5 / RTX 3060': 24500,
  'Monster Tulpar T7 / RTX 3070': 29500,
  'ASUS TUF Gaming FX505 / GTX 1650': 16500,
  'ASUS TUF Gaming A15 / RTX 3050': 17500,
  'ASUS TUF Gaming A15 / RTX 3060': 25000,
  'ASUS TUF Gaming F15 / RTX 4060': 29500,
  'ASUS ROG Strix G15 / RTX 3060': 29000,
  'ASUS ROG Strix G16 / RTX 4060': 36000,
  'Lenovo IdeaPad Gaming 3 / GTX 1650': 16000,
  'Lenovo IdeaPad Gaming 3 / RTX 3050': 17500,
  'Lenovo Legion 5 / RTX 2060': 22000,
  'Lenovo Legion 5 / RTX 3060': 25000,
  'Lenovo Legion 5 Pro / RTX 3070': 31500,
  'Acer Nitro 5 / GTX 1650': 16500,
  'Acer Nitro 5 / RTX 3050': 16500,
  'Acer Nitro 5 / RTX 3060': 24000,
  'Acer Predator Helios 300 / RTX 3060': 28500,
  'HP Victus 16 / RTX 3050': 17500,
  'HP Victus 16 / RTX 4060': 29500,
  'HP Omen 15 / RTX 2060': 22000,
  'HP Omen 16 / RTX 3060': 28500,
  'Apple MacBook Air Intel 2017': 9500,
  'Apple MacBook Air Intel 2018': 12500,
  'Apple MacBook Air Intel 2019': 13500,
  'Apple MacBook Air Intel 2020': 15500,
  'Apple MacBook Pro 13 Intel 2017': 13500,
  'Apple MacBook Pro 13 Intel 2018': 16000,
  'Apple MacBook Pro 13 Intel 2019': 17500,
  'Apple MacBook Pro 13 Intel 2020': 20000,
  'Apple MacBook Air M1': 22000,
  'Apple MacBook Pro 13 M1': 26000,
  'Apple MacBook Air M2': 30000,
  'Apple MacBook Pro 13 M2': 32000,
  'Apple MacBook Air M3': 37000,
  'Apple MacBook Pro 14 M3': 44000,
};
function calibratedLaptop(seed: Seed, variant: Variant): PriceRange {
  const row = LAPTOPS.find(([name]) => name === seed.name);
  const ram = Number(variant.key.match(/^(\d+)gb-ram/)?.[1]);
  if (!row || !Number.isFinite(ram))
    throw new Error(`Eksik laptop yapılandırması: ${seed.name}`);
  const minimumRam = Math.min(...row[3]);
  const minimumStorage = Math.min(...row[4]);
  const storage = variant.storageGB ?? minimumStorage;
  const extra =
    (ram - minimumRam) * (seed.brand === 'Apple' ? 375 : 100) +
    Math.max(0, Math.log2(storage / minimumStorage)) * 1500;
  if (extra === 0) {
    if (seed.name === 'Apple MacBook Air M1')
      return exactRange([19500, 22000, 24500]);
    if (
      /^(Monster Abra A5|Acer Nitro 5) \/ (GTX 1650|RTX 3050)$/.test(seed.name)
    )
      return exactRange([14000, 16500, 18500]);
    if (/^(ASUS TUF Gaming A15|Lenovo Legion 5) \/ RTX 3060$/.test(seed.name))
      return exactRange([22000, 25000, 28500]);
  }
  return standardRange(requiredFair(LAPTOP_FAIR_2026, seed.name) + extra);
}

const GAMING_FAIR_2026: Readonly<Record<string, number>> = {
  'PlayStation 4 Fat': 6800,
  'PlayStation 4 Slim': 6800,
  'PlayStation 4 Pro': 9800,
  'PlayStation 5 Digital Fat': 20500,
  'PlayStation 5 Disc Fat': 23500,
  'PlayStation 5 Slim Digital': 24500,
  'PlayStation 5 Slim Disc': 27500,
  'PlayStation 5 Pro': 42000,
  'Xbox One': 4500,
  'Xbox One S': 5500,
  'Xbox One X': 7500,
  'Xbox Series S': 12000,
  'Xbox Series X Disc': 25000,
  'Xbox Series X Digital': 22000,
  'Nintendo Switch V1': 8200,
  'Nintendo Switch V2': 9000,
  'Nintendo Switch OLED': 12200,
  'Nintendo Switch Lite': 6800,
  'Valve Steam Deck LCD': 13500,
  'Valve Steam Deck OLED': 25500,
  'ASUS ROG Ally Z1': 16500,
  'ASUS ROG Ally Z1 Extreme': 22000,
  'Lenovo Legion Go': 25500,
};
function calibratedGaming(seed: Seed, variant: Variant): PriceRange {
  // These seeds encode capacity in their key rather than Variant.storageGB.
  const storage = Number(seed.key.match(/-(\d+)gb$/)?.[1]);
  let fair = requiredFair(GAMING_FAIR_2026, seed.name);
  if (seed.name === 'Xbox One' && storage === 1024) fair += 500;
  if (seed.name === 'Xbox One S')
    fair += storage === 2048 ? 2500 : storage === 1024 ? 1000 : 0;
  if (seed.name === 'Xbox Series S' && storage === 1024) fair += 2000;
  if (seed.name === 'Xbox Series X Disc' && storage === 2048) fair += 5000;
  if (seed.name === 'Valve Steam Deck LCD' && storage >= 256) fair = 16500;
  if (
    /Valve Steam Deck OLED|Lenovo Legion Go/.test(seed.name) &&
    storage === 1024
  )
    fair += 2000;
  if (variant.key === 'standart-paket') {
    if (/PlayStation 4 (Fat|Slim)$/.test(seed.name))
      return exactRange([5500, 6800, 7800]);
    if (seed.name === 'PlayStation 4 Pro')
      return exactRange([8500, 9800, 11500]);
    if (seed.name === 'PlayStation 5 Disc Fat')
      return exactRange([21000, 23500, 25500]);
    if (seed.name === 'Xbox Series S' && storage === 512)
      return exactRange([10500, 12000, 13500]);
    if (seed.name === 'Nintendo Switch OLED')
      return exactRange([10500, 12200, 14000]);
    if (seed.name === 'Valve Steam Deck LCD' && storage >= 256)
      return exactRange([14500, 16500, 18500]);
    if (seed.name === 'ASUS ROG Ally Z1 Extreme')
      return exactRange([19500, 22000, 24500]);
  }
  return standardRange(fair + (variant.extraTL ?? 0));
}

const BOARD_FAIR_2026: Readonly<Record<string, number>> = {
  'MSI B450 TOMAHAWK MAX': 2400,
  'ASUS TUF B450-PLUS GAMING': 2300,
  'Gigabyte B450 AORUS ELITE': 2200,
  'ASRock B450M Pro4': 1900,
  'MSI MPG X570 GAMING PLUS': 5100,
  'ASUS TUF GAMING X570-PLUS': 5400,
  'Gigabyte X570 AORUS ELITE': 5300,
  'MSI PRO X670-P WIFI': 9500,
  'ASUS PRIME X670-P': 9000,
  'Gigabyte X670 AORUS ELITE AX': 10500,
  'MSI PRO B660M-A DDR4': 3700,
  'ASUS PRIME B660-PLUS D4': 3500,
  'Gigabyte B660M DS3H DDR4': 3000,
  'MSI PRO B760M-A WIFI DDR4': 4600,
  'ASUS TUF GAMING B760-PLUS WIFI': 6200,
  'Gigabyte B760 GAMING X': 5600,
  'MSI PRO Z690-A DDR4': 5800,
  'ASUS PRIME Z690-P': 6700,
  'Gigabyte Z690 UD DDR4': 5200,
  'MSI PRO Z790-A WIFI': 8500,
  'ASUS PRIME Z790-P': 8000,
  'Gigabyte Z790 AORUS ELITE AX': 10500,
};
const MONITOR_FAIR_2026: Readonly<Record<string, number>> = {
  'AOC 24G2U/BK': 3600,
  'ASUS VG249Q': 3900,
  'MSI Optix G241': 3500,
  'BenQ ZOWIE XL2411P': 3900,
  'LG 24GN600-B': 3700,
  'ASUS VG259QM': 5500,
  'BenQ ZOWIE XL2546K': 8500,
  'Dell S2522HG': 5600,
  'LG 27GL850-B': 6500,
  'ASUS VG27AQ': 7000,
  'Gigabyte M27Q': 7800,
  'MSI G274QPF-QD': 8500,
  'Samsung Odyssey G7 C27G75T': 10000,
  'Gigabyte M27Q X': 11000,
  'LG 27GR83Q-B': 11500,
  'LG 27GP950-B': 15500,
  'Gigabyte M28U': 14500,
  'ASUS VG28UQL1A': 16000,
  'Samsung Odyssey Neo G8 S32BG85': 24500,
};
function calibratedRam(seed: Seed, variant: Variant): PriceRange {
  const match = variant.key.match(/^(\d+)gb-\d+x\d+-(\d+)$/);
  if (!match)
    throw new Error(`Bilinmeyen RAM fiyat yapılandırması: ${variant.key}`);
  const total = Number(match[1]),
    speed = Number(match[2]);
  if (seed.name.includes('DDR4')) {
    if (total === 16) return exactRange([1000, 1250, 1500]);
    return standardRange(
      (total === 8 ? 650 : 2400) * (1 + (speed - 2666) / 20000),
    );
  }
  if (total === 32 && speed === 6000) return exactRange([3500, 4000, 4600]);
  const base = total === 16 ? 1700 : total === 32 ? 3400 : 6500;
  return standardRange(
    base +
      ((speed - 4800) / 400) * (total === 16 ? 150 : total === 32 ? 225 : 450),
  );
}
function calibratedPrices(seed: Seed, variant: Variant): PriceRange {
  switch (seed.category) {
    case 'phone':
      return calibratedPhone(seed, variant);
    case 'gpu':
      return calibratedGpu(seed, variant);
    case 'cpu':
      return calibratedCpu(seed, variant);
    case 'laptop':
      return calibratedLaptop(seed, variant);
    case 'console':
    case 'handheld':
      return calibratedGaming(seed, variant);
    case 'ram':
      return calibratedRam(seed, variant);
    case 'motherboard':
      if (/B550/.test(seed.name)) return exactRange([3000, 3600, 4200]);
      if (/B650/.test(seed.name)) return exactRange([6000, 7000, 8000]);
      return standardRange(requiredFair(BOARD_FAIR_2026, seed.name));
    case 'monitor':
      if (variant.label.includes('1440p') && variant.label.includes('165Hz'))
        return exactRange([6800, 7800, 9000]);
      return standardRange(requiredFair(MONITOR_FAIR_2026, seed.name));
  }
}

// Deliberately after alternative generation: preserve every existing alternative
// object (including its original priceDiffNote) per the non-price-data constraint.
// No ID, name, issue, checklist, suggestion, array order, or lookup is changed.
for (const product of PRODUCTS_DATABASE) {
  const input = PRICING_INPUTS.get(product.id);
  if (!input) throw new Error(`Eksik fiyat girdisi: ${product.id}`);
  const range = calibratedPrices(input.seed, input.variant);
  if (
    !Object.values(range).every(Number.isFinite) ||
    !(
      0 < range.marketPriceMin &&
      range.marketPriceMin < range.fairPrice &&
      range.fairPrice < range.marketPriceMax
    )
  ) {
    throw new Error(`Geçersiz fiyat aralığı: ${product.id}`);
  }
  Object.assign(product, range);
}
PRICING_INPUTS.clear();

interface SearchEntry {
  product: Product;
  text: string;
}
const SEARCH_ENTRIES: SearchEntry[] = PRODUCTS_DATABASE.map((product) => ({
  product,
  text: normalize(
    `${product.name} ${product.brand} ${product.id} ${LABELS[product.category]}`,
  ),
}));
const SEARCH_BY_CATEGORY = new Map<string, SearchEntry[]>();
for (const entry of SEARCH_ENTRIES) {
  const bucket = SEARCH_BY_CATEGORY.get(entry.product.category);
  if (bucket) bucket.push(entry);
  else SEARCH_BY_CATEGORY.set(entry.product.category, [entry]);
}
/** O(1) ID lookup. Unknown IDs return undefined. */
export function getProductById(id: string): Product | undefined {
  return PRODUCTS_BY_ID.get(id);
}
/**
 * Literal substring lookup over cached, Turkish-aware case/diacritic-normalized
 * names, brands, IDs and category labels. Empty query lists a category. Default:
 * 50 results, stable catalog order; omitted category / 'all' searches all entries.
 * Unknown category or non-finite / non-positive limit returns []; fractions floor.
 * Returned Product objects are the same instances as PRODUCTS_DATABASE.
 */
export function searchProducts(
  query: string,
  category?: string,
  limit = 50,
): Product[] {
  if (!Number.isFinite(limit) || limit <= 0) return [];
  const maximum = Math.min(Math.floor(limit), PRODUCTS_DATABASE.length);
  if (maximum === 0) return [];
  const entries =
    category && category !== 'all'
      ? SEARCH_BY_CATEGORY.get(category)
      : SEARCH_ENTRIES;
  if (!entries) return [];
  const needle = normalize(query),
    results: Product[] = [];
  for (const entry of entries) {
    if (entry.text.includes(needle)) results.push(entry.product);
    if (results.length === maximum) break;
  }
  return results;
}
