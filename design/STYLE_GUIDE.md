# Clash of Clans Analitik — Stil Kılavuzu ve Tasarım Token'ları

> **Kaynaklar:** Bu kılavuzdaki tüm değerler tahmin edilmeden doğrudan [game-theme.css](file:///c:/Users/avcih/Desktop/UfakDenemeler/Coc_yawhehe/frontend/src/styles/game-theme.css), [globals.css](file:///c:/Users/avcih/Desktop/UfakDenemeler/Coc_yawhehe/frontend/src/app/globals.css), [tailwind.config.ts](file:///c:/Users/avcih/Desktop/UfakDenemeler/Coc_yawhehe/frontend/tailwind.config.ts), [clan.css](file:///c:/Users/avcih/Desktop/UfakDenemeler/Coc_yawhehe/frontend/src/components/clan/clan.css), `frontend/src/components/game/*` ve altın referans sayfalar ([MetaDashboardView.tsx](file:///c:/Users/avcih/Desktop/UfakDenemeler/Coc_yawhehe/frontend/src/components/meta/MetaDashboardView.tsx), [WallArtView.tsx](file:///c:/Users/avcih/Desktop/UfakDenemeler/Coc_yawhehe/frontend/src/components/wall/WallArtView.tsx)) üzerinden birebir ölçülmüştür.

---

## 1. Renk Token'ları

### 1.1 Tema Yüzeyleri (`globals.css` & `tailwind.config.ts`)
| Token | Açık Tema (Light) | Koyu Tema (Dark) | Kullanım Yeri |
|---|---|---|---|
| `--app-bg` (`bg-app-bg`) | `#F6F1E7` | `#14100C` | Ana sayfa/uygulama arka planı |
| `--app-card` (`bg-app-card`) | `#FFFDF8` | `#1F1812` | Standart kart arka planı |
| `--app-card-subtle` (`bg-app-card-subtle`) | `#EFE8DA` | `#2A211A` | İkincil yüzey / alt kutu |
| `--app-border` (`border-app-border`) | `#DDD2C0` | `#3D2F24` | Standart kenarlık |
| `--app-border-strong` (`border-app-border-strong`) | `#C2B39C` | `#574334` | Vurgulu kenarlık & scrollbar |
| `--app-text` (`text-app-text`) | `#2A2018` | `#F5EFE6` | Ana gövde metni |
| `--app-muted` (`text-app-muted`) | `#6B5D4F` | `#B8A99A` | İkincil/açıklama metni |

### 1.2 CoC Alan Renkleri (`tailwind.config.ts` -> `coc.*`)
| Token | Değer | Kullanım Yeri |
|---|---|---|
| `coc.gold` | `#F59E0B` | Altın vurgular |
| `coc.elixir` | `#D94680` | İksir vurgusu |
| `coc.darkElixir` | `#524136` | Kara iksir |
| `coc.shiny` | `#38BDF8` | Parlak Cevher (Shiny Ore) |
| `coc.glowy` | `#E06D3B` | Işıltılı Cevher (Glowy Ore) |
| `coc.starry` | `#F59E0B` | Yıldızlı Cevher (Starry Ore) |
| `coc.accent` | `#D97706` | Genel kehribar vurgu |

### 1.3 Ahşap Yüzeyler (`game-theme.css`)
| Token / Sınıf | Değer | Kullanım Yeri |
|---|---|---|
| `--game-wood-light` | `#7E5B47` | `.game-panel-wood` üst gradyan |
| `--game-wood-mid` | `#6E4D3A` | `.game-panel-wood` orta (%40) |
| `--game-wood-dark` | `#583929` | `.game-panel-wood` alt gradyan |
| `--game-wood-border` | `#2C180E` | `.game-panel-wood` kenarlığı |
| `--game-wood-shadow` | `#1E0F08` | `.game-panel-wood` alt 3D gölge (`0 5px 0`) |
| `--game-wood-highlight` | `rgba(255, 255, 255, 0.16)` | Üst iç parlaklık (`inset 0 2px 0`) |
| `--game-wood-header-light` | `#5E3F32` | `.game-panel-header` üst gradyan |
| `--game-wood-header-dark` | `#462C22` | `.game-panel-header` alt gradyan |
| `--game-wood-header-border` | `#24140C` | `.game-panel-header` alt çizgi (`2.5px`) |
| `.game-window-frame` | `#5A3A28` -> `#4A2E1E` -> `#3B2214` | Ana ahşap pencere gövdesi (Meta, Duvar) |
| `.game-window-frame` border | `#28160C` | Ana ahşap pencere dış çerçevesi (`3.5px`) |

### 1.4 Krem & Sıcak Bronz Profil Yüzeyleri (`game-theme.css`)
| Token | Değer | Kullanım Yeri |
|---|---|---|
| `--game-cream-light` / `mid` / `dark` | `#D8AF86` / `#C69B73` / `#A97A52` | `.game-panel-cream` gradyanı |
| `--game-cream-border` / `shadow` | `#382014` / `#24130A` | `.game-panel-cream` kenarlık & alt gölge |
| `--game-window-cream-bg` | `#E7E7DE` | `.game-window-cream` ana diyalog arka planı |
| `--game-window-cream-border` | `#5A5552` | `.game-window-cream` çerçevesi (`4px`) |
| `--game-window-cream-bevel` | `#B8B6AF` | `.game-window-cream` alt iç pah |
| `--game-window-cream-shadow` | `rgba(0, 0, 0, 0.65)` | Krem pencere dış gölgesi |
| `--game-blue-panel-light` / `mid` / `dark` | `#5E4634` / `#4E3828` / `#3E2B1E` | `.game-panel-blue` (sıcak bronz profil paneli) |
| `--game-blue-panel-border` / `shadow` | `#261810` / `#160C06` | `.game-panel-blue` kenarlık & alt gölge |
| `--game-section-blue-top/mid/bot` | `#5E4634` / `#4E3828` / `#3E2B1E` | `SectionPanel` (`.game-section-panel`) |
| `--game-section-blue-border` / `inset` | `#261810` / `#251911` | `SectionPanel` kenarlık & iç oyuk |
| `--game-tournament-purple-*` | `#7D5420` / `#664216` / `#4D300C` / `#331F07` | `.game-tournament-panel` (Efsane Lig) |

### 1.5 İç Oyuklar ve Koyu Kutular (`game-theme.css`)
| Token / Sınıf | Değer | Kullanım Yeri |
|---|---|---|
| `--game-slot-bg-light` / `dark` | `#443026` / `#342219` | `.game-slot-well` (birlik/büyü yuvası) |
| `--game-slot-border` | `#22140D` | `.game-slot-well` kenarlığı (`2px`) |
| `--game-slot-inner-shadow` | `rgba(0, 0, 0, 0.65)` | `.game-slot-well` iç derinlik gölgesi |
| `--game-dark-box-light` / `mid` / `dark` | `#382B22` / `#2A1F17` / `#1D150F` | `.game-panel-dark` |
| `--game-dark-box-border` | `#120C08` | `.game-panel-dark` kenarlık |
| `--game-cc-box-bg` / `border` | `#4A3A2C` / `#281E15` | `.game-cc-well` (Klan Kalesi yuvası) |
| `.game-stat-box` | `rgba(18, 11, 7, 0.78)` / border `#3A2315` | Meta ordu kartı kullanım & 3-yıldız kutusu |
| `.game-stat-tile` | `rgba(18, 12, 8, 0.85)` / border `#3A2317` (hover `#6D4C3D`) | İstatistik kartçığı |
| `.game-slot-gutter` | `rgba(0, 0, 0, 0.38)` / border `rgba(0, 0, 0, 0.5)` / text `#D6BC97` | Sol dikey ikon şeridi |

### 1.6 Düğme Paletleri (`game-theme.css`)
| Varyant | Top | Mid (48-50%) | Bot | Bevel | Shadow | Border |
|---|---|---|---|---|---|---|
| **Green** | `#9CE04A` | `#72BD36` | `#519E23` | `#2E6B11` | `#194008` | `#142E06` |
| **Blue** | `#6ED3F7` | `#2898C8` | `#1A7198` | `#114D69` | `#0A2E3F` | `#0A222E` |
| **Red** | `#FF6E75` | `#EB2830` | `#C61318` | `#7E0A0E` | `#4A0507` | `#330305` |
| **Gold** | `#FFEB75` | `#F8C12C` | `#DB930D` | `#8A5603` | `#523201` | `#382101` |
| **Gray** (Token) | `#C4BDB1` | `#9C9488` | `#7B746A` | `#4E4840` | `#2E2A25` | `#1F1B17` |
| **Silver** (`.game-btn-silver`) | `#EFECE5` | `#D4D1C9` | `#B2AFA7` | `#7A7872` | — | `#3C3A38` |

### 1.7 Sekmeler (`game-theme.css`)
| Sınıf | Arka Plan | Kenarlık | Metin |
|---|---|---|---|
| `.game-tab-strip` | `#341E12` | Alt `3px solid #28160C` | — |
| `.game-tab-active` | `#64422F` -> `#5A3A28` | `3px solid #28160C` (alt `#5A3A28`) | `#FFFFFF` |
| `.game-tab-inactive` | `#26140A` -> `#1A0D06` | `2.5px solid #140A04` | `#8C7565` (hover `#C2AB9A`) |
| `.game-tab-cream-active` | `#E7E7DE` | `3.5px solid #5A5552` (alt `#E7E7DE`) | `#2D251E` |
| `.game-tab-stone-inactive` | `#7B7163` -> `#685E52` | `3px solid #484137` (alt `#363028`) | `#D3CDC4` |
| `.game-tab-wood-attached` | `#F5F5EE` -> `#E7E7DE` -> `#DCDBD0` | `3.5px solid #28160C` (alt `4px solid #28160C`) | `#3B281B` |

### 1.8 İkon Karo & Nadirlik Çerçeveleri (`game-theme.css`)
- **Varsayılan Çerçeve (`.game-icon-frame`):** `#3F2F23` -> `#291D14`, border `#18100A`
- **Nadirlik:** `common` `#2B231C`, `rare` `#207FA8`, `epic` `#EAB308`, `legendary` `#F5A918`
- **Birim Tipleri:**
  - `elixir`: `#523022` -> `#341D14` (border `#24120B`)
  - `dark-elixir`: `#2B221B` -> `#1A140F` (border `#100B08`)
  - `spell`: `#234244` -> `#162B2D` (border `#0E1D1F`)
  - `siege`: `#3D2B1F` -> `#251710` (border `#190E08`)
  - `super`: `#5B3415` -> `#311B09` (border `#EFA613`)
  - `hero`: `#423124` -> `#281C14` (border `#18100B`)
  - `equipment`: `#3D2D1E` -> `#251A11` (border `#D99B26`)
  - `pet`: `#1C3335` -> `#101F20` (border `#1FB397`)

### 1.9 Hardcoded Renk Kullanımları ve Tespit Edilen Tutarsızlıklar
Bileşen taramasında (`frontend/src/components/**`) CSS değişkenleri yerine çok sayıda hardcoded hex kullanıldığı ve aynı anlama gelen 7 farklı anlamsal grupta toplam **64 farklı/tutarsız hex varyantı** oluştuğu tespit edildi:

| Anlamsal Grup | Kullanılan Farklı Hex Değerleri | Tespit Edilen Yerler (Örnek) | Olması Gereken Tek Token |
|---|---|---|---|
| **Koyu Metin (Krem Üstü)** (7 varyant) | `#221C16` (87×), `#2D251E` (44×), `#2A2018` (15×), `#1F1812`, `#3B281B`, `#382A1D`, `#2D2016` | `cwl`, `ore`, `clan`, `search`, `shell` | `--app-text` (`#2A2018`) veya `#2D251E` |
| **İkincil Kahve Metin** (6 varyant) | `#5A4A3E` (68×), `#5C4F42` (50×), `#6B5D4F` (5×), `#5D4B3B` (5×), `#5D5245`, `#655B4E` | `cwl`, `ore`, `search`, `clan`, `shell` | `--app-muted` (`#6B5D4F`) |
| **Koyu İç Oyuk / Kutu** (12 varyant) | `#2B1F16` (24×), `#1A120C` (22×), `#2A1F17`, `#1D150F`, `#261A12` (9×), `#1E110A`, `#140D08`, `#170E09`, `#110B07`, `#14100C`, `#1F1812`, `#241911` | `meta` (`#2B1F16`), `wall` (`#1A120C`), `player`, `shell` | `--game-dark-box-mid` / `--game-slot-bg-dark` |
| **Açık Krem Kart / Yüzey** (11 varyant) | `#FFFDF8` (51×), `#EFE8DA` (35×), `#FAF6EE` (18×), `#F2ECE0` (17×), `#EAE2D3` (16×), `#EFE7D8` (12×), `#F6F1E7` (10×), `#FFFBF5` (7×), `#EAE4D7`, `#E7E7DE`, `#EFECE5` | `ore`, `cwl`, `search`, `clan`, `shell` | `--app-card` (`#FFFDF8`) / `--app-card-subtle` (`#EFE8DA`) |
| **Krem / Taş Kenarlık** (10 varyant) | `#C8C1B4` (44×), `#C2B39C` (26×), `#DDD2C0` (23×), `#DCD2C0` (14×), `#C9BCAE` (9×), `#D4C9B8` (9×), `#CBBBA3` (10×), `#B8A487`, `#D6C6AD`, `#C4BBA9` | `cwl`, `ore`, `search`, `clan`, `shell` | `--app-border` (`#DDD2C0`) / `--app-border-strong` (`#C2B39C`) |
| **Ahşap Kenarlık** (8 varyant) | `#4A2E1E` (13×), `#4E3120` (19×), `#2C180E`, `#28160C`, `#261810` (15×), `#3A2317` (6×), `#3A2315`, `#3D2F24` | `meta` (`#4A2E1E`), `wall` (`#4E3120`), `game-theme.css` | `--game-wood-border` / `--game-slot-border` |
| **Altın / Kehribar Vurgu** (10 varyant) | `#D98A2B` (32×), `#FFEB75` (30×), `#D97706` (6×), `#FDE68A` (5×), `#F8C12C` (5×), `#E09A1F` (5×), `#EAB308`, `#F59E0B`, `#FCD34D`, `#855C14` | `shell`, `wall`, `home`, `ore`, `clan` | `--game-btn-gold-top` (`#FFEB75`) / `coc.accent` (`#D97706`) |

---

## 2. Tipografi

- **Yazı Tipleri:** `Plus Jakarta Sans` (`frontend/public/fonts/Plus_Jakarta_Sans/static/`). Aktif `@font-face` ağırlıkları: `400` (Regular), `500` (Medium), `600` (SemiBold), `700` (Bold), `800` (ExtraBold). *Not: `public/fonts/` içinde `Fredoka`, `LilitaOne` ve `VT323` dosyaları bulunsa da CSS'te yüklenmemektedir.*
- **Sayısal Hizalama:** Tüm sayaç, seviye, yüzde ve etiketlerde `font-variant-numeric: tabular-nums` (`tabular-nums`) zorunludur.
- **Kontur / `text-shadow` Kuralı:**
  - `.game-title-stroke`: `font-weight: 800`, `#FFFFFF`, `text-shadow: 0 2px 4px rgba(0, 0, 0, 0.72)`, `letter-spacing: -0.01em` (Yalnızca 16px+ başlıklar).
  - `.game-text-stroke`: `font-weight: 800`, `#FFFFFF`, `text-shadow: 0 1.5px 3px rgba(0, 0, 0, 0.68)`, `letter-spacing: -0.005em`.
  - `.game-text-stroke-sm`: `font-weight: 700`, renk miras alır (`inherit`), `text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35)`.
  - `.game-text-stroke-gold` (`#FFEB75`, `rgba(45,22,0,0.85)`), `.game-text-stroke-blue` (`#8BE4FF`, `rgba(10,28,38,0.85)`), `.game-text-stroke-green` (`#B5F55D`, `rgba(16,40,6,0.85)`).
  - **Kural:** Küçük rozetlerde (`game-count-badge`, `game-level-badge`) `-webkit-text-stroke: 0` ve `text-shadow: none` uygulanır.

| Rol | Sınıf / Bileşen | Boyut | Ağırlık | Satır Yüksekliği |
|---|---|---|---|---|
| Pencere / Kart Ana Başlığı | `.game-title-stroke` | `16px–20px` (`text-base sm:text-lg md:text-xl`) | `800` | `1.25–1.4` |
| Panel Başlığı | `GamePanel` / `SectionPanel` | `14px–16px` (`text-sm sm:text-base`) | `700–800` | `1.35` |
| Sekme Etiketi | `.game-tab` | Masaüstü `16.8px` (`1.05rem`), Mobil `13.6px` (`0.85rem`) | `800–900` | `1.2` |
| Gövde Metni | Genel UI | `12px–14px` (`text-xs sm:text-sm`) | `400–600` | `1.5–1.625` |
| Giriş Alanı | `.game-input-field` | `16px` (`1rem`, iOS zoom engeli) | `600` | `1.5` |
| `StatPill` | `.game-stat-pill` | Değer `12.8px` (`0.8rem`), Etiket `11px` | `800` / `600` | `1.2` |
| Adet Rozeti | `.game-count-badge` | `11.52px` (`0.72rem`) | `800` | `1.1` |
| Seviye Rozeti | `.game-level-badge` | `10.88px` (`0.68rem`), Compact `9px` | `800` | `1` |

---

## 3. Geometri, Boşluk, Kenarlık ve Gölge Ölçekleri

### 3.1 Köşe Yuvarlama (`border-radius`)
- `--game-radius-sm`: `6px` (`game-btn-sm`, `game-slot-gutter`, `game-checkbox`)
- `--game-radius-md`: `10px` (`game-btn-md`, `game-slot-well`, `game-cc-well`, `game-stat-tile`, `game-segmented-item` üst)
- `--game-radius-lg`: `16px` (`game-panel`, `game-section-panel`, `game-tournament-panel`, `game-btn-lg`)
- `--game-radius-xl`: `22px` (`game-window-frame`)
- Özel yarıçaplar: `game-window-cream` `20px`, `clan-header-panel` `18px`, `clan-member-row` `14px`, `game-tab` / `game-input-container` `12px`, `game-icon-frame` / `game-stat-box` `8px`, rozet iç köşesi `5px`, `game-stat-pill` / `game-progress-bar-slot` `9999px`.

### 3.2 Kenarlık Kalınlıkları
- `1px`: `.game-progress-bar-slot`, `.game-count-badge` / `.game-level-badge` iç vurgusu
- `1.5px`: `.game-stat-pill`, `.game-stat-tile`, `.game-slot-gutter`, `.clan-donation-box`
- `2px`: `.game-slot-well`, `.game-cc-well`, `.game-icon-frame`, `.game-stat-box`, `.game-btn-sm`, `.game-segmented-item`, `.game-slider`, `.game-checkbox`
- `2.5px`: `.game-btn`, `.game-btn-md`, `.game-btn-panel-green`, `.game-btn-silver`, `.game-panel-header` (alt), `.game-tab-inactive`, `.game-input-container`, `.game-segmented-item-active`
- `3px`: `.game-btn-lg`, `.game-section-panel`, `.game-tournament-panel`, `.game-tab-strip` (alt), `.game-tab-active`, `.game-tab-stone-inactive`
- `3.5px`: `.game-panel`, `.game-window-frame`, `.game-tab-cream-active`, `.game-tab-wood-attached`, `.clan-header-panel`
- `4px`: `.game-window-cream`, `.clan-modal-card`

### 3.3 Gölge ve Derinlik Kuralları
- **Pencere / Panel:** Üst kenarda `inset 0 2px 0 rgba(255,255,255, 0.15–0.4)`, alt kenarda `inset 0 -2px 0 rgba(0,0,0, 0.25–0.4)` ve dışta sert alt katman + yumuşak yayılım (`0 5px 0 #1E0F08, 0 8px 16px rgba(0,0,0,0.5)`).
- **İç Oyuklar (`.game-slot-well`):** İç gölge (`inset 0 3px 6px rgba(0,0,0,0.65)`) + alt kenarda ince parlaklık (`0 1px 0 rgba(255,255,255,0.12)`).
- **Düğmeler (`.game-btn`, `.game-btn-panel-green`):** Dış drop-shadow **sıfırdır** (`box-shadow: none !important`), yalnızca üstte `inset 0 1.5px 0 rgba(255,255,255,0.45)` parlaklığı vardır. (İstisna: `.game-btn-silver` `0 3px 0 #7A7872` dış bevel kullanır).

---

## 4. Bileşen Ölçümleri

### 4.1 İkon Karo Boyutları (`IconFrame`)
| Boyut Adı | Mobil (`<640px`) | `sm` (`≥640px`) | `md` (`≥768px`) | `lg` (`≥1024px`) |
|---|---|---|---|---|
| `xs` / `sm` / `md` / `lg` | `28×28` / `36×36` / `44×44` / `56×56px` | — | — | — |
| `unit` & `hero` | `44×44px` | `50×50px` | `56×56px` | `58×58px` |
| `equipment` | `20×20px` | `23×23px` | `26×26px` | `27×27px` |
| `pet` | `44×20px` | `50×23px` | `56×26px` | `58×27px` |

### 4.2 Rozet Kuralları
- **Adet (`.game-count-badge`):** Sol üst (`top: 0; left: 0`), yalnızca `count > 1` ise `x{count}` olarak gösterilir. `padding: 1px 4.5px`, arka plan `rgba(22, 14, 9, 0.9)`, `border-bottom-right-radius: 5px`.
- **Seviye (`LevelBadge` / `.game-level-badge`):** Sol alt (`bottom: 0; left: 0`), `min-width: 17px`, `height: 14px`, `padding: 0 3.5px`. `equipment` ve `xs` için compact mod: `height: 11px`, `min-width: 13px`, `padding: 0 2.5px`, `9px`.
- **MAX (`.game-level-badge-max`):** Altın gradyan (`#FDD64B` -> `#D88E10`), kenarlık `#613B00`, metin `#261501`, içerik `"MAX"`.

### 4.3 İlerleme Çubuğu, `StatPill`, `GameInput`, `GraySegmented`, `GameTab`, `GameButton`
- **İlerleme Çubuğu:** `.game-progress-bar-slot` (`height: 8px`, `#110B07`, border `1px solid #3A2317`, `border-radius: 9999px`). Dolgu: `.game-progress-bar-fill` (altın `#FDE68A`->`#D97706`->`#92400E`) veya `.game-progress-bar-fill-green` (`#6EE7B7`->`#059669`->`#064E3B`).
- **`StatPill` (`.game-stat-pill`):** `padding: 0.2rem 0.55rem`, `gap: 0.35rem`, `border-radius: 9999px`, `border: 1.5px solid #3A2317`, `bg: rgba(22, 14, 9, 0.75)`. Varyantlar: `default`, `blue`, `copper`, `purple`, `amber`, `green`.
- **Giriş Alanı (`GameInput`):** `min-height: 44px`, `#FFFFFF` zemin, `2.5px solid #5A5552`, `border-radius: 12px`, `#` öneki `#7B7163`, `font-size: 1rem` (16px). *(Not: Duvar Yazısı'nda koyu tema içi input `#1A120C` zemin, `2px solid #4E3120`, `h-12` (48px) kullanır).*
- **`GraySegmented` (`.game-segmented-item`):** `min-height: 44px`, `padding: 0.38rem 0.48rem` (sm+: `0.5rem 0.9rem`), `border-top-radius: 10px`. Aktif: `#E2E0D8`->`#C8C5B9`, `2.5px solid #FFFFFF`, `margin-bottom: -2.5px`.
- **Sekme (`GameTab`):** Masaüstü `0.7rem 1.6rem` (`1.05rem`), Mobil `0.45rem 0.75rem` (`0.85rem`). Aktif sekme `margin-bottom: -3px` (`-4px` kremde) ile alt gövdeye kesintisiz birleşir.
- **Düğme (`GameButton`):**
  - Boyutlar: `sm` (`0.35rem 0.75rem`, `0.8rem`), `md` (`0.55rem 1.15rem`, `0.95rem`), `lg` (`0.75rem 1.6rem`, `1.15rem`).
  - Durumlar: `normal` (üst iç parlaklık, sıfır dış gölge) -> `hover` (`brightness(1.08)`) -> `active` (`scale(0.97)`) -> `disabled` (`grayscale(0.85) opacity(0.65)`, `cursor: not-allowed`).

---

## 5. Altın Referans Tasarım Kuralları (Meta & Duvar Sayfalarından)

1. **Tek Dış Ahşap Pencere (`.game-window-frame`):** Ana içerik krem diyalog yerine doğrudan koyu ahşap çerçeve (`#5A3A28`->`#3B2214`, `3.5px solid #28160C`, `radius: 22px`) içinde yer alır; `AppShell` üzerinden `variant="bare"` ile sarılır.
2. **Üst Sekme Şeridi Entegrasyonu (`.game-tab-strip`):** Sekmeler pencerenin en üst kenarına sıfır boşlukla sabitlenir; aktif sekme alt kenarlığı gizlenerek gövdeyle bütünleşir.
3. **Pencere İçi Üst Özet / Eylem Çubuğu:** Sekme şeridinin hemen altında koyu iç oyuk (`bg-[#2B1F16]/85`) veya başlık bandı bulunur; sağında ana eylem düğmesi (`GameButton variant="green"`) yer alır.
4. **Koyu İç Oyuklar (`game-slot-well` / `#1A120C`):** Birlikler, ayarlar, font seçici ve özet kutuları dış ahşap gövdeden daha koyu iç oyuklara gömülür (`inset 0 3px 6px`).
5. **Dikey İkon Şeridi (`.game-slot-gutter`):** Birlik, kahraman ve klan kalesi satırlarının solunda `24px` genişliğinde dikey ikon rehberi bulunur.
6. **Sıfır Dış Gölgeli Yeşil Ana Eylem Düğmeleri:** Tüm birincil eylemler (`Yenile`, `Orduyu Kopyala`, `Planı İndir`) `.game-btn-green` kullanır; dış drop-shadow kullanılmaz.
7. **Sıfır Lacivert / Mor Politikası:** Tüm arayüz sıcak espresso, ahşap, bronz, krem ve kehribar tonlarındadır; soğuk lacivert veya mor paneller kullanılmaz (turnuva paneli dahil altın-bronzdur).
8. **44px Dokunma Hedefi:** Tüm etkileşimli düğme, açılır başlık, sekme ve kontrol elemanları en az `min-h-[44px]` (`min-w-[44px]`) ölçüsündedir.
9. **16px Mobil Input Kuralı:** Tüm `<input>` elemanları iOS Safari otomatik yakınlaştırmasını önlemek için en az `16px` (`text-base` / `1rem`) font boyutundadır.
10. **Tablo/Sayısal Hizalama (`tabular-nums`):** Yüzdeler, oranlar, duvar sayıları ve rozetler kaymayı önlemek için `tabular-nums` kullanır.
11. **Duyarlı İkon Ölçekleme:** Birlik/kahraman karoları `44px -> 50px -> 56px -> 58px` kademeli büyür; ekipman ve pet karoları kahraman karosunun yüksekliğine (`20px+20px` + `gap`) tam hizalanır.
12. **Nadirlik Rengi Ayrımı:** Sıradan ekipmanlar taş/kahve (`#78716C`/`#2B231C`), Destansı (Epic) ekipmanlar altın (`#EAB308`) çerçeve alır.
