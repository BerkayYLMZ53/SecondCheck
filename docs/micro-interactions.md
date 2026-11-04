# Mikro etkileşimler ve yükleme yüzeyleri

## Ortak dokunma yüzeyi

`components/AnimatedPressable.tsx`, uygulamadaki Pressable düğmelerinin ortak
yüzeyidir. Basılıyken spring animasyonuyla 0.96 ölçeğine iner, bırakılınca 1'e
döner. Ek dış sarmalayıcı eklemeden flex düzenini, ref'i, mevcut transformları,
basılı durum stillerini, erişilebilirlik ve klavye davranışını korur.
Devre dışı düğme animasyon/haptic üretmez. “Hareketi azalt” açıksa ölçek sabittir.
Tam ekran test yüzeyi ve modal arka planı `pressScale={1}` kullanır.

`haptic` prop'u geri bildirimi özelleştirir veya `false` ile kapatır. Varsayılan
düğme/seçim pill'i Light, checkbox/radio/switch Medium kullanır. Sıvı sekmelerde
Light, yalnızca değer değiştiğinde ve klavye seçiminde de çağrılır. Eski dock'un
ayrı 0.89 animasyonu kaldırılmıştır; çift ölçek uygulanmaz.

## Haptic servisi

`utils/haptics.ts`, mevcut `playHaptic` API'sini koruyarak şunları sunar:

| Yardımcı | Expo yöntemi | Kullanım |
| --- | --- | --- |
| `triggerLight()` | `impactAsync(Light)` | Sekmeler, pill'ler, liste kaydırma adımları |
| `triggerMedium()` | `impactAsync(Medium)` | Kusur seçimleri, analiz onayı |
| `triggerSuccess()` | `notificationAsync(Success)` | Geçerli link eşleşmesi, native PDF dosyasının üretilmesi |
| `triggerWarning()` | `notificationAsync(Warning)` | Kritik pil eşiğine geçiş, ağır kusur / başarısız test |
| `triggerSelection()` | `selectionAsync()` | Geçerli ve farklı pil yüzdesi adımları |

Haptic fonksiyonları UI akışını bekletmez. Desteklenmeyen web ortamı ve donanım
hataları sessizce geçilir. Sadece API çağrısı fiziksel motorun çalıştığını
kanıtlamaz; işletim sistemi tercihleri/cihaz desteği sonucu etkiler. Web'de rapor
penceresinin açılması gerçek PDF üretimi sayılmadığından burada PDF Success
tetiklenmez. Native'de PDF üretimi başarısızsa Success çağrılmaz.

## Glassmorphic skeleton

`components/SkeletonCard.jsx`, mevcut Expo Blur ve react-native-svg ile koyu
yarı saydam cam kart, yer tutucu bloklar ve beyaz/turkuaz gradient sweep üretir.
1.450 ms döngü yalnızca transform animasyonu kullanır; native'de native driver,
web'de Animated web sürücüsü çalışır. Animasyon interaction handle tutmaz.
Android'de BlurView'ın yarı saydam fallback'i pahalı blur gerektirmeden görünümü
korur. Açık tema renkleri de desteklenir.

Kullanım yerleri:

- Link/ilan analizi: `ListingSkeleton` ortak kartı kullanır; dönen spinner kaldırıldı.
- Katalog ve ürün seçici: `useDeferredValue` ile filtre hazırlanırken kompakt kart.
- Manuel değerleme: React transition beklerken kompakt kart.
- PDF oluşturma/paylaşma: gerçek async işlem sürerken kompakt kart.

Yerel ve hızlı işlemleri göstermek için ekstra gecikme eklenmez. Kart `active`
değilken, uygulama arka plandayken veya hareketi azalt açıkken sweep durur.
Unmount sırasında animasyon ve AppState aboneliği kapatılır. Yükleme erişilebilir
`progressbar`/busy durumu ile ifade edilir. `useReducedMotion` tüm düğmeler için
tek ortak işletim sistemi aboneliği kullanır.

## Kontroller

`npm run test:micro-interactions`: beş Expo haptic eşlemesi, eski API uyumluluğu,
desteklenmeyen ortamlar, native PDF Success bildirimi ve ortak reduced-motion
aboneliğinin yaşam döngüsü. Ayrıca TypeScript, JSX kontrolü, ESLint ve web export
uygulanır. Shimmer, sekme/klavye davranışı, arama/seçim ve sekmeler arası pil
değerinin korunması tarayıcıda kontrol edilmiştir. Ölçülmüş cihaz FPS veya fiziksel
iOS/Android titreşim testi iddia edilmez.
