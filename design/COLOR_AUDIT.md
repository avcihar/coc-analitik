# Panel Renk Ölçüm ve Denetim Raporu (`design/COLOR_AUDIT.md`)

> **Ölçüm Ortamı:** Headless Chrome (`1440×900` ve `390×844`) üzerinden `getComputedStyle()` ile canlı DOM ölçümü. Hedef referans: **Meta & Ordu** (`#/meta`).
> **Arka Plan & Overlay Notu:** `frontend/public/background.webp` ve `AppShell.tsx` içindeki sabit arka plan + koyu degrade overlay katmanı (satır 53–73) **değiştirilmemiştir**. Ancak aşağıda listelenen yarı saydam (`rgba` alfa < 1, `opacity < 1`, `backdrop-blur`) panellerin arkasından arka plan resmi sızarak panel tonunu değiştirmektedir.

## 1. Tonların Farklı Görünme Nedenleri (Sınıflandırma ve Sayılar)

| Neden | Açıklama | Tespit Edilen Sayı |
|---|---|---|
| **a) Farklı ham hex ve varyantlar** | `STYLE_GUIDE.md` içinde belgelenen **64 tutarsız hex**; Meta/Duvar dışı **31 dosyada** toplam **1331** ham hex kullanımı (**348** benzersiz hex). Ayrıca `AppShell` varsayılanının krem pencere (`.game-window-cream` `#E7E7DE`) olması (`Meta` ile `ΔRGB = 395.0`). | **31 dosya / 1331 hex** (`64` tutarsız grup) |
| **b) Yarı saydam paneller (alfa / opacity / backdrop-blur)** | `CWL Keşif` (`bg-white/75`, `opacity: 0.9`), `Cevher Analizi` (`bg-[#F2ECE0]/55`, `bg-[#FAF6EE]/65`, `bg-[#ECF4E7]/75`), `AppShell` mobil üst çubuk (`0.92` + `blur(12px)`), `MobileNav` (`0.95` + `blur(12px)`) ve profil/klan kartlarındaki alfa değerleri yüzünden arka plan resmi panel rengiyle karışıyor. | **27 dosyada** alfa/blur/opacity satırı |
| **c) Farklı gradyan uçları ve yönleri** | `.game-window-frame` (`#5A3A28 → #4A2E1E → #3B2214`) yerine `.game-panel-wood` (`#7E5B47 → #583929`), `.game-section-panel` (`#5E4634 → #3E2B1E`), `clan.css` özel gradyanları ve `Ore`/`CWL` düz/yarı saydam yüzeyleri farklı ton veriyor. | **4** ana panel gradyan ailesi + düz yüzeyler |
| **d) Tema / koyu mod (`isDark`) dallanmaları** | `AppShell`, `MobileNav`, `GameHeaderTabs`, `HomeHubView`, `SearchHubView`, `OreCalculatorView`, `ClanMemberList` içinde `isDark ? ... : ...` koşulları açık krem ile koyu kahve arasında iki farklı palet üretiyor. | **7** ana bileşen grubu |
| **e) Altın referans içi fark (Duvar Yazısı)** | `Duvar Yazısı` pencere çerçevesi Meta ile aynıdır, ancak giriş alanı (`input`) `#1A120C` koyu oyuk kullanır (`ΔRGB` arama sayfalarındaki `#FFFFFF`'e göre `409.5`). *Kural gereği değiştirilmez, yalnızca raporlanır.* | **1** sayfa (`duvar-yazisi`) |

## 2. Meta & Ordu Referans Ölçümleri (Hedef Ton Kaynağı)

| Panel Rolü | Seçici | Ölçülen Arka Plan / Gradyan | Kenarlık | Opacity / Blur |
|---|---|---|---|---|
| `ana_pencere` | `.game-window-frame` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(90, 58, 40) 0%, rgb(74, 46, 30) 50%, rgb(5...` | `rgb(40, 22, 12)` | `op=1`, `none` |
| `buton_yesil` | `.game-btn-green` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(156, 224, 74) 0%, rgb(114, 189, 54) 48%, r...` | `rgb(20, 46, 6)` | `op=1`, `none` |
| `ic_oyuk` | `.game-slot-well` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(52, 34, 25) 0%, rgb(68, 48, 38) 100%)` | `rgb(34, 20, 13)` | `op=1`, `none` |
| `kart_panel_ahsap` | `.game-panel-wood` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(126, 91, 71) 0%, rgb(110, 77, 58) 40%, rgb...` | `rgb(44, 24, 14)` | `op=1`, `none` |
| `koyu_bilgi_kutusu` | `.game-stat-box` | `rgba(18, 11, 7, 0.78)` | `rgb(58, 35, 21)` | `op=1`, `none` |
| `panel_baslik` | `.game-panel-header` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(94, 63, 50) 0%, rgb(70, 44, 34) 100%)` | `rgb(229, 231, 235)` | `op=1`, `none` |
| `sekme_aktif` | `.game-tab-active` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(100, 66, 47) 0%, rgb(90, 58, 40) 100%)` | `rgb(40, 22, 12)` | `op=1`, `none` |
| `sekme_pasif` | `.game-tab-inactive` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(38, 20, 10) 0%, rgb(26, 13, 6) 100%)` | `rgb(20, 10, 4)` | `op=0.85`, `none` |
| `sekme_seridi` | `.game-tab-strip` | `rgb(52, 30, 18)` | `rgb(229, 231, 235)` | `op=1`, `none` |
| `stat_pill` | `.game-stat-pill` | `rgba(22, 14, 9, 0.75)` | `rgb(58, 35, 23)` | `op=1`, `none` |

## 3. Sayfa Bazlı Panel Ölçümleri ve Meta İle Karşılaştırma (`1440px` & `390px`)

| Sayfa | Genişlik | Panel Rolü | Seçici | Ölçülen Renk(ler) | Meta Karşılığı | Fark (ΔRGB / Durum) |
|---|---|---|---|---|---|---|
| `ana-sayfa` | `1440px` | `ana_pencere` | `.game-window-cream` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(90, 58, 40) 0%, rgb(74, 46, 30) 50%, rgb(5...` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `ana-sayfa` | `1440px` | `sekme_aktif` | `.game-tab-cream-active` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(100, 66, 47) 0%, rgb(90, 58, 40) 100%)` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `ana-sayfa` | `1440px` | `sekme_pasif` | `.game-tab-stone-inactive` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(123, 113, 99) 0%, rgb(104, 94, 82) 100%)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(38, 20, 10) 0%, rgb(26, 13, 6) 100%)` | gradyan/yüzey farklı, kenarlık `rgb(72, 65, 55)` |
| `ana-sayfa` | `1440px` | `buton_gri_gumus` | `.game-btn-silver` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(239, 236, 229) 0%, rgb(212, 209, 201) 50%,...` | Meta'da bu görünümde yok | `op=1`, `none` |
| `ana-sayfa` | `390px` | `ana_pencere` | `.game-window-cream` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(90, 58, 40) 0%, rgb(74, 46, 30) 50%, rgb(5...` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `ana-sayfa` | `390px` | `buton_gri_gumus` | `.game-btn-silver` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(239, 236, 229) 0%, rgb(212, 209, 201) 50%,...` | Meta'da bu görünümde yok | `op=1`, `none` |
| `oyuncu-klan` | `1440px` | `ana_pencere` | `.game-window-cream` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(90, 58, 40) 0%, rgb(74, 46, 30) 50%, rgb(5...` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `oyuncu-klan` | `1440px` | `sekme_aktif` | `.game-tab-cream-active` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(100, 66, 47) 0%, rgb(90, 58, 40) 100%)` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `oyuncu-klan` | `1440px` | `sekme_pasif` | `.game-tab-stone-inactive` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(123, 113, 99) 0%, rgb(104, 94, 82) 100%)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(38, 20, 10) 0%, rgb(26, 13, 6) 100%)` | gradyan/yüzey farklı, kenarlık `rgb(72, 65, 55)` |
| `oyuncu-klan` | `1440px` | `giris_alani` | `.game-input-container` | `rgb(255, 255, 255)` | Meta'da bu görünümde yok | `op=1`, `none` |
| `oyuncu-klan` | `1440px` | `buton_gri_gumus` | `.game-btn-silver` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(239, 236, 229) 0%, rgb(212, 209, 201) 50%,...` | Meta'da bu görünümde yok | `op=0.5`, `none` |
| `oyuncu-klan` | `390px` | `ana_pencere` | `.game-window-cream` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(90, 58, 40) 0%, rgb(74, 46, 30) 50%, rgb(5...` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `oyuncu-klan` | `390px` | `giris_alani` | `.game-input-container` | `rgb(255, 255, 255)` | Meta'da bu görünümde yok | `op=1`, `none` |
| `oyuncu-klan` | `390px` | `buton_gri_gumus` | `.game-btn-silver` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(239, 236, 229) 0%, rgb(212, 209, 201) 50%,...` | Meta'da bu görünümde yok | `op=0.5`, `none` |
| `oyuncu-profili` | `1440px` | `ana_pencere` | `.game-window-cream` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(90, 58, 40) 0%, rgb(74, 46, 30) 50%, rgb(5...` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `oyuncu-profili` | `1440px` | `sekme_aktif` | `.game-tab-cream-active` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(100, 66, 47) 0%, rgb(90, 58, 40) 100%)` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `oyuncu-profili` | `1440px` | `sekme_pasif` | `.game-tab-stone-inactive` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(123, 113, 99) 0%, rgb(104, 94, 82) 100%)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(38, 20, 10) 0%, rgb(26, 13, 6) 100%)` | gradyan/yüzey farklı, kenarlık `rgb(72, 65, 55)` |
| `oyuncu-profili` | `1440px` | `bolum_paneli` | `.game-section-panel` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(94, 70, 52) 0%, rgb(78, 56, 40) 45%, rgb(6...` | Meta'da bu görünümde yok | `op=1`, `none` |
| `oyuncu-profili` | `1440px` | `buton_altin` | `.game-btn-gold` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(255, 235, 117) 0%, rgb(248, 193, 44) 48%, ...` | Meta'da bu görünümde yok | `op=1`, `none` |
| `oyuncu-profili` | `1440px` | `buton_gri_gumus` | `.game-segmented-item-active` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(226, 224, 216) 0%, rgb(200, 197, 185) 100%)` | Meta'da bu görünümde yok | `op=1`, `none` |
| `oyuncu-profili` | `390px` | `ana_pencere` | `.game-window-cream` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(90, 58, 40) 0%, rgb(74, 46, 30) 50%, rgb(5...` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `oyuncu-profili` | `390px` | `bolum_paneli` | `.game-section-panel` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(94, 70, 52) 0%, rgb(78, 56, 40) 45%, rgb(6...` | Meta'da bu görünümde yok | `op=1`, `none` |
| `oyuncu-profili` | `390px` | `buton_altin` | `.game-btn-gold` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(255, 235, 117) 0%, rgb(248, 193, 44) 48%, ...` | Meta'da bu görünümde yok | `op=1`, `none` |
| `oyuncu-profili` | `390px` | `buton_gri_gumus` | `.game-segmented-item-active` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(226, 224, 216) 0%, rgb(200, 197, 185) 100%)` | Meta'da bu görünümde yok | `op=1`, `none` |
| `klan-detay` | `1440px` | `ana_pencere` | `.game-window-cream` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(90, 58, 40) 0%, rgb(74, 46, 30) 50%, rgb(5...` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `klan-detay` | `1440px` | `sekme_aktif` | `.game-tab-cream-active` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(100, 66, 47) 0%, rgb(90, 58, 40) 100%)` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `klan-detay` | `1440px` | `sekme_pasif` | `.game-tab-stone-inactive` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(123, 113, 99) 0%, rgb(104, 94, 82) 100%)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(38, 20, 10) 0%, rgb(26, 13, 6) 100%)` | gradyan/yüzey farklı, kenarlık `rgb(72, 65, 55)` |
| `klan-detay` | `1440px` | `buton_gri_gumus` | `.game-segmented-item-active` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(226, 224, 216) 0%, rgb(200, 197, 185) 100%)` | Meta'da bu görünümde yok | `op=1`, `none` |
| `klan-detay` | `390px` | `ana_pencere` | `.game-window-cream` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(90, 58, 40) 0%, rgb(74, 46, 30) 50%, rgb(5...` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `klan-detay` | `390px` | `buton_gri_gumus` | `.game-segmented-item-active` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(226, 224, 216) 0%, rgb(200, 197, 185) 100%)` | Meta'da bu görünümde yok | `op=1`, `none` |
| `meta-istatistik` | `1440px` | `koyu_bilgi_kutusu` | `.game-stat-tile` | `rgba(18, 12, 8, 0.85)` | `rgba(18, 11, 7, 0.78)` | ΔRGB=1.4, kenarlık `rgb(58, 35, 23)` |
| `meta-istatistik` | `390px` | `koyu_bilgi_kutusu` | `.game-stat-tile` | `rgba(18, 12, 8, 0.85)` | `rgba(18, 11, 7, 0.78)` | ΔRGB=1.4, kenarlık `rgb(58, 35, 23)` |
| `cwl-kesif` | `1440px` | `ana_pencere` | `.game-window-cream` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(90, 58, 40) 0%, rgb(74, 46, 30) 50%, rgb(5...` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `cwl-kesif` | `1440px` | `sekme_aktif` | `.game-tab-cream-active` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(100, 66, 47) 0%, rgb(90, 58, 40) 100%)` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `cwl-kesif` | `1440px` | `sekme_pasif` | `.game-tab-stone-inactive` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(123, 113, 99) 0%, rgb(104, 94, 82) 100%)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(38, 20, 10) 0%, rgb(26, 13, 6) 100%)` | gradyan/yüzey farklı, kenarlık `rgb(72, 65, 55)` |
| `cwl-kesif` | `1440px` | `giris_alani` | `.game-input-container` | `rgb(255, 255, 255)` | Meta'da bu görünümde yok | `op=1`, `none` |
| `cwl-kesif` | `1440px` | `buton_mavi` | `.game-btn-blue` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(110, 211, 247) 0%, rgb(40, 152, 200) 48%, ...` | Meta'da bu görünümde yok | `op=1`, `none` |
| `cwl-kesif` | `390px` | `ana_pencere` | `.game-window-cream` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(90, 58, 40) 0%, rgb(74, 46, 30) 50%, rgb(5...` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `cwl-kesif` | `390px` | `giris_alani` | `.game-input-container` | `rgb(255, 255, 255)` | Meta'da bu görünümde yok | `op=1`, `none` |
| `cwl-kesif` | `390px` | `buton_mavi` | `.game-btn-blue` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(110, 211, 247) 0%, rgb(40, 152, 200) 48%, ...` | Meta'da bu görünümde yok | `op=1`, `none` |
| `cevher-analizi` | `1440px` | `ana_pencere` | `.game-window-cream` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(90, 58, 40) 0%, rgb(74, 46, 30) 50%, rgb(5...` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `cevher-analizi` | `1440px` | `sekme_aktif` | `.game-tab-cream-active` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(100, 66, 47) 0%, rgb(90, 58, 40) 100%)` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `cevher-analizi` | `1440px` | `sekme_pasif` | `.game-tab-stone-inactive` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(123, 113, 99) 0%, rgb(104, 94, 82) 100%)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(38, 20, 10) 0%, rgb(26, 13, 6) 100%)` | gradyan/yüzey farklı, kenarlık `rgb(72, 65, 55)` |
| `cevher-analizi` | `1440px` | `giris_alani` | `input` | `rgb(250, 246, 238)` | Meta'da bu görünümde yok | `op=1`, `none` |
| `cevher-analizi` | `1440px` | `masaustu_ust_cubuk` | `header` | `rgba(0, 0, 0, 0)` | Meta'da bu görünümde yok | `op=1`, `none` |
| `cevher-analizi` | `390px` | `ana_pencere` | `.game-window-cream` | `rgb(231, 231, 222)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(90, 58, 40) 0%, rgb(74, 46, 30) 50%, rgb(5...` | ΔRGB=395.0, gradyan/yüzey farklı, kenarlık `rgb(90, 85, 82)` |
| `cevher-analizi` | `390px` | `giris_alani` | `input` | `rgb(250, 246, 238)` | Meta'da bu görünümde yok | `op=1`, `none` |
| `duvar-yazisi` | `1440px` | `sekme_pasif` | `.game-tab-stone-inactive` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(123, 113, 99) 0%, rgb(104, 94, 82) 100%)` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(38, 20, 10) 0%, rgb(26, 13, 6) 100%)` | gradyan/yüzey farklı, kenarlık `rgb(72, 65, 55)` |
| `duvar-yazisi` | `1440px` | `giris_alani` | `input` | `rgb(26, 18, 12)` | Meta'da bu görünümde yok | `op=1`, `none` |
| `duvar-yazisi` | `1440px` | `buton_altin` | `.game-btn-gold` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(255, 235, 117) 0%, rgb(248, 193, 44) 48%, ...` | Meta'da bu görünümde yok | `op=1`, `none` |
| `duvar-yazisi` | `1440px` | `buton_mavi` | `.game-btn-blue` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(110, 211, 247) 0%, rgb(40, 152, 200) 48%, ...` | Meta'da bu görünümde yok | `op=1`, `none` |
| `duvar-yazisi` | `390px` | `giris_alani` | `input` | `rgb(26, 18, 12)` | Meta'da bu görünümde yok | `op=1`, `none` |
| `duvar-yazisi` | `390px` | `buton_altin` | `.game-btn-gold` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(255, 235, 117) 0%, rgb(248, 193, 44) 48%, ...` | Meta'da bu görünümde yok | `op=1`, `none` |
| `duvar-yazisi` | `390px` | `buton_mavi` | `.game-btn-blue` | `rgba(0, 0, 0, 0)` + `linear-gradient(rgb(110, 211, 247) 0%, rgb(40, 152, 200) 48%, ...` | Meta'da bu görünümde yok | `op=1`, `none` |

## 4. Şeffaflık / Arka Plan Sızması Tespit Edilen Ek Yüzeyler (`rgba` alfa < 1 veya `opacity < 1`)

| Sayfa | Genişlik | Etiket / Sınıf | Ölçülen `backgroundColor` | `opacity` / `backdropFilter` |
|---|---|---|---|---|
| `oyuncu-profili` | `1440px` | `DIV` `bg-[#2B1F16]/85 border border-amber-400/20 rounded` | `rgba(43, 31, 22, 0.85)` | `op=1`, `none` |
| `oyuncu-profili` | `1440px` | `DIV` `bg-[#2B1F16]/80 rounded-xl p-3 border border-amber` | `rgba(43, 31, 22, 0.8)` | `op=1`, `none` |
| `oyuncu-profili` | `1440px` | `DIV` `bg-[#2B1F16]/80 rounded-xl p-2.5 border border-amb` | `rgba(43, 31, 22, 0.8)` | `op=1`, `none` |
| `oyuncu-profili` | `1440px` | `DIV` `p-3.5 border-t border-amber-400/15 bg-[#1F150E]/65` | `rgba(31, 21, 14, 0.65)` | `op=1`, `none` |
| `oyuncu-profili` | `390px` | `DIV` `bg-[#2B1F16]/85 border border-amber-400/20 rounded` | `rgba(43, 31, 22, 0.85)` | `op=1`, `none` |
| `oyuncu-profili` | `390px` | `DIV` `bg-[#2B1F16]/80 rounded-xl p-3 border border-amber` | `rgba(43, 31, 22, 0.8)` | `op=1`, `none` |
| `oyuncu-profili` | `390px` | `DIV` `bg-[#2B1F16]/80 rounded-xl p-2.5 border border-amb` | `rgba(43, 31, 22, 0.8)` | `op=1`, `none` |
| `oyuncu-profili` | `390px` | `DIV` `p-3.5 border-t border-amber-400/15 bg-[#1F150E]/65` | `rgba(31, 21, 14, 0.65)` | `op=1`, `none` |
| `klan-detay` | `1440px` | `DIV` `lg:col-span-5 bg-[#281C14]/[0.92] rounded-xl p-3.5` | `rgba(40, 28, 20, 0.92)` | `op=1`, `none` |
| `klan-detay` | `390px` | `DIV` `lg:col-span-5 bg-[#281C14]/[0.92] rounded-xl p-3.5` | `rgba(40, 28, 20, 0.92)` | `op=1`, `none` |
| `meta-ordular` | `1440px` | `DIV` `flex flex-col sm:flex-row items-start sm:items-cen` | `rgba(43, 31, 22, 0.85)` | `op=1`, `none` |
| `meta-ordular` | `1440px` | `DIV` `flex items-center gap-1 p-0.5 rounded-lg bg-[#2B1F` | `rgba(43, 31, 22, 0.8)` | `op=1`, `none` |
| `meta-ordular` | `390px` | `DIV` `flex flex-col sm:flex-row items-start sm:items-cen` | `rgba(43, 31, 22, 0.85)` | `op=1`, `none` |
| `meta-istatistik` | `1440px` | `DIV` `flex flex-col sm:flex-row items-start sm:items-cen` | `rgba(43, 31, 22, 0.85)` | `op=1`, `none` |
| `meta-istatistik` | `1440px` | `DIV` `game-stat-tile p-2.5 flex flex-col items-center ju` | `rgba(18, 12, 8, 0.85)` | `op=1`, `none` |
| `meta-istatistik` | `390px` | `DIV` `flex flex-col sm:flex-row items-start sm:items-cen` | `rgba(43, 31, 22, 0.85)` | `op=1`, `none` |
| `meta-istatistik` | `390px` | `DIV` `game-stat-tile p-2.5 flex flex-col items-center ju` | `rgba(18, 12, 8, 0.85)` | `op=1`, `none` |
| `cwl-kesif` | `1440px` | `DIV` `hidden md:block rounded-2xl border border-[#C8C1B4` | `rgba(255, 255, 255, 0.75)` | `op=1`, `none` |
| `cwl-kesif` | `390px` | `DIV` `rounded-2xl border shadow-sm transition-all overfl` | `rgba(255, 255, 255, 0.75)` | `op=1`, `none` |
| `cevher-analizi` | `1440px` | `DIV` `px-4 sm:px-6 py-3.5 bg-[#F2ECE0]/55 border-b borde` | `rgba(242, 236, 224, 0.55)` | `op=1`, `none` |
| `cevher-analizi` | `1440px` | `DIV` `rounded-xl border border-[#DCD2C0] bg-[#FAF6EE]/65` | `rgba(250, 246, 238, 0.65)` | `op=1`, `none` |
| `cevher-analizi` | `1440px` | `DIV` `p-3.5 sm:p-4 bg-[#ECF4E7]/75 flex flex-col justify` | `rgba(236, 244, 231, 0.75)` | `op=1`, `none` |
| `cevher-analizi` | `390px` | `DIV` `px-4 sm:px-6 py-3.5 bg-[#F2ECE0]/55 border-b borde` | `rgba(242, 236, 224, 0.55)` | `op=1`, `none` |
| `cevher-analizi` | `390px` | `DIV` `rounded-xl border border-[#DCD2C0] bg-[#FAF6EE]/65` | `rgba(250, 246, 238, 0.65)` | `op=1`, `none` |
| `cevher-analizi` | `390px` | `DIV` `p-3.5 sm:p-4 bg-[#ECF4E7]/75 flex flex-col justify` | `rgba(236, 244, 231, 0.75)` | `op=1`, `none` |
