# Şasi ve kasa inceleme kılavuzu

Ana ilan analiz kartındaki **Kamera ile Şasi & Kasa Analizi** düğmesi `VisualDefectScannerModal` bileşenini açar. Modül ilk kullanımda yüklenir. Kamera yalnızca modal açıkken, uygulama öndeyken ve kullanıcı kamerayı etkin tutarken çalışır.

## Akış

1. **Şasi:** Telefonu yandan ve düz bir zemin üzerinde fotoğraflayın veya cihazınızdan bir fotoğraf seçin. Düz / eğri kararını fotoğraf kaydından sonra verin.
2. **Köşeler:** Dört köşeyi ve yüzeyleri gözlemleyin, temsili bir fotoğraf kaydedin ve kozmetik sınıfı seçin.
3. **Özet:** İki fotoğraf, sınıf ve kondisyon puanını inceleyip ekspertize aktarın. Modalı kapatmak mevcut ana kart kaydını değiştirmez.

Neon kılavuzda en, boy ve açı ayarlanabilir; orta lazer çizgisi ile köşe braketleri fotoğrafı hizalamaya yardımcı olur. Gösterilen açı, çizginin elle ayarlanan dönüşüdür. DeviceOrientation sensörü veya fotoğraftan otomatik şasi ölçümü kullanılmaz. Kamera perspektifi, lens bozulması ve kamera çıkıntısı fiziksel eğrilik kanıtı değildir.

Bu modül bir görsel AI modeli çalıştırmaz ve fotoğraftan otomatik kusur tespit ettiğini iddia etmez. Karar, kullanıcının kılavuz ve fotoğrafla yaptığı gözleme dayanır. Şasi eğriliği veya ezik görünümü bir düşme geçmişini tek başına kanıtlamaz. Cihazı bükmek veya bastırmak testin parçası değildir.

## Puanlar

| Sınıf | Kasa puanı | Güven skoruna etkisi |
| --- | ---: | ---: |
| Kusursuz kasa | 10/10 | Ek puan / ceza yok |
| Kılcal çizikler | 8,5/10 | −5 |
| Köşe vurukları / ezikler | 6,5/10 | −12 |
| Şasi eğri / kasa açıklığı | 4/10 | −25; toplam güven en fazla 64 |

Şasi eğriliği, köşe sınıfından bağımsız olarak 4/10 sonucunu belirler. Görsel inceleme varken eski genel −5 kozmetik cezası ayrıca uygulanmaz. Kasa kusuru bildirildiğinde A+ verilmez. Görsel kaydı kaldırmak, kasa durumunu yeniden kontrol bekliyor durumuna getirir. Pazarlık paneli veya fiziksel kontrol formundan kasa durumunu elle değiştirmek önceki görsel kaydı kaldırır; böylece fotoğraf ve beyan arasında çelişki kalmaz.

## Kamera, fotoğraf ve yaşam döngüsü

- Web `getUserMedia` ile `facingMode: environment` tercih eder; ses/mikrofon istemez. Mevcut kamera farklı olabilir; kullanıcı görüntüyü kontrol etmelidir. HTTPS veya localhost gerekir.
- Native `expo-camera` arka kamerayı kullanır. İzin reddi ve başlatma hataları fotoğraf yükleme yoluna yönlendirir. Kamera zamanında yanıt vermezse yeniden deneme sunulur.
- Fotoğraf yükleme `expo-image-picker`, boyutlandırma/JPEG dönüşümü `expo-image-manipulator` ile cihaz içinde yapılır. Kütüphaneden seçilen asıl fotoğraf silinmez.
- En uzun kenar en fazla 1280 px; normalize edilmiş JPEG başına en fazla 2 milyon karakterlik veri URI'si; iki fotoğraf. Girişte 20 MB dosya ve 60 megapiksel sınırı vardır.
- Normalizasyon EXIF bilgilerini rapora taşımaz. Native'de modülün oluşturduğu geçici dosyalar temizlenir. Özet için yalnızca küçültülmüş JPEG veri URI'leri analiz belleğinde tutulur; analiz yenilenince veya kayıt kaldırılınca bırakılır.
- Uygulama arka plana geçince, fotoğraf kaydedilince, özet adımına geçilince veya modal kapanınca kamera kaldırılır. Web'de açık akışlar durdurulur. İzin yanıtı modal kapandıktan sonra gelse bile açılan akış hemen durdurulur.
- Ağ üzerinden görsel yükleme veya analiz servisine aktarım yapılmaz. Kullanıcı PDF dışa aktarırsa fotoğraflar o rapora eklenir; paylaşım kullanıcının kontrolündedir.

## Rapor bağlantısı

`InspectionFacts.visualInspection` türü şasi, kozmetik sınıfı, puan, iki fotoğraf, fotoğraf kaynağı ve zamanını içerir. Ana kart fotoğrafları ve **Kasa Kondisyonu** notunu gösterir. Metin raporu puanı ve bulgu kaynağını içerir; base64 verisini metne dökmez. PNG paylaşım kartı kasa notunu ve güncel güven skorunu gösterir. PDF, puanla birlikte iki fotoğrafı da ekler. Görsellerin yalnızca sınırlı, yerel JPEG veri URI'leri olmasına izin verilir; dış URL ve SVG rapora gömülmez.

## Kontroller

`npm run test:visual-inspection`: dört puan, eğrilik önceliği, fotoğraf doğrulama, kılavuz sınırları, tek kozmetik kesinti, rapor tutarlılığı, yerel görsel normalizasyonu, geç kamera izin yanıtı ve kamera yokluğu / izin reddi.

Gerçek arka kamera kalitesi, fiziksel şasi değerlendirmesi ve işletim sistemi fotoğraf seçicileri gerçek cihaz üzerinde ayrıca denenmelidir.

Kaynaklar: [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/), [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/), [Expo ImageManipulator](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/), [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
