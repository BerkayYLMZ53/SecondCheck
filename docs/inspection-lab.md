# Canlı laboratuvar, pazarlık ve PDF raporu

`ListingAnalysisCard` cihaz analizi başına kendi laboratuvar sonuçlarını ve fiziksel kontrol beyanlarını tutar. Yeni cihaz/ilan geldiğinde önceki kontroller aktarılmaz. Sonuçlar yalnızca bu oturumda tutulur; kalıcı kayıt veya çevrimiçi doğrulama servisi eklenmemiştir.

## Canlı donanım laboratuvarı

`DiagnosticsLabModal` tam ekran bir React Native modalıdır. PWA'da uygulamanın görüntü alanını kaplar; tarayıcının adres çubuğunu veya işletim sistemi arayüzünü yönetmez.

- Ekran: `#000000`, `#ffffff`, `#ef4444`, `#10b981`, `#3b82f6` sırası. Dokunmak ilerletir. Basılı tutmak bilgi katmanını gizler/gösterir. Beş renk görüntülenmeden sağlam onayı açılamaz. Kusur tespiti görsel kullanıcı gözlemidir.
- Dokunmatik: 6 × 10 hücre; hızlı çizimlerde ara hücreler interpolasyonla bulunur. `touch-action: none` sayfanın sürüklenmesini engeller. Sayısal kapsam test alanıyla sınırlıdır; işletim sistemi çubuklarını test etmez. 60/60 olmadan sağlam kaydedilemez. Eksik hücre otomatik arıza sayılmaz; tekrar deneyip kullanıcı arıza bildirebilir.
- Ses: 200 Hz, kısa ara, 2000 Hz. Web Audio API; native'de aynı frekanslarda yerel düşük genlikli WAV ve expo-audio. Mikrofon izni istemez. Ses başladı diye sağlam sayılmaz; tamamlanınca kullanıcı temiz/cızırtılı olarak kaydeder. Tarayıcı hoparlör/ahizeyi ayrı yönlendiremez; kullanılan çıkış raporda belirtilir. Kulaklık/Bluetooth'u kullanıcı kapatmalıdır.
- Titreşim: web Vibration API, native Expo Haptics. Destek yoksa `unsupported`; komutun kabul edilmesi motorun çalıştığını kanıtlamaz. Kullanıcı gözlemi gerekir.

Modal kapatıldığında, test modundan çıkıldığında, sayfa arka plana geçtiğinde veya bileşen kaldırıldığında ses/titreşim işlemleri durdurulur. Testi yeniden başlatmak o testin önceki sonucunu bekliyor durumuna getirir.

Aktarım düğmesi `pass`, `fail`, `unsupported`, `pending` sonuçlarını ana kartın laboratuvar kontrol listesine tek seferde aktarır. Katalogdaki birden çok parçayı kapsayan bir kontrol, yalnızca ekran testi çalıştı diye otomatik işaretlenmez. Face ID, True Tone, kamera ve sıvı teması ayrıca fiziksel olarak onaylanır.

## Pazarlık

### Pil sağlığı ve adil alım fiyatı

`utils/batteryEstimator.ts`, model nesnesi veya tam model adı ve 0-100 pil yüzdesini
alır. Sonuç ekranında **Genel Bakış > Pil Sağlığı & Değişim Maliyeti** alanından
yüzde girilir. Değişiklik güven skoruna, pazarlığa ve yeni raporlara birlikte yansır;
mevcut test işaretleri korunur. Geçersiz yüzdeyle PDF/metin/paylaşım raporu oluşturulamaz.
Boş alan bilinmeyen pil demektir; otomatik kesinti yapılmaz.

| Pil yüzdesi | Kondisyon | Kesinti |
| --- | --- | --- |
| 85-100 | İdeal / Değişim İhtiyacı Yok | 0 TL |
| 80-84 | Orta / Tahmini 4-7 Ay İçinde Değişim Gerekebilir | Model batarya bütçesi |
| 0-79 | Kritik / Servis Uyarısı - Acil Değişim Tavsiye Edilir | Model batarya bütçesi |

Model bütçesi Apple'da 2.200-4.800 TL, Samsung'da 1.500-3.200 TL içinde kalır.
Apple: `2200 + max(0, yıl-2014)*125 + Pro*450 + Max/Plus*250`.
Samsung: `1500 + max(0, yıl-2019)*200 + Ultra/Fold*700 + Plus*200`.
Sonuç en yakın 100 TL'ye yuvarlanır ve marka aralığına sınırlanır. Bunlar talebe
dayalı tahmin varsayımlarıdır; güncel orijinal parça/yetkili servis tarifesi
doğrulaması değildir. 4-7 ay ölçülmüş kalan ömür değildir. Bilinmeyen/konsept cihaz
ve diğer markalar için ücret üretilmez.

`utils/deviceValuation.ts` tek kesinti defterini oluşturur. **Adil alım fiyatı =
ham katalog piyasa referansı - kusur ve batarya kesintileri**; alt sınır 0 TL'dir.
İlan fiyatı bulunmasa da katalog referansıyla hesaplanır. İlan fiyatından oluşturulan
karşı teklif ayrıca etiketlenir; iki farklı başlangıç tutarı birbirine karıştırılmaz.

`calculateBargain` saf hesaplama fonksiyonudur:

| Durum | İndirim |
| --- | ---: |
| Girilen/beyan edilen pil sağlığı < %85 | Model bazlı batarya bütçesi |
| Kutu ve faturanın ikisi de yok | 1.000 TL |
| Ekran değişmiş veya True Tone sorunu | 4.000 TL |
| Kozmetik çizik / ezilme | 1.500 TL |

Ekran ve True Tone aynı risk grubudur; indirim iki kez uygulanmaz. Batarya da aynı
kesinti defterinden bir kez düşülür. Kutu/fatura hakkında bilgi yokluğu eksiklik
sayılmaz. Kullanıcı beyanları düzeltebilir. Tutarlar tahmin/sabit pazarlık varsayımlarıdır;
güncel resmi servis ücretleri değildir. Teklif sıfırın altına inmez. İlan fiyatı yoksa
ilan bazlı karşı teklif ve satıcı mesajı üretilmez; katalog bazlı adil fiyat görünür.
Mesaj yalnızca panoya kopyalanır, satıcıya gönderilmez.

## Güven skoru ve raporlar

Temel skor kuralları `saas-ux.md` içindedir. Yeni testlerde bildirilen sorunlar ek puan düşürür: ekran −15, dokunmatik −20, ses −10, titreşim −5; True Tone/biyometri/kamera −10, sıvı teması −20, kozmetik −5. İlanda belirtilmeyen, sonradan doğrulanan ekran değişimi −10. İlanda zaten ekran değişimi cezası varsa tekrar eklenmez. Kutu ve faturanın olmadığı doğrulandığında +5 belge bonusu verilmez. Kaydedilmiş sorun varsa A+ verilmez. `pending` ve `unsupported` sağlam anlamına gelmez ve ek olumlu puan getirmez.

Ana kart, metin raporu, PNG paylaşım kartı ve PDF aynı laboratuvar/fiziksel kontrol girdileriyle aynı skoru hesaplar. Laboratuvarda hiç ölçülmeyen bileşenlerin durumu raporda ayrıca görünür.

`ExportReportButton` renk ve yalnızca IMEI son 4 hanesini alır. Tam IMEI alınmaz; dört hane olmayan giriş rapora yazılmaz. `buildPdfReport` HTML'i kaçışlayarak A4 rapor üretir. Türkçe metin, tekrarlanan tablo başlıkları, satır bölünmesini önleyen kurallar ve yazdırmada gizlenen kontroller bulunur. Uzun raporlar birden fazla A4 sayfasına akabilir.

Ortak giriş `services/pdfService.ts` dosyasıdır. **Ekspertiz Raporunu İndir / Paylaş
(PDF)** düğmesi, mevcut platforma göre aşağıdaki yolu kullanır. Raporda istenen
SECONDCHECK başlığı, marka/model/depolama, İstanbul tarih/saat bilgisi, rastgele
rapor kodu, pil durum/bütçe kartı, yeşil/kırmızı/bekleyen donanım sonuçları, ham
piyasa değeri, kesinti dökümü ve büyük nihai adil teklif alanı bulunur. Eksik
kontroller sağlam gösterilmez. Alt bilgi SecondCheck AI Değerleme Motoru ibaresini
taşır; raporun kullanıcı kontrolü ve tahminlerden oluştuğu ayrıca açıklanır.

- Web: kullanıcı tıklamasıyla yerel bir rapor penceresi açılır. **Yazdır / PDF olarak kaydet** düğmesi `window.print()` açar; kullanıcı PDF hedefini seçer. Tarayıcı dosyayı sessizce kaydetmez. Açılır pencere engellenirse hata ana kartta gösterilir.
- iOS/Android: `expo-print` gerçek PDF dosyası üretir, `expo-sharing` kaydet/paylaş ekranını açar; paylaşım yoksa sistem yazdırma kullanılır. Geçici dosya işlem sonunda temizlenir.
- Kimlik: kriptografik UUID + yıl; örn. `SC-2026-…`. Bu bir yerel rapor kimliğidir; dijital imza veya sunucu üzerinden sorgulanabilen doğrulama kodu değildir. Damga da kullanıcı kontrol kaydını belirtir.

## Doğrulama

`npm run test:inspection` hesaplama eşikleri, çifte indirim, desteklenmeyen testler, ses yaşam döngüsü, sonuçların raporlar arasında tutarlılığı, HTML kaçışları, IMEI gizliliği, popup engeli ve native dosya temizliğini sınar. Fiziksel ahize/hoparlör/haptik motorunun çalışması ve işletim sistemi PDF kaydetme ekranları gerçek cihaz testi gerektirir.

Başvuru: [Expo Print](https://docs.expo.dev/versions/latest/sdk/print/), [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/), [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate), [Audio output selection](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/setSinkId).
