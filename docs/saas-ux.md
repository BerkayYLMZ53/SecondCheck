# Analiz deneyimi: güven skoru, test haritası ve paylaşım

## Bileşenler

- `TrustScoreGauge.tsx`: SVG halkası, spring animasyonu, A+/B/C durumu ve puan nedenleri.
- `DeviceTeardownView.tsx`: şematik telefon, dört dokunma noktası ve 30 saniyelik parça kontrolleri.
- `ListingSkeleton.tsx`: başlık, fiyat ve checklist yer tutucuları üzerinde dalga animasyonu.
- `ShareableReportModal.tsx`: 9:16 Story / 1:1 kare önizleme, PNG kaydetme ve paylaşma.
- `utils/haptics.ts`: desteklenen ortamda hafif dokunma, başarı ve uyarı geri bildirimi.

`ListingAnalysisCard` güven skorunu ilan bilgileri ve **mevcut** kontrol işaretleriyle
hesaplar. Aynı testler normal metin raporuna ve paylaşım kartına aktarılır.
`ListingInputSection` analiz sırasında dönen çark yerine iskelet gösterir; hazır
sonuç 280 ms içinde belirir. Çok hızlı yerel analizlerde titremeyi önlemek için
iskeletin en az 350 ms görünmesi sağlanır. Ağ isteği daha uzunsa ek bekleme eklenmez.

Teşhis sekmesi ve mevcut `InspectionChecklist` hafif haptik geri bildirimi kullanır.
Telefon seçildiğinde Teşhis'te de modele uygun donanım haritası açılır. Bilgisayar
parçalarına telefon şeması uygulanmaz.

## Puanın anlamı ve hesaplanması

Skor, ölçülmüş fiziksel kondisyon veya arıza olasılığı değildir. Kullanıcı
kontrolleri ve ilan bilgilerinin açıklanabilir bir ön değerlendirmesidir.
Kullanıcının onayladığı testler bir servis teknisyeni tarafından doğrulanmış
sayılmaz. Bütün ilan beyanları yerinde doğrulanmalıdır.

Başlangıç **70** puandır. Ayarlamalar:

| Bilgi | Puan |
| --- | ---: |
| Değişen ekran beyanı | −10 |
| Değişen pil beyanı | −8 |
| Anakart onarımı beyanı | −15 |
| Parçası belirtilmeyen değişim/onarım | −10 |
| Pil sağlığı belirtilmemiş / geçersiz | −5 |
| Pil sağlığı %80 altında | −5 |
| Pil sağlığı en az %90 | +2 |
| Hem kutu hem fatura beyanı | +5 |
| Garanti beyanı | +3 |
| İşaretli kritik kontrol oranı | 0…+20 |

Skor 0–100 arasında tutulur. **A+ için** bütün kritik kontrollerin tamamlanması,
bilinen pil sağlığının en az %80 olması ve değişim/onarım beyanı bulunmaması
gerekir. Bu koşullar yoksa skor en fazla 84 olur; sınırın etkisi de neden
etiketinde görünür. Eksik bilgi yanlış biçimde kusursuz kondisyon olarak sunulmaz.
Geçersiz kontrol indeksleri sayılmaz. Konsept/eşleşmeyen cihazda skor üretilmez.

85–100: `A+`, halka `#10b981`; 65–84: `B`, `#f59e0b`; 0–64: `C`, `#ef4444`.
İstenen kondisyon başlıkları bu sınıflara göre gösterilir ve altlarında skorun
kullanıcı beyanına dayalı olduğu açıklanır. Fiyat, fiziksel güven skorunu
değiştirmez; ucuz ilan otomatik güvenilir sayılmaz. Modelin kronik sorun listesi
de o cihazda doğrulanmış arıza kabul edilerek puan düşürmez.

## Donanım haritası

Harita gerçek parçaların söküm krokisi değildir. Ekran/biyometri, kamera,
batarya ve port/kasa için üçer adım, 0–10 / 10–20 / 20–30 saniye aralıklarıyla
gösterilir. Rehberler True Tone ve Face ID'yi yalnızca desteklenen Apple
modellerine önerir; Touch ID, Android parmak izi ve OIS'siz sürümler ayrılır.
OIS testi telefonu sallayarak yapılmaz; kasa açma, pili sıkıştırma veya suya
daldırma önerilmez. Konsept kayıtlarına gerçek parça haritası uygulanmaz.

## Paylaşım ve PNG

Paylaşım düğmesi geçerli cihazın tüm kritik kontrolleri işaretlendiğinde açılır.
O andaki sonuçlar bağımsız bir snapshot'a alınır. Story **1080×1920**, kare
**1080×1080** piksel üretilir. SVG kaynakları `utils/shareableReport.ts` içinde
oluşturulur; dış görsel/font/ağ isteği kullanılmaz, metinler XML için kaçışlanır.

Yeşil tikler sadece işaretli kontrolleri özetler. “Pil/parça geçmişi incelendi”
ifadesinden “Orijinal batarya” veya “Face ID denendi” ifadesinden “Face ID sağlam”
sonucu icat edilmez. `SecondCheck ile Doğrulandı` damgası **uygulamadaki kontrol
kaydını** belirtir; aynı görselde kullanıcı beyanı ve teknik garanti olmadığı
açıklanır. `secondcheck.gen.tr` referansı bulunur. Formatın alanına sığmayan
kontrollerin sayısı belirtilir; metin raporunda tam liste korunur.

Web'de SVG yerel canvas üzerinde PNG'ye çevrilir. Hazırlanan PNG'nin kendisi
önizlenir; kaydetme indirme başlatır. `navigator.share` ve dosya paylaşımı
destekleniyorsa hazır PNG `File` olarak kullanıcı tıklaması içinde paylaşılır.
Destek yoksa PNG kaydetme alternatifi gösterilir; iptal hata sayılmaz.

Native'de `react-native-svg` PNG üretir, `expo-file-system` önbelleğe yazar.
Galeriye kaydetme yalnızca kullanıcı düğmeye bastığında fotoğraf **ekleme** izni
ister; izin reddi açıklanır ve paylaşma alternatifi kalır. `expo-sharing` sistem
paylaşım menüsünü açar. Kullanılmayan önbellek görselleri temizlenir; web object
URL'leri bırakılır. Native paketler eklendiğinden development build yeniden
oluşturulmalıdır. Gerçek cihazda izin ve paylaşım deneyimi ayrıca denenmelidir.

## Hareket, haptik ve performans

Azaltılmış hareket tercihi halka, pulse, shimmer ve fade animasyonlarında
dikkate alınır. Sürekli pulse/shimmer sekme görünmez olduğunda durur. Tek pulse
değeri dört noktada paylaşılır; native dönüşüm/opacity animasyonları native driver
kullanır. Skor hesaplaması kontrol sayısıyla sınırlıdır; SVG/PNG hazırlığı yalnızca
paylaşım modalında ve format değişiminde yapılır. Desteksiz veya hata veren
haptikler sessizce atlanır; analiz ve checkbox işlemi bundan etkilenmez.

Checkbox işaretlemede `ImpactFeedbackStyle.Light`, 85+ sınıfına girişte başarı,
bilinen risk/onarım/düşük pil veya piyasa üstü fiyat durumuna girişte uyarı
verilir. Aynı sınıfın her render'ında titreşim tekrarlanmaz. İşletim sistemi
tercihleri, düşük güç modu veya donanım/browser desteği titreşimi engelleyebilir.

## Doğrulama ve kaynaklar

`npm run test:trust-share` puan sınırları/nedenleri, eksik bilgi, paylaşım
koşulları, snapshot, XML kaçışları, format boyutları, donanım rehberleri,
desteksiz haptik ve izin/paylaşım hata yollarını kontrol eder. Tarayıcıda
iskelet, puan değişimi, iki tema ve PNG'nin gerçek piksel boyutları ayrıca
incelenir. Native bundle kontrolü fiziksel cihaz titreşim/galeri testi değildir.

- [Expo Haptics](https://docs.expo.dev/versions/latest/sdk/haptics/)
- [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [Expo MediaLibrary](https://docs.expo.dev/versions/latest/sdk/media-library/)
- [Expo Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/)
