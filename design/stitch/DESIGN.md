# CoC Analitik — Tasarım Sistemi (DESIGN.md)

## 1. Genel Estetik ve Kurallar
- **Tema:** Clash of Clans esintili sıcak ahşap, bronz ve krem taş dokulu, yüksek kontrastlı oyun arayüzü. Lacivert ve mor renkler **kullanılmaz**. Kırmızı yalnızca yıkıcı eylemler (silme/sıfırlama) ve hata uyarıları için kullanılır; dekoratif amaçla kullanılmaz.
- **Mobil Öncelik:** `390px` mobil genişlik önceliklidir. Yatay taşma (`horizontal overflow`) olmamalıdır.
- **Erişilebilirlik:** Tüm tıklanabilir öğeler (butonlar, sekmeler, kartlar, alt gezinme öğeleri) en az `44px` dokunma hedefine sahip olmalıdır. Giriş alanları (`input`) en az `16px` (`1rem`) yazı boyutunda olmalıdır.
- **Dil:** Tüm arayüz metinleri **Türkçe**dir.
- **Görsel Kuralı (Zorunlu):** Hiçbir fotoğraf, illüstrasyon, 3D çizim veya yapay zekâ görseli **kullanılmaz**. Tüm ikonlar ve oyun karakteri/birlik/bina portreleri için yuvarlak köşeli (`8px`) boş kare yer tutucu (içinde kısa ikon adı veya Lucide tarzı sade tek renk çizgi ikon) kullanılır.

## 2. Renk Paleti (Token Eşlemesi)
- **Birincil (Primary — Yeşil Düğme):** Üst `#9CE04A`, Orta `#72BD36`, Alt `#519E23`, Pah `#2E6B11`, Kenarlık `#142E06`, Metin `#FFFFFF`.
- **İkincil (Secondary — Kehribar Vurgu):** `#D97706` (`coc.accent`).
- **Üçüncül (Tertiary — Altın Düğme & MAX):** Üst `#FFEB75`, Orta `#F8C12C`, Alt `#DB930D`, Pah `#8A5603`, Kenarlık `#382101`. MAX rozeti: `#FDD64B` → `#D88E10`, kenarlık `#613B00`, metin `#261501`.
- **Nötr / Ahşap Yüzeyler:**
  - Ahşap kart/panel: `#7E5B47` (üst) → `#6E4D3A` (orta) → `#583929` (alt), kenarlık `#2C180E`, sert alt gölge `#1E0F08`.
  - Ahşap başlık şeridi: `#5E3F32` → `#462C22`, alt kenarlık `#24140C`.
  - Ana ahşap pencere çerçevesi: `#5A3A28` → `#4A2E1E` → `#3B2214`, kenarlık `#28160C`.
- **Krem Pencere & Taş Yüzeyler:**
  - Krem pencere zemini: `#E7E7DE`, çerçeve `#5A5552`, alt iç pah `#B8B6AF`.
  - Krem panel: `#D8AF86` → `#C69B73` → `#A97A52`, kenarlık `#382014`.
  - Koyu metin (krem üzerinde): `#2A2018` / `#2D251E`, ikincil metin `#6B5D4F`.
- **Bronz Bölüm Paneli (`SectionPanel`):** `#5E4634` → `#4E3828` → `#3E2B1E`, kenarlık `#261810`, iç oyuk `#251911`.
- **İç Oyuklar (Inset Wells):**
  - Yuva oyuğu: `#443026` → `#342219`, kenarlık `#22140D`, iç gölge `rgba(0,0,0,0.65)`.
  - Koyu bilgi kutusu: `#382B22` → `#2A1F17` → `#1D150F`, kenarlık `#120C08`.
- **İkincil/Yıkıcı Düğmeler:**
  - Mavi (ikincil eylem): `#6ED3F7` → `#2898C8` → `#1A7198`, kenarlık `#0A222E`.
  - Kırmızı (yalnızca yıkıcı eylem): `#FF6E75` → `#EB2830` → `#C61318`, kenarlık `#330305`.
  - Gümüş / Gri: `#EFECE5` → `#D4D1C9` → `#B2AFA7` (kenarlık `#3C3A38`, metin `#2D251E`) veya `#C4BDB1` → `#9C9488` → `#7B746A`.
- **Sekmeler:** Şerit `#341E12`; ahşap aktif `#64422F` → `#5A3A28` (metin `#FFFFFF`), ahşap pasif `#26140A` → `#1A0D06` (metin `#8C7565`); krem aktif `#E7E7DE` (metin `#2D251E`), taş pasif `#7B7163` → `#685E52` (metin `#D3CDC4`).

## 3. Tipografi
- **Yazı Tipi:** `Plus Jakarta Sans` (ağırlıklar: `400`, `500`, `600`, `700`, `800`).
- **Sayılar:** Tüm istatistik, seviye, etiket ve sayaçlarda `font-variant-numeric: tabular-nums` zorunludur.
- **Ölçek:**
  - Pencere/Kart Ana Başlığı: `18px–20px`, `font-weight: 800`, `#FFFFFF`, hafif metin gölgesi `0 2px 4px rgba(0, 0, 0, 0.72)`.
  - Panel/Kart Başlığı: `14px–16px`, `font-weight: 700–800`.
  - Gövde / Açıklama: `12px–14px`, `font-weight: 400–600`, satır yüksekliği `1.5`.
  - Giriş Alanı (`input`): `16px` (`1rem`), `font-weight: 600`.
  - Küçük Rozetler (`10px–12px`, `font-weight: 800`): **Metin gölgesi ve kontur YOK** (`text-shadow: none`).

## 4. Geometri ve Derinlik Kuralları
- **Köşe Yuvarlama:** Küçük `6px` (`sm`), orta `10px` (`md`), panel/büyük düğme `16px` (`lg`), dış pencere `20px–22px` (`xl`), ikon karosu `8px`, rozet/hap `9999px`.
- **Kenarlık Kalınlıkları:** İç oyuklar `2px`, düğmeler ve giriş alanları `2.5px`, bölüm panelleri `3px`, dış pencere çerçevesi `3.5px–4px`.
- **Derinlik:**
  - Düğmelerde dış drop-shadow **YOKTUR**; yalnızca üst kenarda `inset 0 1.5px 0 rgba(255,255,255,0.45)` iç parlaklık kullanılır.
  - Pencere ve panellerde üst iç parlaklık (`inset 0 2px 0 rgba(255,255,255,0.16)`) ve altta sert 3D katman gölgesi (`0 5px 0 #1E0F08`) kullanılır.
  - İç oyuklarda `inset 0 3px 6px rgba(0,0,0,0.65)` içe çökük derinlik verilir.

## 5. Temel Bileşenler
- **`GameButton`:** Yeşil (birincil), gümüş/gri (ikincil), altın (özel), mavi/kırmızı (ikincil/yıkıcı). Boyutlar: `sm` (`36px+`), `md` (`44px+`), `lg` (`48px+`).
- **Sekme Şeridi (`GameTabBar` / `GameTab`):** Üst kenarda yer alır; aktif sekme alt kenarlığı kaldırılarak (`margin-bottom: -3px`) pencere gövdesiyle kesintisiz birleşir.
- **Pencere (`GameWindow`):** İki varyant — koyu ahşap (`#5A3A28`→`#3B2214`) veya krem diyalog (`#E7E7DE`, çerçeve `#5A5552`).
- **`SectionPanel` & İç Oyuk:** Bronz/ahşap başlık altında `#251911` / `#342219` koyu iç oyuk kutular.
- **`StatPill`:** Koyu yarı saydam hap (`rgba(22,14,9,0.75)`), `1.5px solid #3A2317`, `9999px` yuvarlama.
- **`GameInput`:** Beyaz zemin (`#FFFFFF`), `2.5px solid #5A5552`, `12px` köşe, sol `#` öneki (`#7B7163`), `16px` metin, `min-height: 44px`.
- **`GraySegmented`:** Üstten `10px` yuvarlatılmış gri segmente alt sekme şeridi (`min-height: 44px`).
- **İkon Karosu ve Rozetler:** `44×44px` (mobil) yuvarlak köşeli kare yer tutucu; sol üstte `xN` adet rozeti, sol altta seviye veya altın `MAX` rozeti.
- **İlerleme Çubuğu:** `8px` yükseklik, `#110B07` oluk, altın veya yeşil gradyan dolgu.
