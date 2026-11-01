# SecondCheck — İkinci El Donanım Değerleme ve Ekspertiz Platformu

Türkiye ikinci el elektronik pazarındaki (Sahibinden, Letgo vb.) donanımlar için adil piyasa değeri referansları, kronik sorun bilgileri ve yerinde donanım kontrol araçları sunan React Native / Expo tabanlı web ve mobil platformu.

**Expo SDK 58 · TypeScript · Web / Android / iOS · Açık / Koyu Tema**

> **Veri hakkında:** Mevcut sürüm, dokuz kategoride **1.594 ürün varyantı** içeren yerel ve deterministik bir örnek katalog kullanır. Fiyatlar canlı ilanlardan çekilmez; trend grafiği gerçek satış geçmişi yerine tekrarlanabilir bir simülasyon gösterir. Sahibinden veya Letgo ile resmî bir entegrasyon ya da ortaklık bulunmaz.

## 🚀 Öne Çıkan Özellikler

| Özellik | Açıklama |
| --- | --- |
| **1.000+ Ürünlük Katalog ve Değerleme Motoru** | GPU, CPU, telefon, laptop, konsol, el konsolu, RAM, anakart ve monitör kategorilerinde girilen fiyatı anında **Fırsat**, **Piyasa Değerinde** veya **Pahalı** olarak değerlendirir. |
| **6 Aylık Değer Değişim Trendi** | Cihazın adil değeri, yaşı ve kategorisine göre simüle edilen altı aylık fiyat değişimini; seçilebilir aylar, fiyat etiketleri ve dönem açıklamalarıyla gösterir. |
| **Donanım Kıyaslama — VS Modu** | İki cihazın piyasa aralıklarını, risk puanlarını, kronik sorunlarını ve kontrol gereksinimlerini karşılaştırır. Kayıtlı ilanlar seçildiğinde gerçek istenen fiyatlar ve kullanıcı notları da gösterilir. |
| **Kronik Sorunlar ve Kontrol Listesi** | Açılır sorun kartları, önem dereceleri, bakım/onarım notları ve ilerleme çubuklu fiziksel inceleme listesi sunar. |
| **Yerinde Test Kiti** | Beş renkli ölü piksel testi, 6×10 dokunmatik grid, hoparlör frekans taraması ve üç saniyelik mikrofon kaydı/geri dinleme araçlarını içerir. |
| **Akıllı İlan Metni Ayrıştırıcı** | Yapıştırılan başlık veya açıklamadan model, fiyat, kozmetik kusur, kutu/fatura bilgisi, pil sağlığı ve parça değişimi ifadelerini çıkarır. Eşleşen ürünü ve değerleme alanlarını doldurur. |
| **Kayıtlı İlanlar Sepeti** | İlan başlığı/notu, fiyatı, kondisyonu ve kayıt tarihini cihazda saklar. İlanı yeniden yükleme, kaldırma, listeyi temizleme ve aynı kategoriden iki ilanı kıyaslama desteği vardır. |
| **Ekspertiz Özeti ve Paylaşım** | İlan fiyatı, değerleme sonucu, tamamlanan kontroller ve risklerden bir özet rapor üretir; metin olarak kopyalanabilir. |
| **Param Güvende ve Kargo Dolandırıcılık Kalkanı** | Sahte bağlantı, ödeme, paket açılışı, kayıt/tutanak, seri numarası ve onay öncesi test konularını üç aşama ve altı etkileşimli güvenlik kuralıyla ele alır. |
| **Tema ve Responsive Arayüz** | Açık/koyu tema, merkezlenmiş içerik, dar ekranlarda uyarlanan kıyaslama düzeni, güvenli alanlar ve en az 44×44 px dokunma hedefleri sunar. |

## 🛠️ Teknoloji Yığını

Sürümler depodaki `package.json` tanımlarını yansıtır.

| Katman | Teknoloji |
| --- | --- |
| Framework | Expo `~58.0.22`, React Native `0.88.1`, React Native for Web `~0.21.4` |
| Arayüz | React `19.3.0`, TypeScript `~6.0.3`, React Native `StyleSheet` |
| Durum yönetimi | React Context API: tema ve kayıtlı ilanlar |
| Kalıcı kayıt | Web: `localStorage`; mobil: AsyncStorage |
| Grafik ve ikonlar | `react-native-svg`, `lucide-react-native` |
| Ses ve mikrofon | Web Audio API, MediaRecorder ve mobilde `expo-audio` |
| Diğer platform araçları | `expo-clipboard`, `expo-status-bar`, `react-native-safe-area-context` |
| Kod kalitesi | Strict TypeScript, ESLint ve Node.js test çalıştırıcısı |

## 💻 Yerel Geliştirme — Local Setup

### Gereksinimler

- **Node.js 24.x** kullanın; kurulu Expo sürümü 24.x dalında en az `24.3.0` gerektirir. Node.js 22.x kullanılıyorsa en az `22.13.0` gerekir.
- npm veya pnpm kurulu olmalıdır.
- Web için güncel bir tarayıcı yeterlidir. Mevcut özellikler için API anahtarı, `.env` dosyası veya ayrı bir backend gerekmez.
- Mobil geliştirme için uyumlu fiziksel cihaz veya emülatör gerekir. iOS Simulator, macOS ve Xcode gerektirir.

Proje dizininde aşağıdaki komutları çalıştırın:

```bash
# Bağımlılıkları yükleyin
npm install

# Web arayüzünü başlatın
npx expo start --web
```

Terminalde gösterilen yerel adresi tarayıcıda açın. `npm run web` aynı geliştirme sunucusunu başlatır.

### pnpm ile kilit dosyasına uygun kurulum

Depoda `pnpm-lock.yaml` bulunur. Kilitlenmiş bağımlılık sürümlerini korumak için ekip ve CI kurulumlarında pnpm kullanabilirsiniz:

```bash
pnpm install --frozen-lockfile
pnpm web
```

npm kurulumuna kalıcı olarak geçilecekse kilit dosyası stratejisini de buna göre güncelleyin; farklı paket yöneticilerinin kilit dosyalarını gelişigüzel birlikte yönetmeyin.

### Mobil geliştirme

```bash
# Expo geliştirme sunucusu
npm start

# Android hedefi
npm run android

# iOS hedefi
npm run ios
```

Bu komutlar geliştirme sunucusunu başlatır; mağazaya gönderilecek Android/iOS paketlerini üretmez. Mikrofon izni ve ses eklentisi `app.json` içinde tanımlıdır. Native eklenti veya izin yapılandırması değiştiğinde kullanılan geliştirme uygulamasının yeniden derlenmesi gerekebilir.

## 🎯 Temel Kullanım Akışı

1. **Ürünü bulun.** Marka/model araması veya kategori filtrelerini kullanın. Alternatif olarak ilan metnini üstteki karta yapıştırıp **Ayrıştır & Analiz Et** düğmesine dokunun.
2. **Fiyat ve kondisyonu doğrulayın.** İlan fiyatını girin; kutulu/faturalı, sadece cihaz veya kozmetik kusurlu durumlarından uygun olanı seçin.
3. **Analizi inceleyin.** Fiyat değerlendirmesi, simüle trend, kronik sorunlar ve alternatif modelleri birlikte değerlendirin.
4. **Yerinde kontrol yapın.** Kontrol listesini tamamlayın; test kitini ürünün kendisinde veya test edilecek ekran/ses donanımına bağlı cihazda çalıştırın.
5. **Kaydedin veya paylaşın.** İlanı bir notla listenize ekleyin ya da kontrol sonuçlarından metin raporu oluşturun.
6. **Kıyaslayın.** Kaydedilenler penceresinde aynı kategoriden iki ilan seçerek istenen fiyatları ve donanım bilgilerini karşılaştırın.

Kargo ile alımlarda, fiziksel kontrol listesinin üstündeki güvenlik rehberini de açabilirsiniz. Güvenlik kutularını işaretlemek platformda ödeme veya ürün onayı vermez.

### İlan metni örnekleri

```text
MSI RTX 3070 Ti 8GB fiyat: 14.500 TL kutu yok fatura var
iPhone 13 256GB 34.500₺ pil sağlığı %79 ekran değişmiş
m1 air 8GB 256GB 22000 kutu yok
Ryzen 5600 3.800 TL
```

Ayrıştırıcı yerel katalog üzerinde çalışır; ilan URL’sini ziyaret etmez. Eksik kapasite veya marka bilgileri nedeniyle en yakın varyant seçilebilir. Birden fazla farklı fiyat bulunduğunda tutarı tahmin etmek yerine manuel giriş ister. Pil ve parça değişimi uyarıları ayrıca gösterilir; bunlar otomatik bir onarım maliyetine dönüştürülmez.

## 📊 Değerleme ve Veri Modeli

Her ürün; benzersiz kimlik, kategori, marka/model, çıkış yılı, minimum/adil/maksimum piyasa referansları, kronik sorunlar, kontrol listesi ve alternatifler içerir.

| Kondisyon | Adil değer için kullanılan katsayı |
| --- | --- |
| Kutulu / Faturalı | `%100` |
| Sadece Cihaz | `%95` |
| Kozmetik Kusurlu | `%88` |

Değerlendirme, kondisyonla uyarlanmış adil değeri temel alır:

- **Fırsat:** Adil değerin `%8`den fazla altında.
- **Piyasa Değerinde:** Adil değerin `±%8` bandında.
- **Pahalı / Pazarlık Yapılmalı:** Adil değerin `%8`den fazla üzerinde.

Ana ekrandaki kronik sorun skoru `0–100`, VS modundaki donanım risk endeksi ise `0–10` aralığındadır. Bunlar farklı ölçeklerdeki tarama puanlarıdır; ölçülmüş arıza olasılığı veya performans testi sonucu değildir.

Katalog erişimi `data/mockProducts.ts` üzerinden sağlanır:

```typescript
import {
  PRODUCTS_DATABASE,
  getProductById,
  searchProducts,
} from './data/mockProducts';

const matches = searchProducts('RTX 3060', 'gpu', 20);
const product = matches[0] ? getProductById(matches[0].id) : undefined;
const totalVariants = PRODUCTS_DATABASE.length;
```

Ürün verileri genişletilirken `marketPriceMin < fairPrice < marketPriceMax` sıralaması korunmalıdır. Ürün kimlikleri kayıtlı ilanların `productId` alanında kullanıldığından, kimlik değişikliklerinin mevcut kayıtlara etkisi değerlendirilmelidir.

## 📁 Proje Yapısı

```text
SecondCheck/
├── App.tsx                         # Tema, kayıtlı ilanlar ve ekran geçişleri
├── index.ts                        # Expo giriş noktası
├── app.json                        # Uygulama, ses izinleri ve Android klavye ayarı
├── screens/
│   ├── HomeScreen.tsx              # Arama, değerleme ve ekspertiz akışı
│   └── CompareScreen.tsx           # Donanım / kayıtlı ilan kıyaslaması
├── components/
│   ├── ListingParserCard.tsx
│   ├── PriceTrendSection.tsx
│   ├── ChronicIssuesSection.tsx
│   ├── InspectionChecklist.tsx
│   ├── AlternativesSection.tsx
│   ├── HardwareDiagnosticsModal.tsx
│   ├── ExpertiseReportModal.tsx
│   ├── SavedListingsModal.tsx
│   ├── SecurityGuideModal.tsx
│   └── ...                         # Ortak stiller, seçiciler ve tema araçları
├── context/
│   ├── ThemeContext.tsx
│   └── SavedListingsContext.tsx
├── data/mockProducts.ts            # Üretilebilir örnek katalog
├── types/                          # Ürün ve kayıtlı ilan tipleri
├── utils/                          # Değerleme, ayrıştırma, trend ve platform yardımcıları
├── assets/diagnostic-sweep.wav      # Mobil ses taraması
├── styles/web.css                  # Web görünümü ve viewport desteği
├── tests/                          # Ayrıştırıcı ve kayıtlı ilan testleri
├── pnpm-lock.yaml
├── vercel.json                     # SPA yönlendirme kuralı
└── .gitignore
```

## ✅ Kod Kalitesi ve Testler

```bash
# Strict TypeScript kontrolü
npm run typecheck

# Sıfır uyarı politikasıyla lint
npm run lint

# İlan ayrıştırıcı testleri
npm run test:listing-parser

# Kayıtlı ilan veri modeli ve değerleme testleri
npm run test:saved-listings
```

Testler model eşleşmelerini, Türkçe fiyat biçimlerini, kusur ifadelerini, katalog başlıklarının doğru varyanta çözülmesini, kayıt doğrulamasını, benzersiz kimlikleri ve kondisyon katsayılarını kapsar. Test çalıştırıcısı, projede bulunan TypeScript paketini kullanır.

Arayüz değişikliklerinde 360 px telefon görünümünü, tablet/masaüstü düzenini, her iki temayı ve klavye açıkken form/modalleri ayrıca kontrol edin. Native ses, mikrofon, çentik ve klavye davranışı fiziksel cihazda da doğrulanmalıdır.

## 📦 Production Web Derlemesi

```bash
npm run build:web
```

Bu script `npx expo export --platform web` komutunu çalıştırır ve statik çıktıyı **`dist/`** dizinine üretir. Kaynak değişikliklerinden sonra yeniden derleme gerekir. Expo’nun dağıtım akışı için [resmî web yayınlama rehberine](https://docs.expo.dev/guides/publishing-websites/) bakabilirsiniz.

`dist/` Git’e eklenmez; yerel derlemede veya hosting platformunun build aşamasında üretilir. HTTPS ile yayınlamak, özellikle mikrofon ve pano API’lerinin kullanılabilirliği açısından önemlidir.

### Vercel

GitHub deposunu Vercel’e aktarın ve aşağıdaki ayarları uygulayın:

| Ayar | Değer |
| --- | --- |
| Framework Preset | `Other` — statik Expo çıktısı |
| Root Directory | Proje kökü |
| Build Command | `npm run build:web` |
| Output Directory | `dist` |
| Node.js Version | `24.x` |

Depoda bulunan `vercel.json`, istemci tarafı adresler için `/index.html` fallback kuralını içerir. Build ve output ayarları bu dosyada tanımlı olmadığından Vercel proje ayarlarında ayrıca belirtilmelidir. Platform [derleme ayarlarını](https://vercel.com/docs/builds) ve [Node.js sürüm seçimini](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) destekler.

### Netlify

Netlify üzerinde de build komutunu **`npm run build:web`**, publish dizinini **`dist`** olarak belirleyin. Bu depoda henüz `netlify.toml` bulunmaz; yapılandırmayı dosyada tutmak isterseniz proje köküne aşağıdaki örneği ekleyebilirsiniz:

```toml
[build]
  command = "npm run build:web"
  publish = "dist"

[build.environment]
  NODE_VERSION = "24"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Bu kural SPA adreslerini `index.html` üzerinden sunar. Ayrıntılar: [Netlify SPA rewrite rehberi](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/) ve [build bağımlılıkları / Node.js sürümü](https://docs.netlify.com/build/configure-builds/manage-dependencies/).

Her iki platformda da kurulum için tek bir paket yöneticisi seçin. Mevcut pnpm kilit dosyasını kullanıyorsanız kurulum komutu `pnpm install --frozen-lockfile` olabilir; npm akışı tercih ediliyorsa `npm install` kullanılır. Node.js ve paket yöneticisi sürümlerini yerel ortamla uyumlu tutun.

## 🔐 Yerel Kayıt, İzinler ve Gizlilik

- **Kayıtlı ilanlar:** Web’de bu siteye ait `localStorage` alanında, mobilde AsyncStorage içinde saklanır. Kullanıcı hesabı veya bulut senkronizasyonu bulunmaz.
- **Depolama hatası:** Kalıcı kayıt kullanılamazsa uygulama oturum içi bellekle çalışır ve kullanıcıya durumu bildirir. Bu kayıtlar yenileme veya uygulamanın kapanmasıyla kaybolabilir.
- **İlan ayrıştırma:** Yapıştırılan metin yerel olarak işlenir; bir ilan servisine veya yapay zekâ API’sine gönderilmez.
- **Mikrofon:** Test kullanıcı tarafından başlatılır ve izin ister. Kayıt sunucuya yüklenmez; web’de bellekte, mobilde yerel kayıt dosyası üzerinden işlenir.
- **Ses çıkışı:** Tarama cihazın seçili ses çıkışını kullanır. Ahizeye özel yönlendirme cihaz ve tarayıcıya bağlıdır.
- **Pano:** Rapor kopyalama işlemi kullanıcı eylemiyle başlar. Tarayıcı izin vermezse elle seçilip kopyalanabilecek metin gösterilir.

## 🧩 Sık Karşılaşılan Durumlar

| Durum | Kontrol edilecek nokta |
| --- | --- |
| Mikrofon testi başlamıyor | Mikrofon iznini, cihazın giriş kaynağını ve web’de HTTPS/localhost kullanımını kontrol edin. |
| Kopyalama çalışmıyor | Pano iznini kontrol edin veya rapordaki seçilebilir metni elle kopyalayın. |
| Yenilemede kayıtlar kayboluyor | Gizli oturum, engellenmiş depolama, dolu alan veya farklı site adresi kullanımı yerel kaydı etkileyebilir. Uygulamadaki depolama mesajını inceleyin. |
| İlan yanlış varyanta eşleşiyor | Marka, tam model ve kapasite bilgisini ekleyin; otomatik seçilen varyantı doğrulayın. |
| Yayında eski görünüm var | Web çıktısını yeniden üretin ve güncel `dist/` dizininin yayınlandığını kontrol edin. |
| Doğrudan adrese girişte 404 alınıyor | Hosting platformundaki SPA fallback kuralını ve çıktı dizinini kontrol edin. Ekran sekmeleri şu anda URL tabanlı yönlendirme yerine uygulama içi durumla yönetilir. |

## 🤝 Katkıda Bulunma

Değişiklik öncesinde mevcut davranışı inceleyin; küçük ve anlaşılır değişikliklerle ilerleyin. Yeni ürün eklerken kontrol adımlarını uygulanabilir tutun, kronik sorunları kesin arıza iddiası olarak sunmayın ve örnek fiyatların kaynak/tarih varsayımlarını belirtin.

Pull request öncesinde typecheck, lint, ilgili testler ve web derlemesini çalıştırın. Arayüz değişikliklerinde mobil ve masaüstü görünümünü her iki temada kontrol edin. `node_modules/`, `.expo/`, `dist/`, imzalama anahtarları ve sertifikalar gibi `.gitignore` kapsamındaki dosyaları depoya eklemeyin.

## ⚖️ Veri ve Kullanım Notu

Fiyatlar, kronik sorun kayıtları, risk puanları ve üretilen raporlar karar desteği sağlar; cihazın gerçek durumunu, satışın güvenliğini veya gelecekteki fiyatını garanti etmez. Onarım bedelleri servis ve parçaya göre değişebilir. Güvenlik rehberindeki süre ve koşullar için ilgili platformun güncel sipariş ekranı ve resmî kuralları esas alınmalıdır.

**Veriler topluluk bildirimleri ve pazar ortalamaları baz alınarak modellenmiştir. Kesin ekspertiz yerine geçmez.**

## 📄 Lisans

Bu depoda henüz bir `LICENSE` dosyası tanımlanmamıştır. Yeniden kullanım ve dağıtım koşulları için proje sahibinden bilgi alın. Bağımlılıkların lisansları kendi paketlerinde ayrıca yer alır.
