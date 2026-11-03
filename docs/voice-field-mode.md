# Sesli saha asistanı

`ListingAnalysisCard` üzerindeki **Sesli Asistan ile Hızlı Test (Eller Serbest)** düğmesi `VoiceFieldAssistantModal` bileşenini açar. Bileşen ilk kullanımda yüklenir ve altı sırayla sorulan kontrolü sunar: tuşlar/titreşim, ekran, ahize/mikrofon, kameralar/flaş, port/kasa ve hesap çıkışı.

## Kullanım

- İlk yönerge otomatik okunur. Her sonuç seçiminden sonra sıradaki yönerge hemen başlatılır.
- Sol büyük kırmızı düğme **Sorun Var / Kaldı**, sağ büyük yeşil düğme **Sorunsuz / Geçti** sonucunu kaydeder. Renklerin yanında simge ve metin de vardır. Her seçimde desteklenen cihazlarda hafif haptik verilir.
- **Sesi Kapat** mevcut okumayı iptal eder ve sessiz akışı sürdürür. **Sesi Aç** ve **Tekrar Dinle**, mevcut adımı bir kullanıcı tıklamasıyla yeniden seslendirir.
- Sonuç düğmeleri 350 ms boyunca tekrar basmayı engelleyerek bir çift dokunuşun iki ayrı adımı geçmesini önler. Ses kuyruğu oluşturulmaz; önceki yönerge iptal edilir.
- Altıncı seçimle altı sonuç tek seferde ana karta aktarılır ve modal kapanır. Erken çıkış, önceki ekspertiz kaydını değiştirmez. Yeni bir tur eski saha kaydını ancak tamamlandığında değiştirir.

Bu mod sesli komut veya konuşma tanıma kullanmaz ve mikrofon izni istemez. Kullanıcı denetlediği cihazda kontrolleri yapar; asistan yönergeyi okur ve kullanıcının dokunduğu sonucu kaydeder.

## Cihaza uygun yönergeler

True Tone yalnızca ilgili Apple modellerinde aranır. Diğer cihazlarda parlaklık, ekran ve dokunmatik yönergesi kullanılır. Kamera yönergesi yalnızca modelde bulunan lenslerin denenmesini ister; olmayan 0,5x veya telefoto zorunlu tutulmaz. Hesap adımı Apple için iCloud/Bul, diğer cihazlarda Google/üretici hesabı çıkışını sorar. Kullanıcının izni veya yedeği olmadan sıfırlama önerilmez.

## Ses motoru

- Web: `window.speechSynthesis`, `SpeechSynthesisUtterance`, `lang: tr-TR`, hız `0.9`, perde `1`. Varsa yerel Türkçe ses tercih edilir. `voiceschanged` sonrasında yeniden denemelerde güncel sesler kullanılır.
- iOS/Android: aynı arayüz altında `expo-speech`, Türkçe dil seçimi ve aynı hız/perde ayarı kullanılır.
- Destek yokluğu, konuşma hatası veya 4,5 saniyede sesin başlamaması sessiz akışa yönlendirir. Uzun süre takılan bir okuma 60 saniyede durdurulur. Bir sessiz başarısızlıktan sonra kullanıcı tekrar ses istemedikçe sonraki adımlar sessiz ilerler.
- Uygulama arka plana geçtiğinde, modal kapandığında ve tur tamamlandığında okuma durur. Arka plandan dönmek kendiliğinden eski sesi başlatmaz; Tekrar Dinle kullanılabilir.
- Nesil kimliği ile geç gelen `onstart`, `onend` ve hata olayları eski adımı yeniden etkinleştiremez. Native durdurma işlemleri sıraya alınarak geciken bir durdurmanın yeni okumayı kesmesi önlenir.

Türkçe sesin bulunması ve sesin duyulması tarayıcı/işletim sistemi ayarlarına bağlıdır. iOS fiziksel cihazlarda sessiz anahtarı `expo-speech` sesini engelleyebilir. Bu durumlarda yazılı yönerge ve sonuç butonları kullanılabilir.

## Ekspertiz ve raporlar

`InspectionFacts.fieldInspection` tamamlanan altı adımı, okunan yönergeyi, sonucu ve tarihini tutar. Ana kart geçti/kaldı sayılarını ve altı sonucu gösterir. Metin ve PDF raporlarında saha bölümü yer alır. PNG paylaşımı da aynı güncel güven skorunu kullanır.

Bir adım birden fazla parçayı birlikte sorguladığı için, örneğin “Şarj Soketi ve Kasa” adımında sorun bildirilmesi otomatik olarak kasayı kusurlu veya True Tone'u bozuk yapmaz. Modelin ayrıntılı kritik kontrolleri otomatik işaretlenmez.

Başarısız saha gruplarında güven kesintileri: tuşlar −8; ekran, ses, kamera, port/kasa −10; hesap/aktivasyon −25. Aynı risk laboratuvar veya fiziksel gözlemde zaten kaydedilmişse o saha grubu için ikinci kesinti uygulanmaz. Hesap adımı başarısızsa toplam güven en fazla 64/C olur. Başarılı bir saha adımı önceki ayrıntılı arıza kayıtlarını silmez veya ek puan üretmez.

## Doğrulama

`npm run test:field-assistant`: altı adımın sırası, model uyumu, eksik turun reddi, güven kesintileri, rapor tutarlılığı, Türkçe ses seçimi, sessiz/engellenen ses, geç ses olayları, arka plan ve native iptal davranışı.

Kaynaklar: [Web SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis), [cancel](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/cancel), [Expo Speech](https://docs.expo.dev/versions/latest/sdk/speech/).
