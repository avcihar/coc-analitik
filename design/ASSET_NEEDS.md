# Varlık İhtiyaç Listesi (Asset Needs & Inventory)

Bu belge, projede (`Coc_yawhehe`) şu anda kullanılan tüm font, ikon, arka plan ve oyun görsellerinin envanterini; eksik/geçici varlıkları; açık kaynak varlık önerilerini ve Supercell oyun varlıklarının manifest eşleşme durumunu özetler.

---

## 1. Mevcut Kullanılan Font, İkon ve Görseller

### 1.1. Fontlar

| Ad | Kullanıldığı Yer | Dosya Yolu | Kaynak | Lisans |
| :--- | :--- | :--- | :--- | :--- |
| **Plus Jakarta Sans** (400, 500, 600, 700, 800) | Tüm uygulama (`game-theme.css`, `globals.css`) | `frontend/public/fonts/Plus_Jakarta_Sans/static/*.ttf` | Yerel dosya (Google Fonts paketi) | **SIL Open Font License 1.1** (`frontend/public/fonts/Plus_Jakarta_Sans/OFL.txt` doğrulandı) |
| **Fredoka** (Variable + Static) | **Kullanılmıyor** (klasörde mevcut, CSS/TSX referansı yok) | `frontend/public/fonts/Fredoka/` | Yerel dosya | **SIL Open Font License 1.1** (`frontend/public/fonts/Fredoka/OFL.txt` doğrulandı) |
| **LilitaOne-Regular** | **Kullanılmıyor** (CSS/TSX referansı yok) | `frontend/public/fonts/LilitaOne-Regular.ttf` | Yerel dosya | Doğrulanmadı |
| **VT323-Regular** | **Kullanılmıyor** (CSS/TSX referansı yok) | `frontend/public/fonts/VT323-Regular.ttf` | Yerel dosya | Doğrulanmadı |
| **Sistem Yedek Fontları** (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`) | `globals.css`, `game-theme.css` | — | İşletim sistemi | Sistem fontu |
| **Bitmap Font Verisi** (`cross_stitch`, `plastic_canvas`, `tango_stitch`) | Duvar Yazısı Planlayıcı (`WallArtView.tsx`, `frontend/src/lib/bitmapFonts/`) | `Fonts/*.json` → `frontend/public/bitmap-fonts/index.json` (`scripts/build_bitmap_fonts.mjs`) | Yerel JSON verisi | Doğrulanmadı |

### 1.2. UI İkonları ve Inline SVG'ler

| Ad | Kullanıldığı Yer | Dosya Yolu / Paket | Kaynak | Lisans |
| :--- | :--- | :--- | :--- | :--- |
| **Lucide React** (62 benzersiz ikon; örn. `Swords`, `Shield`, `Trophy`, `Hammer`, `Crown`, `Flame`, `Search`, `Sun`, `Moon` vb.) | `frontend/src/` içinde 23 bileşen/sayfa | `lucide-react` (`^0.424.0`, `frontend/package.json`) | NPM kütüphanesi | Doğrulanmadı (standart paket lisansı ISC olarak bilinir; `node_modules` içinde doğrulanmadı) |
| **ExpLevelBadge SVG** (XP Yıldız-Kalkan Arması) | `ExpLevelBadge.tsx` (Oyuncu profili XP seviyesi) | `frontend/src/components/player/ExpLevelBadge.tsx` | Inline SVG | Proje içi kod |
| **Cevher İkonları** (`ShinyOreIcon`, `GlowyOreIcon`, `StarryOreIcon`) | `OreCalculatorView.tsx` (Cevher Simülatörü) | `frontend/src/components/ore/OreCalculatorView.tsx` | Inline SVG | Proje içi kod |
| **Duvar Tuvali Yön/Döndürme İkonları** (10 adet ok/döndürme ikonu) | `WallArtView.tsx` | `frontend/src/components/wall/WallArtView.tsx` | Inline SVG | Proje içi kod |

### 1.3. Arka Plan, Sahneler ve Oyun Görselleri

| Ad | Kullanıldığı Yer | Dosya Yolu | Kaynak | Lisans |
| :--- | :--- | :--- | :--- | :--- |
| **Uygulama Arka Planı** (`background.webp`) | `AppShell.tsx` (tüm sayfaların arka planı) | `frontend/public/background.webp` | Kullanıcının `docs/bacground/BG_2026_HammerJam_BuilderSwarm.webp` dosyasından | Supercell varlığı (doğrulanmadı) |
| **Birim / Büyü / Kahraman / Ekipman / Pet / Kuşatma İkonları** (151 `.webp`) | `UnitIcon.tsx` (`iconManifest.ts` üzerinden) | `frontend/public/icons/{builder,dark-troops,equipment,heroes,pets,siege,spells,super-troops,troops}/*.webp` | Kullanıcının `docs/` alt klasörlerinden | Supercell varlığı (doğrulanmadı) |
| **Belediye Binası Görselleri** (17 `.webp`: TH1–TH10, TH12–TH18) | `TownHallImage.tsx` (`townHallsManifest.ts` üzerinden) | `frontend/public/town-halls/Town_Hall*.webp` | Kullanıcının `docs/Town Halls/` klasöründen | Supercell varlığı (doğrulanmadı) |
| **Köy Sahneleri (Sceneries)** (70 tam harita + 79 küçük önizleme ikonu = 149 `.webp`) | `WallArtView.tsx` (`assetsConfig.ts` üzerinden 70 sahne) | `frontend/public/sceneries/*.webp` ve `frontend/public/sceneries/icons/*.webp` | Kullanıcının `docs/Sceneries/` klasöründen | Supercell varlığı (doğrulanmadı) |
| **Duvar Dokusu** (`Wall19.webp`) | `WallArtView.tsx` (`assetsConfig.ts`) | `frontend/public/walls/Wall19.webp` | Kullanıcının `docs/Walls/Wall19.webp` dosyasından | Supercell varlığı (doğrulanmadı) |
| **Klan Rozetleri & Lig İkonları** | `ClanBadge.tsx`, `leagueHelper.ts` | Harici URL: `https://api-assets.clashofclans.com/...` | Resmi Clash of Clans API CDN | Supercell varlığı (doğrulanmadı) |

---

## 2. Eksik veya Geçici (Placeholder) Varlıklar

| Eksik / Geçici Varlık | Durum / Sorun | Gerektiği Ekran(lar) | İstenen Boyut & Format | Tercih Edilen Dosya Adı | Hedef Klasör |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Belediye Binası Seviye 11 (TH11)** | `docs/Town Halls/` ve `frontend/public/town-halls/` içinde yok; `TownHallImage.tsx` geçici `"BB 11"` / `"TH 11"` metin kutusuna düşüyor | Oyuncu Profili, Klan Üye Listesi, Meta Paneli, Arama Sonuçları | 128×128 px veya 256×256 px, şeffaf arka plan **WebP** (veya PNG) | `Town_Hall11.webp` | `frontend/public/town-halls/` |
| **TH12–TH17 Silah Seviyesi Varyantları** | Yalnızca `Town_Hall17-1.webp` mevcut; TH12–TH16 ve TH17'nin diğer silah aşamaları yok | Oyuncu Profili (silah seviyesi gösterimi) | 128×128 px+, şeffaf **WebP** | `Town_Hall{12..17}-{1..5}.webp` | `frontend/public/town-halls/` |
| **Oyun İçi Kaynak & Durum İkonları** (Altın, İksir, Kara İksir, Mücevher/Gem, Kupa, Savaş Yıldızı, Başkent Altını, İnşaatçı Yıldızı) | Şu an `lucide-react` genel ikonları (`Trophy`, `Flame`, `Hammer`, `Star`, `Crown`) veya düz metin ile geçiştiriliyor | Oyuncu Başlığı, Savaş Günlüğü, Klan Detayı, Cevher Simülatörü, Meta Paneli | 32×32 px veya 64×64 px **WebP** / **PNG** (veya UI seti için **SVG**) | `trophy.webp`, `war-star.webp`, `gem.webp`, `gold.webp`, `elixir.webp`, `dark-elixir.webp`, `capital-gold.webp` | `frontend/public/icons/ui/` |
| **Cevher (Ore) Resmi İkonları** (Parlak / Parıltılı / Yıldızlı Cevher) | `OreCalculatorView.tsx` içinde elle yazılmış inline SVG olarak yer tutucu gibi duruyor | Cevher Simülatörü (`OreCalculatorView.tsx`) | 64×64 px şeffaf **WebP** / **PNG** | `shiny_ore.webp`, `glowy_ore.webp`, `starry_ore.webp` | `frontend/public/icons/ores/` |
| **Yerel Lig Rozetleri** (37 Modern Lig + İnşaatçı Üssü Ligleri) | `leagueHelper.ts` harici `api-assets.clashofclans.com` URL'sine bağımlı; İnşaatçı Üssü ligleri API ikon vermezse yalnızca metin dönüyor | Klan Üye Listesi, Oyuncu Profili, Efsane Ligi Paneli | 125×125 px **PNG** / **WebP** | `league_{id}.webp`, `bb_league_{tier}.webp` | `frontend/public/icons/leagues/` |
| **Klan Rozeti Yedek İkonu** | `ClanBadge.tsx` URL yoksa veya yüklenemezse `lucide-react` `Shield` ikonuna düşüyor | Klan Arama, Klan Detay, Oyuncu Profili | 64×64 px / 128×128 px **WebP** / **SVG** | `clan-badge-fallback.webp` | `frontend/public/icons/ui/` |
| **Birim/Ekipman Harf Kutusu Yedekleri (`UnitIcon.tsx`)** | Şu an 151 mevcut ikon manifestle %100 eşleşiyor; ancak CoC API'den yeni eklenecek veya manifest dışı bir birim/büyü/ekipman/evcil hayvan geldiğinde 2 harfli renkli kutuya (`initials`) düşüyor | Ordu Bölümü, CWL Keşif, Meta Paneli, Cevher Simülatörü | 128×128 px şeffaf **WebP** | İlgili kategori adı (`Avatar_<Birim>.webp`) | `frontend/public/icons/{troops,spells,equipment,pets,heroes,siege,super-troops,builder}/` |
| **Diğer Duvar Seviyeleri (Seviye 1–18)** | `frontend/public/walls/` içinde yalnızca `Wall19.webp` mevcut | Duvar Yazısı Planlayıcı (`WallArtView.tsx`) | 115×115 px izometrik şeffaf **WebP** | `Wall{1..18}.webp` | `frontend/public/walls/` |
| **Savaş & Yakın Çekim Sahneleri (8 adet)** | `docs/Sceneries/` içinde mevcut ama `frontend/public/sceneries/` ve `assetsConfig.ts` içine aktarılmamış | Duvar Yazısı Planlayıcı (isteğe bağlı genişletme) | Orijinal **WebP** | `Map_War.webp`, `Map_War_Arena.webp` vb. | `frontend/public/sceneries/` |
| **Favicon & Sosyal Paylaşım Görseli** | `frontend/public/favicon.ico`, `apple-touch-icon.png`, `og-image.png` bulunmuyor | Tarayıcı sekmesi, PWA/mobil kısayol, link önizleme | `32×32` `.ico`, `180×180` `.png`, `1200×630` `.png` | `favicon.ico`, `apple-touch-icon.png`, `og-image.png` | `frontend/public/` |
| **Oyun Stili Display Fontu (Aktif Kullanım)** | `LilitaOne-Regular.ttf` ve `Fredoka` klasörde var ama CSS'te tanımlı değil; tüm başlıklar `Plus Jakarta Sans` ile render ediliyor | Oyun başlıkları, rozet sayıları, seviye etiketleri | `.ttf` / `.woff2` | `LilitaOne-Regular.ttf` / `Fredoka-Bold.ttf` (veya Türkçe destekli alternatif) | `frontend/public/fonts/` |

---

## 3. Açık Kaynak Varlık Önerileri (Kullanıcının İndirebileceği)

> **Not:** Aşağıdaki açık kaynak font ve ikon setlerinin lisans bilgileri genel bilinen lisans türlerine göre yazılmıştır; **tarafımdan harici web üzerinden doğrulanmamıştır**. İndirmeden önce ilgili projenin kendi `LICENSE` / `OFL.txt` dosyasını kontrol edin.

### 3.1. Font Önerileri (Türkçe Karakter Destekli)
* **Plus Jakarta Sans** *(Halihazırda projede mevcut — SIL OFL 1.1 doğrulandı)*: Modern arayüz ve gövde metinleri için ideal.
* **Fredoka** *(Halihazırda `frontend/public/fonts/Fredoka/` içinde mevcut — SIL OFL 1.1 doğrulandı)*: Yuvarlak, oyunsu başlık ve buton yazıları için CSS'te aktif edilebilir.
* **Bungee** / **Titan One** / **Luckiest Guy** / **Lilita One** (Google Fonts — genellikle OFL): Clash of Clans başlık hissiyatına yakın kalın display fontlar (Türkçe `ğ, ü, ş, ı, İ, ö, ç` desteği indirmeden önce kontrol edilmelidir).
* **JetBrains Mono** veya **Space Mono** (Google Fonts — genellikle OFL): Klan/oyuncu etiketleri (`#ABC123`) ve sayısal tablolar (`tabular-nums`) için.

### 3.2. UI İkon Seti Önerileri
* **Lucide Icons** (`lucide-react`, halihazırda kurulu — yaygın olarak ISC lisansı olarak bilinir, doğrulanmadı): Mevcut genel UI ikonları için yeterli.
* **Phosphor Icons** (`@phosphor-icons/react` — yaygın olarak MIT lisansı olarak bilinir, doğrulanmadı): `duotone` ve `fill` ağırlıkları sayesinde ahşap/oyun panellerinde daha dolgun görünüm sağlar.
* **Tabler Icons** (`@tabler/icons-react` — yaygın olarak MIT lisansı olarak bilinir, doğrulanmadı): Geniş ikon çeşitliliği.
* **Game Icons (game-icons.net)** (yaygın olarak CC BY 3.0 olarak bilinir, doğrulanmadı): Kılıç, kalkan, iksir şişesi, taç, kale gibi oyun temalı genel SVG ikonlar için (Supercell telifli görseller yerine açık kaynak alternatif gerektiğinde).

---

## 4. Supercell Oyun Görselleri Dökümü (`docs/` vs `frontend/public/`)

### 4.1. Klasör Bazlı Dosya Sayısı ve Boyut Özeti

| Kategori | `docs/` Kaynak Klasörü | `docs/` Dosya / Boyut | `frontend/public/` Hedefi | `public/` Dosya / Boyut | Manifest Dosyası |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **Elixir Troops** | `docs/Elixir Troops/` | 19 / 121.8 KB | `frontend/public/icons/troops/` | 19 | `iconManifest.ts` |
| **Dark Elixir Troops** | `docs/Dark Elixir Troops/` | 13 / 79.7 KB | `frontend/public/icons/dark-troops/` | 13 | `iconManifest.ts` |
| **Super Troops** | `docs/Super Troops/` | 17 / 65.2 KB | `frontend/public/icons/super-troops/` | 17 | `iconManifest.ts` |
| **Elixir Spells** | `docs/Elixir Spells/` | 10 / 70.5 KB | `frontend/public/icons/spells/` | 10 | `iconManifest.ts` |
| **Dark Spells** | `docs/Dark Spells/` | 8 / 50.7 KB | `frontend/public/icons/spells/` | 8 | `iconManifest.ts` |
| **Heroes** | `docs/Heroes/` | 6 / 40.2 KB | `frontend/public/icons/heroes/` | 6 | `iconManifest.ts` |
| **Hero Equipment** | `docs/Hero Equipment/` | 43 / 206.0 KB | `frontend/public/icons/equipment/` | 43 | `iconManifest.ts` |
| **Pets** | `docs/Pets/` | 12 / 69.1 KB | `frontend/public/icons/pets/` | 12 | `iconManifest.ts` |
| **Siege Machines** | `docs/Siege Machines/` | 9 / 57.6 KB | `frontend/public/icons/siege/` | 9 | `iconManifest.ts` |
| **Builder Base (Troops + Heroes)** | `docs/Builder Base Troops/` (12) + `docs/Builder Base Heroes/` (2) | 14 / 97.4 KB | `frontend/public/icons/builder/` | 14 | `iconManifest.ts` |
| **Town Halls** | `docs/Town Halls/` | 17 / 108.3 KB | `frontend/public/town-halls/` | 17 / 108.3 KB | `townHallsManifest.ts` |
| **Sceneries (Harita + İkon)** | `docs/Sceneries/` | 157 / 129,372.1 KB (~126.3 MB) | `frontend/public/sceneries/` | 149 (70 harita + 79 ikon) / 54,241.6 KB (~53.0 MB) | `assetsConfig.ts` |
| **Walls** | `docs/Walls/` | 1 / 2.8 KB | `frontend/public/walls/` | 1 / 2.8 KB | `assetsConfig.ts` |
| **Background** | `docs/bacground/` | 1 / 200.7 KB | `frontend/public/background.webp` | 1 / 200.7 KB | `AppShell.tsx` (doğrudan URL) |
| **Diğer (`docs/skills/`)** | `docs/skills/scenery-grid-alignment/SKILL.md` | 1 / 19.7 KB | — | — | — |
| **TOPLAM** | `docs/` | **328 dosya / ~127.5 MB** | `frontend/public/` (tümü) | **368 dosya / ~57.5 MB** | — |

*(Not: `frontend/public/` toplam 368 dosya içinde 48 font dosyası [3,218.6 KB] ve 1 bitmap-fonts `index.json` [288.0 KB] da dahildir.)*

### 4.2. Manifest Eşleşme Durumu

1. **`iconManifest.ts` (`frontend/public/icons/`)**:
   * `public/icons/` altındaki **151** `.webp` dosyasının **151'i de** `ICON_MANIFEST` içinde eşlenmiştir.
   * Manifestte olup dosyası eksik olan: **0**.
   * Klasörde olup manifestte olmayan: **0**.
2. **`townHallsManifest.ts` (`frontend/public/town-halls/`)**:
   * **17** dosya (TH1–TH10, TH12–TH18) eşlenmiştir.
   * **Eşleşmeyen / Eksik**: **TH11 (`Town_Hall11.webp`)** hem `docs/Town Halls/` hem `frontend/public/town-halls/` içinde eksiktir. TH17 yalnızca `Town_Hall17-1.webp` olarak mevcuttur.
3. **`assetsConfig.ts` (`frontend/public/sceneries/` & `walls/`)**:
   * `ASSETS_CONFIG.sceneries` içinde **70** Ana Köy sahnesi tanımlıdır (`public/sceneries/` kökünde 70 harita, `sceneries/icons/` altında 79 ikon).
   * **Aktarılmayan (Eşleşmeyen) Sahneler**: `docs/Sceneries/` içinde bulunan **8** savaş/yakın çekim sahnesi `frontend/public/sceneries/` içine kopyalanmamıştır:
     * `Map_Champion_War_Base.webp`
     * `Map_Clash_of_Dragons_Closeup.webp`
     * `Map_Ruined_Kingdom_War_Scenery.webp`
     * `Map_Tarnished_Titans_War_Scenery.webp`
     * `Map_War.webp`
     * `Map_War_Arena.webp`
     * `Map_War_Machine_Scenery.webp`
     * `Map_Year_of_the_Snake_Closeup.webp`
   * **Duvar**: Yalnızca `Wall19.webp` eşlenmiştir; Wall 1–18 yoktur.
4. **Lig ve Kalkan İkonları**:
   * Projede yerel lig veya kalkan (shield) klasörü yoktur. Lig rozetleri `leagueHelper.ts` üzerinden harici `api-assets.clashofclans.com` URL'leri ile çekilmektedir.

---

## 5. Uygulama Sonrası Durum (Faz 7)

- Tüm UI ikonları mevcut `lucide-react` (`^0.424.0`) paketi üzerinden sağlandı; hiçbir AI üretimi ikon, font veya görsel eklenmedi.
- `Town_Hall11.webp` (`frontend/public/town-halls/`) hâlâ manuel indirme beklemektedir (mevcut `TownHallImage` yedek mantığıyla çalışmaya devam eder).
- `frontend/public/background.webp` ve `Fonts/*` / `Plus Jakarta Sans` dosyaları değiştirilmedi.
