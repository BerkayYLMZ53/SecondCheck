# Alt çekmece ve dinamik durum hapı

`AnalysisPresentationProvider`, SafeAreaProvider altında uygulama içeriğini ve üst katmanlarını yönetir. Floating Tab Bar veya Home ScrollView yerleşimine boşluk eklenmez; çekmece ekranın üst katmanında açılır.

## İlan ekspertiz çekmecesi

`ListingInputSection` geçerli telefon analizi tamamlandığında `ListingAnalysisCard` içeriğini `SpringBottomSheet` içinde açar. Ana sayfada küçük bir sonuç özeti ve **Ekspertiz detaylarını aç** düğmesi kalır. Model eşleşmeyen sonuçlar ve eski ürün değerleme akışı ana sayfada gösterilmeye devam eder.

- Yaklaşık ekranın %88'i; üst güvenli alanı aşmayan yükseklik; geniş ekranlarda en fazla 760 px genişlik.
- Koyu zeminde `rgba(15, 23, 42, 0.92)`, açık zeminde `rgba(255, 255, 255, 0.94)`.
- Web'de backdrop blur, native'de Expo BlurView. Android'de BlurTargetView uygulama içeriğini hedefler; Android 12 öncesinde pahalı blur yerine yarı saydam zemin kullanılır.
- Açılış ve kısa sürüklemeden geri dönüş spring; kapanış 220 ms yumuşak çıkış. Azaltılmış hareket ayarında anlık geçiş. Uzun aşağı sürükleme veya yeterince hızlı aşağı hareket kapatır. Yukarı çekmek kapatma sayılmaz.
- Sürükleme yalnızca üst tutma bölgesinden başlar. Kartın gövdesi bağımsız ScrollView içinde kayar; form ve checkbox etkileşimleri kapatma hareketiyle yarışmaz.
- Tutma bölgesi, kapatma düğmesi ve arka zeminle kapatma; web'de Escape ve Tab odağı sınırlandırma, native'de Android geri tuşu.
- Kapatma çocuk ağacını kaldırmaz. Kontrol işaretleri, saha/laboratuvar sonuçları ve fotoğraf kayıtları yeniden açıldığında korunur. Yeni analiz veya giriş değişimi önceki analizin durumunu sıfırlar.
- Çekmece kapalıyken çocuk animasyonları durur ve içerik erişilebilirlik ağacından çıkar. Açıkken arkadaki sayfanın etkileşimi ve erişilebilirliği kapatılır.
- iOS klavyesi ve web visualViewport yüksekliği için kullanılabilir alan ayarlanır. Alt güvenli alan içerik kaydırma boşluğuna eklenir.

Tam ekran ekran/dokunmatik testleri, kamera ve sesli saha gibi mevcut işlevler kartın içinden açılabilir. Bu işlevler kendi ekran alanlarını kullanır; geri dönüldüğünde çekmece ve analiz durumu korunur.

## Dinamik durum hapı

`DynamicStatusPill` güvenli alanın altında, navigasyon düzenini etkilemeden yüzer. Dokunmaları engellemez. Yüklemede **İlan Çözümleniyor…**, başarıda **[Model] Hazır**, hatada kısa bir hata mesajı gösterir. Durum ikonları yıldırım, onay ve uyarı simgeleridir.

Giriş ve genişlik değişimi spring ile yapılır. Başarı/hata mesajı üç saniye sonra kaybolur. Yeni işlem başladığında önceki zamanlayıcı iptal edilir; eski bir zamanlayıcı yeni işlemin mesajını silemez. Uzun model isimlerinde genişlik ekranla sınırlanır ve metin tek satırda kısaltılır. Tam durum erişilebilirlik etiketiyle sunulur.

Kaynak: [Expo BlurView](https://docs.expo.dev/versions/latest/sdk/blur-view/).
