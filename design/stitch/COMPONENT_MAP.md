# Bileşen Eşleme Haritası (`design/stitch/COMPONENT_MAP.md`)

> **Amaç:** Stitch tasarımlarındaki ekran bölgelerini `design/PANEL_INVENTORY.md` içindeki mevcut React bileşenleriyle eşleştirmek, yeni gerekecek bileşenleri listelemek ve Mobil (`390px`) ↔ Masaüstü (`1440px`) kırılma noktalarını belgelemek.

---

## 1. Ekran Bölgesi → Mevcut React Bileşeni Eşlemesi

| Stitch Ekran Bölgesi | Mevcut Bileşen | Dosya Yolu | Not / Varyant |
|---|---|---|---|
| **Masaüstü Üst Uygulama Çubuğu** | `GameHeaderTabs` (içinde `AppShell`) | `frontend/src/components/shell/GameHeaderTabs.tsx` | `variant="cream"` veya `"bare"`; Yön A için tüm sayfalarda koyu ahşap çubuk (`hidden lg:block`) |
| **Mobil Alt Gezinme Çubuğu (5 öğe)** | `MobileNav` | `frontend/src/components/shell/MobileNav.tsx` | `lg:hidden`; `Ana Sayfa`, `Oyuncu & Klan`, `Meta`, `CWL`, `Daha Fazla` çekmecesi (`min-h-[44px]`) |
| **Dış Oyun Penceresi (Yön A / Yön B)** | `GameWindow` | `frontend/src/components/game/GameWindow.tsx` | Yön B: `variant="cream"`; Yön A: `.game-window-frame` (`variant="bare"` + ahşap çerçeve) |
| **Pencere Üst Sekme Şeridi** | `GameTabBar`, `GameTab` | `frontend/src/components/game/GameTab.tsx` | Aktif sekme pencere gövdesiyle kesintisiz birleşir |
| **Ahşap Bilgi / Araç / İçerik Paneli** | `GamePanel` | `frontend/src/components/game/GamePanel.tsx` | `variant="wood"` (varsayılan), `"dark"`, `"cream"`, `"blue"`; `insetWell` prop'u |
| **Bölüm Paneli (Oyuncu Profili vb.)** | `SectionPanel` | `frontend/src/components/game/SectionPanel.tsx` | `title`, `icon`, `rightBadge` |
| **Altın / Yeşil / Mavi / Kırmızı Düğme** | `GameButton` | `frontend/src/components/game/GameButton.tsx` | `variant="green" \| "gold" \| "blue" \| "red"`, `size="sm" \| "md" \| "lg"` |
| **Oyuncu Etiketi Arama Alanı (`#` önekli)** | `GameInput` | `frontend/src/components/game/GameInput.tsx` | `prefixTag="#"`, mobil `text-base` (`16px`+) |
| **İç Sekme / Filtre Anahtarı** | `GraySegmented` | `frontend/src/components/game/GraySegmented.tsx` | `Oyuncu Ara \| Klan Ara`, profil alt sekmeleri vb. |
| **Birlik / Büyü / Kahraman / Ekipman Karosu** | `IconFrame` + `LevelBadge` | `frontend/src/components/game/IconFrame.tsx`, `LevelBadge.tsx` | Sol üst `xN` adet, sol alt seviye, maksimumda altın `MAX` |
| **İstatistik Hapı / Rozeti** | `StatPill` | `frontend/src/components/game/StatPill.tsx` | `variant="default" \| "amber" \| "green" \| "copper" \| "blue" \| "purple"` |
| **Belediye Binası Yer Tutucusu / Görseli** | `TownHallImage` | `frontend/src/components/game/TownHallImage.tsx` | Varsayılan `size={120}`; Stitch masaüstünde `56px`, mobilde `44px` |
| **Klan Rozeti** | `ClanBadge` | `frontend/src/components/game/ClanBadge.tsx` | Klan arama ve klan detayı başlığı |
| **Yükleme İskeleti** | `SkeletonBlock` | `frontend/src/components/game/SkeletonBlock.tsx` | Arama, profil ve klan yükleme durumları |
| **Ekipman İkonu (Cevher Analizi)** | `UnitIcon` *(veya `IconFrame` ile birleştirme)* | `frontend/src/components/common/UnitIcon.tsx` | Cevher analizinde kullanılıyor; Yön A uyumu için `IconFrame` önerilir |

---

## 2. Yeni Gereken React Bileşenleri

Stitch tasarımlarında yer alıp mevcut `PANEL_INVENTORY.md` ortak bileşen tablosunda doğrudan karşılığı bulunmayan yeni bileşenler:

1. **`ToolLauncherCard`** *(Ana Sayfa — 6 araç kartı)*
   - Sol üstte `44×44px` (`56px` masaüstü) yuvarlak köşeli ikon yer tutucusu, başlık, tek satır açıklama, altta koyu iç oyukta (`#342219`) durum bilgisi (`Son aranan: #P89PCUPUQ` vb.) ve sağda ok (`ChevronRight`).
2. **`WoodStatusBanner`** *(Ana Sayfa üst şerit)*
   - `#5E3F32 → #462C22` durum şeridi + sağda `GameButton` (`Hızlı Ara`).
3. **`RecentTagChip` / `TagFormatGuideCard`** *(Oyuncu Ara & Klan Ara)*
   - `#P89PCUPUQ` gibi son aranan etiket çipleri (`min-h-[44px]`) ve "Etiketini Nerede Bulursun?" 3 adımlı rehber kartı.
4. **`WoodDataTable` / `ResponsiveMemberList`** *(Klan Detayı üye listesi & Cevher Analizi gelir tablosu)*
   - Masaüstünde (`>= lg`) yatay kaydırmasız tablo, mobilde (`< md`) tek sütun üye/gelir kartı listesi.
5. **`ProgressBarWood`** *(Oyuncu Profili başarı/ilerleme & Cevher Analizi tamamlanma oranı)*
   - Koyu oyuk (`#251911`) zemin içinde yeşil (`#72BD36`) veya altın (`#F8C12C`) dolum çubuğu + `tabular-nums` yüzde etiketi.
6. **`OreDeficitCard`** *(Cevher Analizi)*
   - Parlak (Shiny), Işıltılı (Glowy), Yıldızlı (Starry) cevher eksikliği ve senaryo gün tahmini kartı.
7. **`CwlRosterCard` / `ScoutedSummaryBar`** *(CWL Keşif)*
   - Savaş turu seçici, keşif durumu özeti ve rakip köy sırası kartı (`ScoutedArmyCard` üst sarmalayıcısı).

---

## 3. Mobil (`390px`) ↔ Masaüstü (`1440px`) Kırılma Noktası Tablosu

| Ekran / Alan | Mobil (`< 1024px`, 390px referans) | Masaüstü (`>= 1024px`, 1440px referans) | Tailwind Kırılma Noktası |
|---|---|---|---|
| **Genel Çerçeve & Gezinme** | Alt sabit 5 öğeli `MobileNav` (`min-h-[44px]`), üst uygulama çubuğu yok | Üst ince koyu ahşap uygulama çubuğu (6 öğe) + ortalanmış `max-w-[1200px]` oyun penceresi | `lg:` (`1024px`) |
| **Ana Sayfa Araç Kartları** | Tek sütun (`grid-cols-1`) | 2 veya 3 sütun (`md:grid-cols-2 lg:grid-cols-3`) | `md:` / `lg:` |
| **Oyuncu Ara & Klan Ara** | Arama çubuğu üstte, filtreler dikey yığın, sonuç kartları tek sütun | Arama + filtreler yatay/yan panel (`lg:grid-cols-12`), sonuçlar 2 sütun veya tablo | `md:` / `lg:` |
| **Oyuncu Profili** | Özet + 2×2 istatistik ızgarası, sekmeler yatay kaydırmasız sarma, 44px `IconFrame` | Üstte yatay özet şeridi, içerik 2 sütunlu (`lg:grid-cols-2`), 56px `IconFrame` | `md:` / `lg:` |
| **Klan Detayı** | Üye listesi kart görünümü (`md:hidden`), savaş özeti 2×2 | Üye listesi tam tablo (`hidden md:table`), başlık + istatistikler yan yana | `md:` / `lg:` |
| **Meta & Ordu / Kullanım İstatistikleri** | Tek sütun ordu kartları, 44px ikon karoları | 2 sütunlu ordu kartları, üstte TH18/TH17 ve sekme çubuğu, 56px ikon karoları | `lg:` |
| **CWL Keşif** | Tek sütun rakip kadro kartları, altta keşif özeti | Sol/üst rakip kadro listesi + sağ/ana keşfedilen ordu detay alanı | `lg:` |
| **Cevher Analizi** | TH butonları `grid-cols-4`, ayarlar ve sonuçlar tek sütun, gelir kartları | 12 sütun (`lg:grid-cols-12`: sol ayarlar 5, sağ sonuçlar 7), gelir tablosu | `sm:` / `md:` / `lg:` |
| **Duvar Yazısı** | 44×44 kanvas üstte, kaydırma okları kanvas altı araç çubuğunda (`sm:hidden`) | Kanvas 4 köşesinde kaydırma okları (`hidden sm:block`), sahne seçici `lg:grid-cols-8` | `sm:` / `lg:` |
