# Holografik panel ve sıvı bölüm seçimi

## HolographicCard

Güven skoru paneli `HolographicCard` ile sarılır. Dokunma veya fareyle etkileşim sırasında 1000 px perspektif içinde en fazla 3° X ve 4° Y eğim uygulanır. Parmağı kaldırınca / fare ayrılınca nötr konuma yaylanır. Beyaz saydam bir degrade, 700 ms boyunca çapraz geçer; koyu temada cyan/zümrüt kenar ve hafif sabit ışıma görünür. Açık temada çizgi ve parlama daha düşük yoğunluktadır.

Kart hareketi dinlemek için touch/pointer olaylarını kullanır; responder veya PanResponder ile kaydırmayı ele geçirmez. Parlama katmanlarının pointerEvents değeri none olduğundan metin veya kontrollerin önüne geçmez. Kamera/saha gibi bir modal açıldığında, başka bölüme geçildiğinde veya ekspertiz çekmecesi kapandığında hareketler durur. Sistem azaltılmış hareket tercihi, eğim ve parlamayı kapatır.

## LiquidSegmentedControl

İlan kartı dört bölüm içerir: Genel Bakış, Kronik Sorunlar, Testler, Rapor. Aktif arka kapsül sabit genişlikte bir sütundan diğerine spring ile kayar. Yeni seçilen ikon kısa bir scale pop yapar; ilk yüklemede veya çekmeceyi yeniden açarken gereksiz ikon animasyonu başlatılmaz.

Bölüm panelleri display:none ile saklanır; analiz ve form state'i kaldırılmaz. Checkbox işaretleri, saha/laboratuvar kayıtları, fotoğraflar, pazarlık ve rapor bilgileri geçişlerden etkilenmez. Genel Bakış yalnızca skor/fiyat/beyanları; Testler donanım kontrollerini ve test araçlarını; Rapor dışa aktarma ve rapor formunu gösterir.

Web klavyesinde sağ/sol oklar, Home ve End desteklenir. Seçim tablist/tab rolleri ve aria-selected ile sunulur. Seçilmeyen paneller erişilebilirlik ağacından çıkarılır. iOS/Android'de platformun tab erişilebilirlik rolleri kullanılır.

## Performans yaklaşımı

- Eğim, parlama, aktif kapsül ve ikonlar yalnızca transform/opacity animasyonları kullanır. Native'de useNativeDriver açıktır; web'de Animated'in DOM güncellemeleri kullanılır.
- Pointer/touch örnekleri bir requestAnimationFrame içinde birleştirilir. Kare başına React setState çağrılmaz.
- Genişlik/yükseklik yalnızca onLayout ile güncellenir. SVG degradeler statiktir; animasyon sırasında yeniden üretilmez.
- Bulanıklık veya gölge animasyonu, sensör aboneliği ve sürekli animasyon döngüsü yoktur. Saklı panellerde hareket durur.
- 60 FPS tasarım hedefidir; kesin cihaz FPS değeri native cihaz profiliyle ölçülmelidir. Paket oluşturma veya TypeScript kontrolü FPS kanıtı sayılmaz.

Doğrulama: bölüm geçişlerinde checkbox ve rapor formunun korunması, web klavye seçimi, mobil yatay taşma, gerçek DOM 3D transform değişimi; mevcut işlevler için regresyon testleri ve web/iOS/Android paket oluşturma.
