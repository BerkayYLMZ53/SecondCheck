# Akıllı cihaz kataloğu

Uygulamanın ortak giriş noktası **`data/devices.ts`** dosyasıdır (projenin
TypeScript yapısına uygun `.ts` uzantısıyla). Ana ekran, karşılaştırma/teşhis
ürün seçicisi, ilan ayrıştırıcıları ve kayıtlı ilanlar bu kaynağı kullanır.
`data/devicesCatalog.json` model/depolama/renk verisini, `data/mockProducts.ts`
eski ürün kimlikleri ve donanım değerleme verisini sağlar; ekranlar bu iç
kaynakları doğrudan okumaz. Ağ isteği, ek paket veya tarih bağımlılığı yoktur.

## Kapsam ve kimlik

113 kayıt: Apple 45, Samsung 34, Redmi 17, Xiaomi 17. Talep edilen iPhone 6–17,
SE 1/2/3, S20–S24, Flip/Fold 3–6, A52–A55, Redmi Note 10–13 ve Xiaomi 12–14
aileleri yer alır. Ek olarak iPhone 16e, 17e, Air, A52s ve Xiaomi Lite/T/Ultra
sürümleri bulunur. S22 FE, Redmi Note 10 Pro+ ve iPhone 17 Plus adıyla ürün
üretilmez; aile adından bu tür modeller türetilmemiştir.

ID modele aittir; depolama veya renk değiştirmek yeni ID oluşturmaz. Örnek:
`apple-iphone-13-pro-max`, `apple-iphone-se-2`, `samsung-galaxy-s24-plus`,
`redmi-note-13-pro-plus-5g`. 4G/5G donanımı farklı olan Redmi Note ve A52/FE
sürümleri ayrı kayıtlardır. Samsung düz S20 kaydı temel 4G sürümünü temsil eder;
S20 Plus/Ultra ve diğer bölgesel SKU'larda seçenekler ülkeye göre değişebilir.

`releaseYear`, Türkiye satış tarihi değil, herhangi bir pazardaki ilk ticari
çıkış yılıdır. Varyasyon listeleri yaygın üretici seçenekleridir; bütün renk ve
depolamaların çapraz kombinasyonlarının ya da Türkiye stoğunun garantisi değildir.
Özellikle ithal cihazlarda model kodu, ROM, bantlar ve kapasite doğrulanmalıdır.
Xiaomi 13/14 Ultra kayıtlarında doğrulanan global seçenekler kullanılır; Xiaomi
14 Pro Çin pazarı kaydıdır. Bölgesel/özel üretim renklerin tam envanteri hedeflenmez.

## Fiyat ve sorun verisinin anlamı

Hazırlanma tarihi: **2026-11-03**. Fiyatlar çalışan, yerel şebekede kullanılabilir,
olağan ikinci el durumundaki telefonlar için elle belirlenmiş **başlangıç
tahminleridir**. Canlı ilan taraması, gerçekleşmiş satış medyanı veya uzman fiyat
teklifi değildir. `avgTry` istatistiksel örneklem ortalaması değil modelin referans
değeridir. Alt/üst bantlar bu referansın yaklaşık %75/%130'u olup 250 TL'ye
yuvarlanmıştır. Depolama, renk, onarım, garanti ve kayıt durumu için otomatik fiyat
düzeltmesi yapılmaz. Piyasaya dönük değerleme öncesi güncel ilanlarla kalibrasyon
gerekir. Ortak kaynak, eski ürünlerin fiyatlarını korur; eksik model/depolama
ürünlerinde buradaki model referans bandını kullanır. Bu yeni kayıtlarda kapasite
veya renk için doğrulanmamış fiyat farkı üretilmez.

`chronicIssues` içindeki **servis programı** kayıtları üretici tarafından belirtilen
sorunlardır. Diğer maddeler açıkça ikinci el **kontrol riski** olarak etiketlenir;
her cihazın arızalı olduğu veya arızanın model genelinde yaygın olduğu iddia edilmez.
Üretici servis programının tarihsel olarak bulunması bugün ücretsiz onarım hakkı
sağlamaz; seri numarası, ülke, süre ve mevcut koşullar üreticiyle doğrulanmalıdır.
`criticalChecks`, mevcut donanıma uygun satın alma kontrolleridir; True Tone tek
başına parça orijinalliğini kanıtlamaz. Katlanabilirlerde normal kat izi arıza
olarak işaretlenmez; koruyucu film sökülmez, cihaz bükülmez veya suya daldırılmaz.

Talebe uygun **planlama/konsept kaydı** `apple-iphone-18-pro-max` ID'sinde korunur.
Bu, modelin güncel ticari durumuna ilişkin bir beyan değildir. Şemaya uyarak
`releaseYear: 0`, boş `storage`/`colors` ve sıfır fiyat üçlüsü **veri yok** anlamına
gelir; ücretsiz cihaz veya doğrulanmış tahmini özellikler anlamına gelmez. Model
adında da konsept ibaresi bulunur. `BROWSABLE_PRODUCTS` ve ekran aramaları bu kaydı
bilgi olarak içerir; seçimi devre dışıdır. Değerleme için kullanılan
`PRODUCTS_DATABASE`, `searchProducts` ve `getProductById` bu kaydı içermez.

## Kullanım

```ts
import {
  getAllDevices,
  getDeviceById,
  searchDevices,
  filterByBrand,
} from '../data/devices';

const devices = getAllDevices();
const selected = getDeviceById('apple-iphone-13-pro-max'); // DeviceItem | undefined
const results = searchDevices('APPLE İPHONE13 pro');
const plusResults = searchDevices('Redmi Note 13 Pro+');
const samsung = filterByBrand(' samsung ');
```

Arama marka ve modelde sözcük bazında, sözcük sırasından bağımsız çalışır; büyük
harf, Türkçe I/İ/ı, fazla boşluk, bitişik `iPhone13` ve `+`/`Plus` desteklenir.
Boş sorgu bütün kayıtları; yalnızca noktalama içeren sorgu boş listeyi döndürür.
Bilinmeyen ID `undefined`; bilinmeyen veya boş marka `[]` döndürür. Marka
filtrelemesi tam eşleşmedir, `sam` Samsung ile eşleşmez. Fonksiyonlar her çağrıda
bağımsız dizi ve iç nesneler döndürür; sonuç üzerinde değişiklik ana veriyi bozmaz.

`data/devices.ts`, model kayıtlarından eksik depolama varyantlarını `Product`
biçimine dönüştürür. Eski 1.594 kayda 120 fiyatlı varyant ve bir konsept görünümü
eklenir: 1.714 değerlenebilir ürün, 1.715 aranabilir kayıt. Model sayısı hâlâ
113'tür. Eski kayıtlı ilan kimlikleri korunur; Redmi marka etiketi düzeltilir.
Ana ekran ve tüm ürün seçicilerinde `searchCatalogProducts(query, category, brand)`
kullanılır. Türkçe karakterler, bitişik model adları, `+`/`Plus`, depolama ve
birlikte uygulanan marka/kategori filtreleri desteklenir. Sayfalama filtrelerden
sonra uygulanır; ilk 20 kayıt katalog sınırı değildir.

Katalog AsyncStorage, SQLite veya Supabase üzerinden seed edilmez. AsyncStorage
sadece kayıtlı ilanları saklar; yeni cihazlar uygulama paketiyle gelir ve önbellek
temizleme gerektirmez. Veri güncellemesinde ID'leri sabit tutun ve
`npm run test:catalog` çalıştırın. Bu komut model şeması yanında gerçek UI aramasını,
tüm depolamaların erişilebilirliğini ve yeni cihazların ilan/kayıt akışını da sınar.

## Kaynaklar ve doğrulama

Model/varyasyon kontrolü ve test maddeleri için başvurulan üretici kaynakları:

- [Apple model kimlikleri, yıllar, depolama ve renkler](https://support.apple.com/en-ie/108044)
- [iPhone 6 Plus Multi-Touch programı](https://support.apple.com/iphone6plus-multitouch)
- [iPhone 12 / 12 Pro ahize sorunu](https://support.apple.com/en-gb/iphone-12-and-iphone-12-pro-service-program-for-no-sound-issues)
- [iPhone 14 Plus arka kamera sorunu](https://support.apple.com/iphone-14-plus-service-program-for-rear-camera-issue)
- [Samsung S23 / S23 FE / S21 FE karşılaştırması](https://www.samsung.com/uk/support/mobile-devices/comparison-between-the-galaxy-s23fe-s23-and-s21fe/)
- [Samsung telefon karşılaştırma kataloğu](https://www.samsung.com/uk/smartphones/compare/)
- [Samsung Fold6 / Flip6 teknik duyurusu](https://www.samsungmobilepress.com/articles/samsung-galaxy-z-fold6-and-z-flip6-elevate-galaxy-ai-to-new-heights)
- [Samsung katlanabilir ekran/film bakımı](https://www.samsung.com/sg/support/mobile-devices/what-is-the-foldable-display-and-protective-film-on-my-smartphone/)
- [Samsung Fold3 / Flip3 dayanıklılık bilgisi](https://www.samsung.com/in/support/mobile-devices/how-has-durability-improved-with-the-galaxy-z-fold3-or-galaxy-z-flip3/)
- [Redmi Note 10 Pro](https://www.mi.com/global/product/redmi-note-10-pro/specs/)
- [Redmi Note 11 Pro+ 5G](https://www.mi.com/global/product/redmi-note-11-pro-plus-5g/specs/)
- [Redmi Note 12 5G](https://www.mi.com/global/product/redmi-note-12-5g/specs/)
- [Redmi Note 12 Pro 4G](https://www.mi.com/global/product/redmi-note-12-pro/specs/)
- [Redmi Note 12 Pro+ 5G](https://www.mi.com/global/product/redmi-note-12-pro-plus-5g/specs/)
- [Redmi Note 13 Pro 4G](https://www.mi.com/global/product/redmi-note-13-pro/specs/)
- [Redmi Note 13 Pro 5G](https://www.mi.com/global/product/redmi-note-13-pro-5g/specs/)
- [Redmi Note 13 Pro+ 5G](https://www.mi.com/ae-en/product/redmi-note-13-pro-plus-5g/specs/)
- [Xiaomi 12](https://www.mi.com/my/product/xiaomi-12/specs/)
- [Xiaomi 13](https://www.mi.com/es/product/xiaomi-13/specs/)
- [Xiaomi 13 Ultra](https://www.mi.com/global/product/xiaomi-13-ultra/specs/)
- [Xiaomi 14](https://www.mi.com/global/product/xiaomi-14/specs/)
- [Xiaomi 14 Ultra](https://www.mi.com/global/product/xiaomi-14-ultra/specs/)
- [Xiaomi 14 Pro Çin mağazası](https://www.mi.com/shop/buy/detail?product_id=2230000468)
- [Xiaomi 14T](https://www.mi.com/global/product/xiaomi-14t/specs/)
- [Xiaomi 14T Pro](https://www.mi.com/global/product/xiaomi-14t-pro/specs/)
- [Samsung S24 FE bellek seçenekleri](https://shop.samsung.com.br/galaxy-s24-fe-512gb/p)

Bu kaynaklar fiyatları veya bütün modeller için kronik arıza yaygınlığını
doğrulamaz. Otomatik testler şemayı, kapsamı ve yardımcıların davranışını doğrular;
her cihazın her pazar varyasyonunun saha doğrulaması yerine geçmez.
