# Akıllı ilan ve metin ayrıştırma motoru

## Metin ayrıştırma

`utils/listingParser.ts` iki giriş noktası sunar:

```ts
import { parseListing, parseDeviceListing } from '../utils/listingParser';
import type { ParsedListingResult } from '../types/listing';

const result: ParsedListingResult = parseDeviceListing(
  'ip 13 pm 256GB 25.000 TL pil sağlığı %85 kutulu faturalı ekran değişti',
);
// matchedDevice.id: apple-iphone-13-pro-max
// detectedStorage: 256GB
// detectedPrice: 25000
// detectedBattery: 85
// flags: hasBox/hasInvoice/hasChanges true, hasWarranty false
// priceComparison.status: FIRSAT (35.000 TL katalog referansına göre)

// Eski ekran entegrasyonları için ek product/price/condition/findings/notes alanları:
const compatible = parseListing('RTX 3070 Ti 14.500 TL kutulu');
```

`parseDeviceListing` tam olarak `ParsedListingResult` döndürür. `parseListing`
aynı alanları, mevcut donanım kataloğu ve ekranların beklediği alanlarla birlikte
döndürür. Eski `Product` kimlikleri ve depolama/renk eşleşmeleri korunur. Yeni
telefon kataloğunda bulunan her cihazın eski değerleme kataloğunda karşılığı olması
gerekmez; `matchedDevice` dolu iken `product` boş olabilir. Böyle bir kayıt sırf
eski ekranı doldurmak için farklı bir modele dönüştürülmez.

Arama `devicesCatalog.json` kayıtlarından bir kez oluşturulan model indeksini
kullanır. Türkçe harfler, bitişik model adları, `ip 13 pm`, `iphone 13 pro max`,
`s24u`, `S23+`, `redmi note 13 pro+`, `A55`, `Fold4`, SE nesilleri ve birkaç yaygın
marka yazım hatası desteklenir. Bu, genel amaçlı bir dil modeli veya sınırsız
yazım hatası düzelticisi değildir. Birden fazla farklı model bulunursa veya
desteklenmeyen bir model eki varsa telefon eşleşmesi `null` kalır. Daha uzun
model adı kısa modele tercih edilir; Pro Max ilanı temel iPhone'a indirgenmez.

Depolama seçenekleri `64GB`, `128GB`, `256GB`, `512GB`, `1TB` gibi ortak biçime
getirilir. Açık birim içermeyen `128` gibi değerler de yakalanır. Çelişkili birden
fazla kapasite varsa tahmin yapılmaz. Kapasite belirtilmesi, o kapasitenin modelin
gerçek bir SKU'su olduğunu kanıtlamaz; `matchedDevice.variants.storage` ayrıca
kontrol edilmelidir.

Fiyatlar Türkçe binlik/ondalık ayırıcılarla ve TL/₺ ile veya tek başına sayı
olarak çözümlenir. Model numarası, kapasite, yıl, pil yüzdesi ve telefon numarası
fiyat olarak seçilmez. Birden fazla farklı fiyat varsa elle doğrulama gerekir;
`Fiyat:` gibi açık bir etiket diğer tutarlara göre önceliklidir.

`değişensiz` / `değişen yok` değişiklik sayılmaz; `pil değişti`, `ekran değişmiş`
ve `tamir gördü` sayılır. `kutu yok`, `faturasız` ve `garanti bitti` ilgili olumlu
bayrağı kapatır. Eksik bilgi `false` demektir; ilan iddialarının doğrulandığı
anlamına gelmez. `changeNotes` Türkçe karakterleri normalize edilmiş, tespit
edilen değişiklik ifadelerini içerir. Metin en fazla 12.000 karakter işlenir.

Karşılaştırma formülü `(ilanFiyatı - avgTry) / avgTry * 100` olup işaretlidir.
Referansın %85'i ve altı `FIRSAT`, %115'i ve üstü `PAHALI`, iki sınırın arasında
kalan aralık `NORMAL` olur. Adım 3'teki %15+ kuralı gereği tam −%15 `FIRSAT`,
tam +%15 `PAHALI` kabul edilir.
Fiyat/cihaz bulunmazsa veya kayıt konsept/sıfır referanslıysa karşılaştırma
üretilmez. Katalog fiyatları canlı piyasa ortalaması değildir; kaynak ve tahmin
varsayımları [katalog belgesindedir](devices-catalog.md).

## URL'den bilgi alma

### Sahibinden ve Dolap için yerel çözücü

`utils/marketplaceParser.ts`, bu iki platformun öncelikli yoludur. URL'nin gerçek
hostname'i doğrulanır; Sahibinden'de `/ilan/<slug>` (isteğe bağlı `/detay`),
Dolap'ta `/urun/<slug>` okunur. Sorgu/fragment veya benzer adlı başka domainler
platform kanıtı sayılmaz. URL-encoded Türkçe karakterler çözülür; sondaki uzun
ilan numaraları, `temiz`, `garantili`, `kutusunda`, `faturalı`, `acil`, `orijinal`,
`çiziksiz`, `cep telefonu` ve `az kullanılmış` gibi etiketler ayıklanır.

Apple/Samsung model indeksi `data/devices.ts` üzerinden oluşturulur. Sayısal model
kelimeleri 60, Pro/Max/Ultra gibi ekler 25, diğer model kelimeleri 15 puan alır.
Kelime sırası bağımsızdır; bütün gerekli model kelimeleri bulunmalı, ekler ve
nesil uyuşmalıdır. Aynı en yüksek puanı alan farklı modeller seçilmez. `score`,
kelime kapsama puanıdır; gerçek dünya doğruluk olasılığı değildir. GB/TB kapasite
normalize edilip tam modelin varyasyonuyla eşleştirilir; desteklenmeyen kapasite
yerine başka kapasite seçilmez. Konsept kayıtlar değerlemeyi açmaz.

`parseListingInput` bu platformlarda başarılı/başarısız sonucu daima yerel döndürür;
belirsiz veya ID tabanlı linklerde fetch/metadata yedeği kullanılmaz. Eksik URL
metniyle yüzde 100 model doğruluğu garanti edilemez; netleşmeyen durumlarda
`İlan modeli net anlaşılamadı, lütfen listeden manuel seçin` gösterilir.

Yapıştırma sonrası ek debounce veya 350 ms sunum beklemesi uygulanmaz. Net sonuç
yeşil `Sahibinden İlanı Algılandı: iPhone 13 Pro Max (128 GB)` / `Dolap İlanı
Algılandı: ...` rozetini gösterir, tam kapasiteye ait kartı seçer ve **Ekspertiz &
Piyasa Değerlemesine Geç** düğmesini etkinleştirir. Sonuç çekmecesi bu platformlarda
otomatik açılmaz; bu düğmeyle açılır. Hatalı/belirsiz/konsept sonuçlarda düğme kapalıdır.

### Diğer platformlar ve metadata yedeği

`utils/linkParser.ts`, `data/devices.ts` ortak kataloğunu kullanan yerel URL
motorudur. `parseProductUrl` HTTP/HTTPS veya `www.` bağlantılarını doğrular;
pathname'i çözer, tire/alt çizgi/ayraçları temizler, uzun ilan numaralarını
ayıklayıp model ve depolamayı eşleştirir. Sorgu parametreleri ve fragment model
kanıtı değildir; URL sayıları ilan fiyatı olarak kullanılmaz. Pro/Pro Max/Ultra
ayrımı, marka yazım varyasyonları ve kelime eşleştirmesi mevcut katalog motoruyla
yapılır. Kılıf/aksesuar ve birden fazla farklı model içeren bağlantılardan telefon
seçilmez. Modelde olmayan kapasite veya konsept cihaz farklı SKU'ya dönüştürülmez.

Sahibinden/Dolap dışındaki adreslerde `parseListingInput` önce bu yolu dener; model bulunursa ağ isteği olmadan
`source: 'slug'` döner. Kısa veya yalnızca ID içeren bağlantılarda aşağıdaki
sunucu endpoint'ini çağırır ve `source: 'metadata'` döner. Başlık, açıklamadaki
başka model adlarına göre önceliklidir. Başlık yoksa description metni de
kullanılabilir. Fiyat sadece ilan metni veya fiyat metadata'sından alınır.

İlan alanına yapıştırılan diğer platform bağlantıları 450 ms bekleme sonrası otomatik analiz edilir.
Ana katalog aramasına yapıştırılan URL de aynı alana aktarılır. Yükleme göstergesi,
tespit rozeti ve manuel seçim mesajı gösterilir; fiyatlı ve geçerli kapasiteyle
eşleşen telefon ana ekrandaki kartı seçer. Metin değişince eski istek iptal edilir;
gecikmiş sonuç yeni seçimi değiştiremez. Düz metin için Analiz Et düğmesi korunur.

Web aynı origin'deki `/api/parse-listing` adresini kullanır. Native iOS/Android
metadata yedeği için `.env` içinde `EXPO_PUBLIC_LISTING_API_URL` değerini dağıtılmış
HTTPS API'nin tam adresine ayarlayın; `.env.example` açıklama içerir. İstenirse
`ListingInputSection` bileşeninin `apiEndpoint` prop'u kullanılabilir. Yerel slug
analizi bu ayar ve internet olmadan çalışır. Expo'nun statik web export'u API'yi
çalıştırmaz; metadata yedeği Vercel/uygun API sunucusunda çalışır.

`api/parse-listing.ts`, [Vercel Node.js Web Standard işleyicisi](https://vercel.com/docs/functions/runtimes/node-js)
olarak çalışır. Ek `@vercel/node` paketi gerekmez.

```http
POST /api/parse-listing
Content-Type: application/json

{"url":"https://www.sahibinden.com/ilan/ornek-ilan"}
```

Başarılı yanıt:

```json
{
  "success": true,
  "title": "iPhone 13 Pro Max 256GB",
  "description": "Kutulu, faturalı, pil %85",
  "image": "https://example.com/image.jpg",
  "rawPrice": "25000.00"
}
```

`image` veya `rawPrice` yoksa `null` olur. Metaveri çıkarımı regex ile yapılır;
öznitelik sırası, tek/çift tırnak, tırnaksız değerler, büyük/küçük harf, HTML
entity'leri ve göreli görsel adresleri desteklenir. `og:price:amount` yanında
`product:price:amount`, eksik OG metninde standart title/description kullanılır.
JavaScript çalıştırılmaz; yalnızca istemcide üretilen ilanlar okunamayabilir.

GET isteği `Twitterbot/1.0` User-Agent'iyle sunucudan yapılır. Tarayıcının uzak
site CORS sınırı bu sunucu isteğine uygulanmaz; User-Agent değiştirmek sitenin
CAPTCHA, giriş gereksinimi veya erişim engelini aşmayı garanti etmez. Engellenen
isteklerde kullanıcı ilan metnini yapıştırarak devam eder.

Sunucu 8 saniyede zaman aşımına uğrar; en fazla 3 yönlendirme, 2 MiB açılmış HTML
ve 4 KiB istek gövdesi kabul eder. Açık proxy/özel ağ erişimini engellemek için
yalnızca `sahibinden.com`, `shbd.io`, `dolap.com`, `letgo.com`, `gardrops.com`,
`trendyol.com`, `ty.gl`, `hepsiburada.com`, `apple.com`, `easycep.com`,
`samsung.com` ve alt alanları kabul edilir; yönlendirmelerin her biri yeniden doğrulanır.
Yeni pazar yerleri `server/listingMetadata.ts` izin listesine eklenebilir.

Hatalar `{ "success": false, "code": "...", "error": "..." }` biçimindedir:

| Durum | HTTP |
| --- | --- |
| Geçersiz gövde/URL, desteklenmeyen site | 400 |
| POST dışındaki yöntem | 405 |
| Fazla büyük istek/sayfa | 413 |
| Metaveri yok veya erişim doğrulama sayfası | 422 |
| Uzak site, ağ veya yönlendirme hatası | 502 |
| Zaman aşımı | 504 |

## İstemci akışı ve yayın

```ts
import { parseListingInput } from '../utils/listingInput';

const { listing, title, metadata } = await parseListingInput(input);
// Metin yerel işlenir; tek bir HTTP/HTTPS URL'si API'ye gönderilir.
```

`parseListingInput` URL metaverisini metin ayrıştırıcısına bağlar. Geçerli OG
fiyatı metin fiyatına göre önceliklidir; `25000.00` değeri 2.500.000 TL olarak
yorumlanmaz. Türk pazar yeri fiyatlarının TL olduğu varsayılır; döviz dönüşümü
yapılmaz. İstemci isteği en fazla 12 saniye bekler. Hata durumunda Promise,
kullanıcıya gösterilebilecek bir mesajla reddedilir.

`ListingInputSection` ana sayfanın üstünde URL/metin kabul eder; ActivityIndicator,
yükleme, hata ve eşleşmeyen cihaz durumlarını gösterir. Yeni analiz veya metin
değişikliği önceki kontrol işaretlerini ve raporu temizler; bileşen kaldırılırsa
bekleyen URL isteği iptal edilir. `ListingParserCard` eski importlar için bu
bileşene yönlenen bir uyumluluk giriş noktasıdır.

`ListingAnalysisCard` cihaz/depolama/pil rozetlerini, ilan ve tahmini piyasa
fiyatını, yüzde/TL farkını, kutu/fatura/garanti/değişim beyanlarını, model risklerini
ve interaktif kritik kontrolleri gösterir. Değişim beyanı turuncu, fırsat yeşil,
piyasa üstü kırmızı, normal fiyat mavi renktedir. Bütün renkler ThemeContext'ten
gelir. Konsept veya eksik fiyat bilgisi için fırsat etiketi üretilmez.

Telefon analizi yeni katalog kartında kalır; farklı fiyat varsayımlarına sahip
eski varyant değerlemesine otomatik taşınmaz. Telefon dışı eşleşmeler mevcut
`Product` akışına aktarılır. Manuel ürün/donanım değerlemesi ayrı başlıkla korunur.

Ekspertiz Raporu Oluştur, `utils/listingAnalysisReport.ts` üzerinden o andaki
fiyatı, beyanları, model risklerini ve işaretli/bekleyen kontrolleri tek bir
seçilebilir metne dönüştürür. Rapor kopyalanabilir; panoya erişim başarısız olursa
elle seçilip kopyalanır. İşaretlenmeyen maddeler başarısız test sayılmaz; hiçbir
madde işaretlenmeden de durum özeti alınabilir. Kontrol listesi değişirse rapor
yeniden oluşturulmalıdır. Testler başka cihaz veya yeni analize taşınmaz.

Web varsayılan uç noktası `/api/parse-listing` olduğundan uygulama ve API aynı
Vercel yayınında çalışır. `vercel.json` SPA yönlendirmesi `/api` yollarını hariç
tutar. `expo start --web` tek başına Vercel işlevini sunmaz; URL akışı için Vercel
ortamı gerekir. Statik HTML dışa aktarımı API işlevini içermez.

Native uygulamada göreli URL yerine yayınlanan API'nin tam HTTPS adresi ikinci
parametre olarak verilmelidir. `ListingInputSection` için bu adres `apiEndpoint`
prop'u ile geçirilebilir. Farklı web alanından çağrı gerekiyorsa kendi yayın
alanına uygun CORS politikası ayrıca yapılandırılmalıdır; API genel bir CORS
proxy'si olarak açılmaz. Bu değişiklik yayınlama işlemi yapmaz.

## Kontroller

`npm run test:listing-parser`, mevcut donanım eşlemesini, 113 telefon modelini,
kısaltmaları, olumsuz ifadeleri, fiyat sınırlarını, URL-metaveri birleşimini ve
API hata/yönlendirme/boyut/zaman aşımı senaryolarını test eder. Ağ testleri
kontrollü yanıtlarla çalışır; herhangi bir pazar yerinin canlı erişimi veya
yayındaki Vercel işlevi için başarı garantisi vermez.

`npm run test:listing-analysis`, rapor içeriğini, testlerin ayrımını, rapor
snapshot'ını, İstanbul saatini, eksik/konsept bilgiyi ve güncel %15 sınırlarını
kontrol eder. Profil ekranı da ortak tema paletini ve kendi tema düğmesini kullanır;
profil bilgileriyle `assets/profile.png` korunur.
