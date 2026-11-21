# CoC Analitik — Panel ve Bileşen Envanteri

Bu belge, `frontend/src/app/` altındaki tüm rotaları, `frontend/src/components/` altındaki tüm sayfa görünümlerini ve ortak (`game/*`, `shell/*`, `common/*`, `player/ExpLevelBadge`) bileşenlerini kodda gözlemlenen gerçek dosya yolları, bileşen adları, prop'lar, API alan adları ve Tailwind/CSS sınıflarıyla belgeler.

**Altın Referans Tasarım Dili:**
- **Meta & Ordu** (`frontend/src/components/meta/MetaDashboardView.tsx`)
- **Duvar Yazısı** (`frontend/src/components/wall/WallArtView.tsx`)

Her ikisi de `AppShell` içinde `variant="bare"` ile sarılır, kendi dış ahşap pencere çerçevesini (`.game-window-frame`), üst ahşap sekme şeridini (`.game-tab-strip` + `GameTabBar` + `GameTab`), ahşap/krem panelleri (`GamePanel variant="wood"` / `.game-panel-cream`), iç oyukları (`.game-slot-well`, `#1A120C` / `#2B1F16` kutular) ve `font-game` + `tabular-nums` tipografisini kullanır.

---

## Özet Sayım

| Metrik | Adet |
| --- | --- |
| **Taranan Sayfa / Görünüm** | **9** (8 ana SPA sekme/rota görünümü + 1 `/dev/game-ui` geliştirici sayfası) |
| **Taranan Panel / Bölüm** | **44** (sayfa düzeyinde dıştan içe listelenen ana panel ve alt bölümler) |
| **Ortak Bileşen** | **17** (`game/*`: 13, `shell/*`: 3, `common/*`: 1) |

---

## 1. Ana Sayfa (`#/home`, `#/`)

- **Rota:** `#/home`, `#/` (`frontend/src/app/page.tsx`)
- **Ana Bileşen:** `HomeHubView` (`frontend/src/components/home/HomeHubView.tsx`)
- **Bağımlı Bileşenler:** `AppShell` (`variant="cream"` → `GameWindow variant="cream"`), `safeFetchJson` (`frontend/src/lib/apiClient.ts`), `getSceneryConfig` / `getSceneryDisplayName` (`frontend/src/lib/assetsConfig.ts`)

### Paneller (Dıştan İçe)
1. **Dış Pencere (`AppShell` → `GameWindow variant="cream"`):**
   - **Panel Türü:** Krem pencere (`.game-window-cream`).
2. **Hero Banner (Üst Ahşap Başlık Şeridi):**
   - **Çizen Bileşen / Stil:** Inline ahşap başlık şeridi (`--game-wood-header-light` → `--game-wood-header-dark`, `border: 2.5px solid var(--game-wood-header-border)`).
   - **Öğeler:** Altın `"i"` bilgi rozeti, başlık (`t.home.heroTitle`), alt başlık (`t.home.heroSubtitle`), canlı örnek zaman damgası rozeti, `"Hızlı Arama"` (`game-btn-silver`) butonu.
   - **Gerçek Veri Alanları & Kaynak:** `dataFetchedAt` (`GET /api/v1/meta/top-analysis?sample_size=200&town_hall=18` → `safeFetchJson`).
3. **Araç Kartları Izgarası (6 adet `HubCardConfig` kartı):**
   - **Çizen Bileşen / Stil:** `div[role="button"]` üzerine `.game-panel.game-panel-wood` ve alt bölümde iç oyuk (`--game-slot-bg-dark` → `--game-slot-bg-light`).
   - **Öğeler:** Sol üstte renkli ikon rozeti (`Users`, `Shield`, `Flame`, `PenTool`, `Swords`, `TrendingUp`), başlık, alt başlık, sağ üstte etiket çipi (`badgeTag`), 2 satır açıklama, altta iç oyuk canlı metrik satırı + `"İncele"` oku.
   - **Gerçek Veri Alanları & Kaynak:**
     - Oyuncu Arama kartı: `localStorage["coc_recent_player_searches"]` (`name`, `displayTag`, `tag`).
     - Klan Arama kartı: `localStorage["coc_recent_clan_searches"]` (`name`, `tag`, `query`).
     - Meta & Ordu kartı: `sampleSize`, `totalRankedAttacksAnalyzed` (veya `totalBattlesAnalyzed`) (`GET /api/v1/meta/top-analysis?sample_size=200&town_hall=18`).
     - Duvar Yazısı kartı: `localStorage["wallart.scenery"]` → `getSceneryConfig` (`id`, `name`).
     - CWL Keşif ve Cevher Analizi kartları: statik i18n metinleri.

### Durumlar
- **normal:** Uygulanmış (API/localStorage varsa canlı metrik, yoksa varsayılan alt metin gösterilir).
- **loading:** Eksik (sessiz arka plan fetch).
- **error:** Eksik (`catch` bloğu hatayı yutup varsayılan metne düşer).
- **empty:** Uygulanmamış (kartlar her zaman statik tanımlı).

### Etkileşimler
- Tıklama ve klavye (`Enter` / `Space` üzerinde `role="button" tabIndex={0}`) ile `#/oyuncu`, `#/klan`, `#/meta`, `#/duvar`, `#/cwl`, `#/cevher` rotalarına geçiş (`onNavigate`).
- `window.addEventListener("storage", ...)` ile `localStorage` senkronizasyonu.

### Responsive Davranış
- **1440px (xl/lg) & 768px (md):** Hero banner yatay (`sm:flex-row`); araç kartları `grid-cols-1 md:grid-cols-2` (2 sütun); `formattedMetaTime` rozeti `hidden md:inline-flex` ile görünür.
- **390px (< sm):** Hero banner dikey (`flex-col`), `"Hızlı Arama"` sağa yaslı (`self-end`); araç kartları tek sütun (`grid-cols-1`); `formattedMetaTime` gizlenir.

### Sorunlar
- Kart başlıkları (`game-panel-wood`) kullanılmasına rağmen dış çerçeve `AppShell variant="cream"` içinde; altın referanslardaki `.game-window-frame` + `.game-tab-strip` yerine doğrudan krem pencere içinde ham ahşap kartlar var.
- Hero banner kendi inline `style={{ background: ... }}` ile çizilmiş, `GamePanel` kullanılmamış.

---

## 2. Oyuncu & Klan Arama Merkezi (`#/oyuncu`, `#/klan`, `#/arama`)

- **Rota:** `#/oyuncu`, `#/klan`, `#/arama` (ayrıca `#/klan?q=...`) (`frontend/src/app/page.tsx`)
- **Ana Bileşen:** `SearchHubView` (`frontend/src/components/search/SearchHubView.tsx`)
- **Bağımlı Bileşenler:** `GraySegmented`, `GameInput`, `ClanBadge`, `SkeletonBlock`, `PlayerSearchView` (`frontend/src/components/search/PlayerSearchView.tsx`), `ClanSearchView` (`frontend/src/components/search/ClanSearchView.tsx`), `searchUtils.ts`

### Paneller (Dıştan İçe)
1. **Dış Pencere (`AppShell` → `GameWindow variant="cream"`):** Krem pencere.
2. **Üst Alt-Sekme Çubuğu (`GraySegmented`):**
   - **Panel Türü:** Gri segmentli alt sekme (`"Oyuncu Ara"` | `"Klan Ara"`).
3. **Oyuncu Arama Paneli (`PlayerSearchView`):**
   - **Panel Türü:** Doğrudan krem pencere zemini üzerinde form + uyarı/iskelet/geçmiş blokları (`GamePanel` yok).
   - **Öğeler:** `GameInput` (`prefixTag="#"`), `.game-btn-silver` arama butonu, hata kutusu (`role="alert"`), yükleme iskelet kartı (`bg-[#EFE8DA]`), son aramalar (`coc_recent_player_searches`, silme butonlu çipler) ve örnek etiketler (`SAMPLE_PLAYER_TAGS`).
   - **Gerçek Veri Alanları & Kaynak:** `name`, `tag` (`GET /api/v1/players/{tag}` → `safeFetchJson`).
4. **Klan Arama Paneli (`ClanSearchView`):**
   - **Panel Türü:** Doğrudan krem pencere zemini üzerinde form + açılır filtre kutusu (`bg-[#EFE8DA]`) + sonuç kartları (`bg-[#FFFDF8]`).
   - **Öğeler:** Arama inputu (`.game-input-container`), `.game-btn-panel-green` `"Ara"` ve `"Filtreler"` butonları, açılır filtre paneli (`minClanLevel`, `minMembers`, `minClanPoints`), hata kutusu, yükleme iskelet listesi, sonuç satırları (`ClanBadge`, `name`, `clanLevel`, `tag`, `type`, `location.name`, `members`/50, `clanPoints`), `"Daha Fazla Göster"` sayfalama butonu, son aranan klanlar.
   - **Gerçek Veri Alanları & Kaynak:**
     - Doğrudan etiket araması: `GET /api/v1/clans/{tag}` (`tag`, `name`, `clanLevel`, `clanPoints`, `members`, `type`, `location.name`, `badgeUrls.medium|small`).
     - İsim araması: `GET /api/v1/clans/search?name=...&limit=16&min_members=...&min_clan_level=...&after=...` (`items[]`, `paging.cursors.after`).

### Durumlar
- **PlayerSearchView:** `normal`, `loading` (`SkeletonBlock` kartı), `error` (`role="alert"` + kapatma `X`), `empty` (son aramalar boş mesajı) uygulanmış.
- **ClanSearchView:** `normal`, `loading` (4 satırlık `SkeletonBlock`), `loadingMore`, `error` (`role="alert"`), `empty` (`hasSearched && visibleClans.length === 0`) uygulanmış.

### Etkileşimler
- `GraySegmented` ile `#/oyuncu` ↔ `#/klan` hash senkronizasyonu.
- Form submit, çip tıklama (otomatik arama başlatır), çip silme / tümünü temizleme, klan filtre çekmecesi aç/kapa ve sıfırlama, `"Daha Fazla Göster"` imleçli sayfalama, klan satırına tıklayınca `#/klan/{tag}` geçişi, oyuncu bulununca `#/oyuncu/{tag}` geçişi.

### Responsive Davranış
- **1440px & 768px (`sm:` ve üzeri):** Klan arama input ve butonları yatay (`sm:flex-row`); filtreler 3 sütun (`sm:grid-cols-3`); klan sonuç kartı tek satır yatay (`sm:flex-row`).
- **390px (`< sm`):** Klan arama butonları input altına tam genişlikte iner (`flex-col`); filtreler tek sütun (`grid-cols-1`); klan sonuç kartında üye sayısı ve kupa alt şeride ayrılır (`border-t sm:border-t-0`).

### Sorunlar
- Altın referanstaki koyu ahşap (`GamePanel variant="wood"`) ve ahşap sekme (`GameTabBar`) yerine krem pencere + gri segment (`GraySegmented`) + gümüş/yeşil (`game-btn-silver`, `game-btn-panel-green`) karışık buton stilleri kullanılıyor.

---

## 3. Oyuncu Profili (`#/oyuncu/:tag`)

- **Rota:** `#/oyuncu/:tag` (`frontend/src/app/page.tsx`)
- **Ana Bileşen:** `PlayerProfileView` (`frontend/src/components/player/PlayerProfileView.tsx`)
- **Bağımlı Bileşenler:** `GraySegmented`, `SectionPanel`, `SkeletonBlock`, `GameButton`, `ClanBadge`, `TownHallImage`, `IconFrame`, `ExpLevelBadge` (`frontend/src/components/player/ExpLevelBadge.tsx`), `PlayerHeaderSection`, `LegendTournamentPanel`, `PlayerArmySection`, `PlayerBattleLogSection`, `BuilderBaseSection`

### Paneller (Dıştan İçe)
1. **Dış Pencere (`AppShell` → `GameWindow variant="cream"`):** Krem pencere.
2. **Köy Alt-Sekme Çubuğu (`GraySegmented`):**
   - **Öğeler:** `"Asıl Köy"`, `"İnşaatçı Üssü"` (`hasBuilderBase` yoksa `disabled`), `"Klan Başkenti"` (her zaman `disabled` + altında `Info` notu).
3. **Oyuncu Başlık Paneli (`PlayerHeaderSection` → `SectionPanel`):**
   - **Panel Türü:** Mavi-gri bölüm paneli (`.game-section-panel`).
   - **Öğeler & Gerçek Veri Alanları:**
     - Sol: `ExpLevelBadge` (`expLevel`), `name`, `tag`, `role`, `townHallLevel`, `townHallWeaponLevel`, `labels[]` (`iconUrls`, `name`), `"Oyunda Aç"` (`GameButton variant="gold"`).
     - Orta: `clan.name`, `ClanBadge` (`clan.badgeUrls`), `"Klanı Gör"` (`GameButton variant="green"`).
     - Sağ: Lig ikonu + `leagueTier.id|name` / `league.id|name`, `trophies`.
     - Alt 6'lı İstatistik Izgarası (`bg-[#2B1F16]` kutular): `warStars`, `bestTrophies`, `donations`, `donationsReceived`, `attackWins`, `defenseWins`.
4. **Efsane Ligi Turnuva Paneli (`LegendTournamentPanel`):**
   - **Panel Türü:** Şampiyona altın-bronz paneli (`.game-tournament-panel`) — yalnızca `legendStatistics` varsa render edilir.
   - **Gerçek Veri Alanları:** `legendStatistics.bestSeason` (`id`, `rank`, `trophies`), `legendStatistics.previousSeason` (`id`, `rank`, `trophies`), `legendStatistics.legendTrophies`.
5. **Ordu ve Birlik Bölümleri (`PlayerArmySection` — 12 sütunlu ızgarada 7 `SectionPanel`):**
   - Sol sütun (`lg:col-span-5`):
     - **Belediye Binası & Cevher Aktarım Kartı (`SectionPanel`):** `TownHallImage` (`townHallLevel`, `townHallWeaponLevel`) + `"Cevher Analizine Aktar"` (`GameButton`).
     - **Kahramanlar (`SectionPanel`):** `heroes[]` (`name`, `level`, `maxLevel`, `equipment[]`).
     - **Evcil Hayvanlar (`SectionPanel`):** `pets[]` + `troops[]` içinden tespit edilen petler (`name`, `level`, `maxLevel`).
   - Sağ sütun (`lg:col-span-7`):
     - **Ordu Birlikleri (`SectionPanel`):** İksir & Kara İksir `troops[]` (`name`, `level`, `maxLevel`).
     - **Büyüler (`SectionPanel`):** `spells[]` (`name`, `level`, `maxLevel`).
     - **Kuşatma Makineleri (`SectionPanel`):** `troops[]` içinden kuşatma makineleri.
     - **Açılmış Kahraman Ekipmanları (`SectionPanel`):** `heroEquipment[]` (`name`, `level`, `maxLevel`, `rarity`).
     - **Süper Birlikler (`SectionPanel`):** `troops[]` içinden süper birlikler (`superTroopIsActive`).
6. **Son Savaş Geçmişi Paneli (`PlayerBattleLogSection` → `SectionPanel`):**
   - **Panel Türü:** Mavi-gri `.game-section-panel` içinde koyu akordeon kartlar (`bg-[#2B1F16]/85`).
   - **Gerçek Veri Alanları:** `battleType === "ranked"` filtresiyle `attack`, `stars`, `destructionPercentage`, `opponentName`, `opponentTag`, `opponentTownHallLevel`, `trophyChange`, `armyShareCode` (`parseArmyShareCode` + `buildCopyArmyLink`).
7. **İnşaatçı Üssü Sekmesi (`BuilderBaseSection` → 3 `SectionPanel`):**
   - **Gerçek Veri Alanları:** `builderHallLevel`, `builderBaseLeague`, `builderBaseTrophies`, `bestBuilderBaseTrophies`, `builderHeroes[]`, `troops[]` (`village === "builderBase"`).
- **Veri Kaynağı:** `Promise.all([safeFetchJson("/api/v1/players/{tag}"), safeFetchJson("/api/v1/players/{tag}/battlelog")])`.

### Durumlar
- `loading`: `SkeletonBlock` ile tam sayfa iskeleti + battlelog içinde `"Yükleniyor"` metni.
- `error`: Krem zeminde kırmızı uyarı kutusu (`bg-[#FDF2F2] border-[#C53030]`) + `"Tekrar Dene"` (`GameButton variant="red"`).
- `empty`: Oyuncu yoksa krem uyarı; battlelog boşsa mesaj; Builder Base yoksa `builderNotUnlocked` mesajı.
- `normal`: Tam render.

### Etkileşimler
- `GraySegmented` alt sekme değişimi (`home` | `builderBase`).
- `"Klanı Gör"` → `#/klan/{clanTag}?vurgula={playerTag}` geçişi.
- `"Oyunda Aç"` ve `"Orduyu Kopyala"` dış linkleri.
- `"Cevher Analizine Aktar"` → `#/cevher` sekmesine oyuncu verisiyle geçiş.
- Savaş geçmişi akordeon satırları (`aria-expanded`, ilk satır otomatik açık).

### Responsive Davranış
- **1440px (xl) & 1024px (lg):** `PlayerHeaderSection` 3 sütun (`md:grid-cols-3`); `PlayerArmySection` 5+7 sütun (`lg:grid-cols-12`); birlik ızgaraları `lg:grid-cols-6 xl:grid-cols-8`.
- **768px (md):** `PlayerHeaderSection` 3 sütun (`md:grid-cols-3`), `LegendTournamentPanel` 3 sütun (`sm:grid-cols-3`), `PlayerArmySection` tek sütuna düşer (`grid-cols-1`), birlikler `md:grid-cols-7`.
- **390px (< sm):** Tüm bölümler tek sütun; istatistik kutusu `grid-cols-2`; birlikler `grid-cols-4`; battlelog header'ında `"Orduyu Kopyala"` butonu alt satıra iner (`flex-col sm:flex-row`).

### Sorunlar
- Altın referanslardaki `GamePanel variant="wood"` yerine `SectionPanel` (mavi-gri `.game-section-panel`) kullanılıyor; aynı uygulama içinde iki farklı ana panel ailesi oluşuyor.
- Hata durumu `GamePanel` yerine düz HTML `bg-[#FDF2F2]` kutusu ile çizilmiş.

---

## 4. Klan Detayı (`#/klan/:tag`)

- **Rota:** `#/klan/:tag` (opsiyonel `?vurgula=...`) (`frontend/src/app/page.tsx`)
- **Ana Bileşen:** `ClanDetailsView` (`frontend/src/components/clan/ClanDetailsView.tsx`)
- **Bağımlı Bileşenler:** `GraySegmented`, `SkeletonBlock`, `GameButton`, `ClanBadge`, `TownHallImage`, `ClanHeaderCard`, `ClanMemberList`, `ClanWarLogModal`, `clan.css`

### Paneller (Dıştan İçe)
1. **Dış Pencere (`AppShell` → `GameWindow variant="cream"`):** Krem pencere.
2. **Üst Alt-Sekme + Yenile Şeridi:** `GraySegmented` (`"Asıl Köy"`, `"İnşaatçı Üssü"`, `"Klan Başkenti"`) + sağda `"Yenile"` butonu.
3. **Klan Başlık Kartı (`ClanHeaderCard`):**
   - **Panel Türü:** Özel koyu mavi-gri/harita dokulu panel (`.clan-header-panel`, `.clan-header-map-grid`, `.clan-header-ribbon`).
   - **Öğeler & Gerçek Veri Alanları:**
     - Sol: `ClanBadge` (`badgeUrls`), `clanLevel`, `name`, `tag`, genişletilebilir `description`, `labels[]`.
     - Sağ (`bg-[#281C14]/[0.92]`): `warLeague.name`, `location.name`, `chatLanguage.name`, `type`, `warFrequency`, `requiredTrophies`, `requiredTownhallLevel`, `requiredBuilderBaseTrophies`.
     - Alt butonlar: `"CWL Keşfi"` (`GameButton variant="green"`), `"Savaş Günlüğü"` (`GameButton variant="blue"`, `isWarLogPublic` true ise).
4. **Klan Başkenti Paneli (`villageTab === "capital"` iken):**
   - **Panel Türü:** `.clan-header-panel` içinde 2 adet `bg-[#281C14]` kutu.
   - **Gerçek Veri Alanları:** `capitalLeague.name`, `clanCapitalPoints`.
5. **Klan Üye Listesi (`ClanMemberList`):**
   - **Panel Türü:** Krem pencere içinde `.clan-member-header` + sıralama açılır menüsü + `.clan-member-row` buton satırları (vurgulanan üyede `.game-member-highlight`).
   - **Gerçek Veri Alanları:** `memberList[]` (`tag`, `name`, `role`, `expLevel`, `townHallLevel`, `trophies`, `builderBaseTrophies`, `donations`, `donationsReceived`, `league`, `leagueTier`).
6. **Savaş Günlüğü Modalı (`ClanWarLogModal`):**
   - **Panel Türü:** `.clan-modal-backdrop` içinde krem dialog (`bg-[#F6F1E7] border-4 border-[#4A3A2C]`) ve 6 adet koyu kahve KPI kutusu (`bg-[#3E2B1E]`).
   - **Gerçek Veri Alanları:** `name`, `tag`, `warWins`, `warLosses`, `warWinStreak`, `warTies`, `warLeague.name`, `warFrequency`, `isWarLogPublic`.
- **Veri Kaynağı:** `GET /api/v1/clans/{tag}` (`safeFetchJson`).

### Durumlar
- `loading`: `SkeletonBlock` ile header + 6 üye satırı iskeleti.
- `error`: Kırmızı uyarı kutusu (`bg-red-100 border-red-400`) + `"Tekrar Dene"` (`GameButton variant="green"`).
- `empty`: Üye listesi boşsa parşömen mesaj kutusu (`bg-[#EFE8DA]`).
- `normal`: Tam render.

### Etkileşimler
- `GraySegmented` alt sekme değişimi (`home` | `builderBase` | `capital`).
- `"Yenile"` butonu.
- Klan açıklaması `"Daha Fazla Göster"` / `"Daha Az Göster"` (`line-clamp-4` ölçümüyle).
- `"CWL Keşfi"` → `#/cwl` geçişi; `"Savaş Günlüğü"` → `ClanWarLogModal` açma (`Escape` ve backdrop tıklamasıyla kapanır).
- Üye sıralama dropdown (`trophies`, `donations`, `donationsReceived`, `name`).
- Üye satırına tıklama → `#/oyuncu/{tag}` geçişi; `?vurgula=` ile gelen üyeye otomatik `scrollIntoView`.

### Responsive Davranış
- **1440px (lg) & 768px (md):** `ClanHeaderCard` `lg:grid-cols-12` (7+5) masaüstünde 2 sütun, 768px'de tek sütun; `ClanMemberList` `hidden sm:flex` ile tek satır yatay masaüstü görünümü.
- **390px (< sm):** Üst sekme + yenile barı `flex-col-reverse`; `ClanMemberList` `sm:hidden` ile 2 satırlı mobil kart görünümüne geçer; modal KPI kutuları `grid-cols-2 sm:grid-cols-3`.

### Sorunlar
- `ClanHeaderCard` ve `ClanWarLogModal` özel `.clan-header-panel` / `.clan-modal-card` CSS sınıfları kullanıyor; altın referanslardaki `GamePanel` / `.game-window-frame` ile birleşik değil.
- Hata kutusu `bg-red-100` düz Tailwind kartı olarak kalmış.

---

## 5. Meta & Ordu (`#/meta`, `#/ordu`) — *[Altın Referans 1]*

- **Rota:** `#/meta`, `#/ordu` (`frontend/src/app/page.tsx`)
- **Ana Bileşen:** `MetaDashboardView` (`frontend/src/components/meta/MetaDashboardView.tsx`)
- **Bağımlı Bileşenler:** `GamePanel`, `GameTabBar`, `GameTab`, `GameButton`, `IconFrame`, `SkeletonBlock`, `StatPill`, `armyLink.ts` (`parseArmyShareCode`, `buildCopyArmyLink`)

### Paneller (Dıştan İçe)
1. **Dış Pencere (`AppShell` → `GameWindow variant="bare"`):** Şeffaf sarmalayıcı.
2. **Ana Ahşap Pencere Çerçevesi (`.game-window-frame`):**
   - Üst şerit (`.game-tab-strip`): `GameTabBar` + 2 `GameTab` (`"Meta Ordular"` | `"Kullanım İstatistikleri"`).
   - Sabit Özet Çubuğu (`bg-[#2B1F16]/85 border-[#4A2E1E]`): `sampleSize`, `totalPlayersAnalyzed`, `totalRankedAttacksAnalyzed`, `dataFetchedAt` + `"Yenile"` (`GameButton variant="green"`).
   - Tarama İlerleme Bandı (`isProcessing === true` iken `.game-panel-cream`): `progress.processed`, `progress.target`, `progress.percentage`.
   - Hata Bandı (`errorMsg` varsa `.game-panel-wood border-red-800/80`): `GameButton variant="gold"` tekrar dene.
3. **Sekme 1 — Önerilen Ordu Kartları (`MetaArmyCard` → `GamePanel variant="wood"`):**
   - Başlıkta `rank`, `name`, `sampleCount`, `usagePct`, `threeStarRatePct` (`.game-stat-box`), sağda `"Orduyu Kopyala"` (`GameButton variant="green"`) + aç/kapa chevron butonu.
   - Genişletilmiş gövdede `StatPill` kapasite rozetleri (`totalTroopHousing`, `totalSpellSpace`, kuşatma, CC), `.game-slot-well` içinde kahraman yüklemeleri (`heroLoadout`: kahraman + `primaryPair` ekipmanları + `pet`), birlikler (`troops[]`), büyüler (`spells[]`), kuşatma (`siegeMachines[]`) ve Klan Kalesi (`clanCastle[]`).
4. **Sekme 2 — Kullanım İstatistikleri (4 adet `GamePanel variant="wood"`):**
   - **Kahramanlar (`GamePanel variant="wood"`):** `.game-slot-well` içinde `.game-stat-tile` kartları (`statistics.heroUsage[]`: `name`, `avgLevel`, `maxedPct`, `usagePct`).
   - **Kahraman Ekipmanları & İkili Eşleşmeler (`GamePanel variant="wood"`):** Kahraman filtre butonları + ekipman kullanım oranları ve ikili kombinasyonlar (`statistics.heroEquipmentPairs[]`, `equipmentByHero`, `equipmentUsage[]`).
   - **Evcil Hayvanlar (`GamePanel variant="wood"`):** `.game-slot-well` içinde `.game-stat-tile` kartları (`statistics.petUsage[]`: `name`, `avgLevel`, `usagePct`).
   - **Birlikler, Büyüler, Kuşatma, Süper Birlikler (`GamePanel variant="wood"`):** Alt kategori sekmeleri (`statistics.troopUsage[]`, `spellUsage[]`, `siegeUsage[]`, `superTroopUsage[]`).
- **Veri Kaynağı:** `GET /api/v1/meta/top-analysis?sample_size=200&town_hall=18&force_refresh={force}` (`safeFetchJson`) + `isProcessing` iken 3500ms polling.

### Durumlar
- `loading`: Sekme 1'de 3 adet `GamePanel` + `SkeletonBlock`; Sekme 2'de 3 adet `GamePanel` + 6'lı `SkeletonBlock` ızgarası.
- `isProcessing`: Krem ilerleme bandı (`.game-panel-cream`).
- `error`: `GamePanel variant="wood"` hata mesajı + tekrar dene.
- `empty`: `GamePanel variant="wood"` içinde `t.meta.noDataTitle`.
- `normal`: Tam render.

### Etkileşimler
- `GameTab` ile `armies` ↔ `stats` geçişi (`#/meta?tab=...`).
- `"Yenile"` (`force_refresh=true`).
- Ordu kartı başlığına veya chevron'a tıklayarak akordeon aç/kapa (1. ordu varsayılan açık).
- `"Orduyu Kopyala"` dış linki.
- İstatistikler sekmesinde kahraman filtresi ve birlik kategori alt sekmeleri.

### Responsive Davranış
- **1440px (lg) & 768px (md/sm):** Kahraman/pet ızgarası `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`; ordu kartı başlığı `sm:flex-row` yatay.
- **390px (< sm):** Ordu kartı başlığı `flex-col` dikey (`basis-full`), özet çubuğu `flex-col`, ızgaralar `grid-cols-2`.

### Sorunlar
- Altın referanstır.

---

## 6. CWL Keşif (`#/cwl`)

- **Rota:** `#/cwl` (opsiyonel `?tag=...&tur=...`) (`frontend/src/app/page.tsx`)
- **Ana Bileşen:** `ScoutedArmyCard` (`frontend/src/components/cwl/ScoutedArmyCard.tsx`)
- **Bağımlı Bileşenler:** `GameInput`, `GameButton`, `IconFrame`, `StatPill`, `TownHallImage`, `clan.css`, `armyLink.ts`

### Paneller (Dıştan İçe)
1. **Dış Pencere (`AppShell` → `GameWindow variant="cream"`):** Krem pencere.
2. **Üst Kontrol Paneli (`bg-[#EFE8DA] border-[#C8C1B4] rounded-2xl`):**
   - **Öğeler:** Başlık (`t.cwl.title`), aktif tur rozeti (`roundNumber`), `GameInput` (`prefixTag="#"`), `"Tara"` (`GameButton variant="green"`), `"Canlı Yenile"` (`GameButton variant="blue"`).
   - **Tur & Savaş Günü Seçici:** `"Savaş Günü"` / `"Hazırlık Günü"` kısayol butonları + `#cwl-round-select` `<select>` (`roundsSummary[]`).
   - **Kadro Filtre Sekmeleri:** `"CWL Kadrosu (cwlCount)"` | `"Tüm Üyeler (allCount)"` + klan durum satırı (`opponentClan.name`, `warState`).
   - **Bildirim Bantları:** Hazırlık günü uyarısı (`bg-amber-50`), durum/hata uyarısı (`bg-rose-50`).
3. **Rakip Kadro Listesi + Satır İçi Akordeon Detay (`SingleScoutCard`):**
   - **Panel Türü:** Mobilde (`< md`) kart listesi (`rounded-2xl bg-white/75`), masaüstünde (`>= md`) HTML `<table>` satırları ve açılan satır altında `SingleScoutCard` detay kutusu.
   - **Gerçek Veri Alanları:** `opponents[]` (`mapPosition`, `townHallLevel`, `opponentName`, `playerTag`, `isCwl`, `trophies`, `armyDetected`, `armySource`, `sourceBadge`, `armySummary`, `armyShareCode`, `activeSuperTroops[]`, `recentArmies[]`, `heroes[]`, `troops[]`, `spells[]`, `siege`, `clanCastle[]`, `threeStarDefenses[]`, `threeStarDefenseCount`).
- **Veri Kaynağı:** `GET /api/v1/cwl/scout/{tag}?force_refresh={bool}&roster_filter={cwl|all}&round={n}` (`safeFetchJson`) + bileşen içi `cacheRef`.

### Durumlar
- `loading`: Mobilde 5 adet `animate-pulse` kart; masaüstünde 5 satırlık tablo iskeleti.
- `error`: `statusMsg` içinde `bg-rose-50 border-rose-300` banner.
- `empty`: `sortedOpponents.length === 0` mesaj kutusu (`bg-[#EFE8DA]`).
- `normal`: Kadro listesi + genişletilebilir `SingleScoutCard` (`Saldırı` | `Savunma` sekmeleri).

### Etkileşimler
- Klan etiketi ile tarama (`Enter` veya buton), canlı yenileme (`force_refresh=true`), tur seçimi, kadro filtresi (`cwl` | `all`), oyuncu satırında akordeon aç/kapa (`Enter` / `Space` / tıklama), detay içinde `Saldırı` / `Savunma` sekme geçişi, ordu seçeneği pill'leri, `"Orduyu Kopyala"` linki.

### Responsive Davranış
- **1440px & 768px (`md:` ve üzeri):** `hidden md:block` ile 6 sütunlu masaüstü tablosu görünür (`#`, Oyuncu, Tahmini Ordu, Kaynak/İstatistik, Süper Birlik, İşlem).
- **390px (`< md`):** `md:hidden` ile 2 satırlı mobil kart listesi görünür; üst form `flex-col sm:flex-row`.

### Sorunlar
- Altın referanslardaki `GamePanel` / `.game-window-frame` yerine krem pencere içinde düz `bg-[#EFE8DA]` ve `bg-white/75` kartlar/tablolar kullanılıyor.
- Yükleme iskeletinde ortak `SkeletonBlock` yerine özel `animate-pulse` div'leri yazılmış.

---

## 7. Cevher Analizi (`#/cevher`, `#/ore`)

- **Rota:** `#/cevher`, `#/ore` (`frontend/src/app/page.tsx`)
- **Ana Bileşen:** `OreCalculatorView` (`frontend/src/components/ore/OreCalculatorView.tsx`)
- **Bağımlı Bileşenler:** `UnitIcon`, `oreSimulation.ts` (`estimateOreTimeline`, `calculateEquipmentOreDeficit`), `equipmentCosts.ts`, `gemIncomeConfig.ts` (`LEAGUE_TIERS`)

### Paneller (Dıştan İçe)
1. **Dış Pencere (`AppShell` → `GameWindow variant="cream"`):** Krem pencere.
2. **Ana Parşömen Çalışma Yüzeyi (`bg-[#FFFDF8] border-[#D4C9B8] rounded-2xl`):**
   - **Bölüm 1 — Üst Başlık & Hedef BB Şeridi (`<header>`):** Başlık (`t.ore.title`), `TH11–TH18` seçici butonları, `smithCapLabel`, içe aktarılan oyuncu rozeti (`importedPlayer.name`, `tag`, `townHallLevel`) + `"Sıfırla"` butonu.
   - **Bölüm 2 — Sol Sütun (`lg:col-span-5` — Simülasyon Ayarları):**
     1. Mevcut Cevher Envanteri (`shiny`, `glowy`, `starry` inputları).
     2. Lig Kademesi & Günlük Yıldız Bonusu (`LEAGUE_TIERS` `<select>` + günlük `OreBadge` özetleri).
     3. Klan Savaşı Slider & Galibiyet Kazancı (`monthlyCwCount`, `cwWinCount`, savaş başı özel ödül inputları).
     4. CWL Katılım & Madalya/Ödül Düzenleyici.
     5. Baskın Madalyası & Haftalık Tüccar (Trader).
     6. Etkinlik Bileti & Gelecek Epik Ekipman Tahmini.
   - **Bölüm 3 — Sağ Sütun (`lg:col-span-7` — Projeksiyon & İhtiyaçlar):**
     - (a) Ana Tamamlama Projeksiyonu (`estimated.daysToComplete`, `estimated.targetDateStr`, darboğaz hapı).
     - (b) Cevher Bazlı Darboğaz Karşılaştırması (3 adet ilerleme çubuğu).
     - (c) Senaryo Karşılaştırması (`minScenario`, `estimated`, `maxScenario`) & Net Gereken Cevher İhtiyacı (`netNeedCards`).
     - (d) Günlük ve Periyodik Gelir Dağılımı (mobilde kartlar, masaüstünde `<table>`).
   - **Bölüm 4 — İçe Aktarılan Ekipmanlar (`importedPlayer` varsa):**
     - `activeDeficitAndItems.items[]` ızgarası (`UnitIcon`, nadirlik, `level → targetLevel`, `shiny`/`glowy`/`starry` eksikliği).
- **Veri Kaynağı:** Tamamen istemci tarafı hesaplama (`oreSimulation.ts`, `equipmentCosts.ts`, `gemIncomeConfig.ts`) + opsiyonel `PlayerProfileView`'dan aktarılan `importedPlayer` prop'u (`townHallLevel`, `leagueTierId`, `heroEquipment[]`).

### Durumlar
- `normal`: Her zaman varsayılan değerlerle çalışır.
- `loading` / `error`: Yok (senkron istemci hesaplaması).
- `empty`: `importedPlayer` yoksa Bölüm 4 gizlenir; tüm cevherler tamamsa `"Bugün Tamamlandı"` (`isCompletedToday`) durumu gösterilir.

### Etkileşimler
- TH11–TH18 butonları, sayısal inputlar, lig `<select>`, range slider'lar, toggle switch'ler (`ParchmentSwitch`), `"Simülasyonu Sıfırla"`, `"Oyuncuyu Kaldır"`.

### Responsive Davranış
- **1440px (xl) & 1024px (lg):** 12 sütunlu 2 kolonlu düzen (`lg:grid-cols-12`, sol 5 / sağ 7); gelir tablosu `hidden md:block` ile masaüstü tablosu; ekipmanlar `lg:grid-cols-3 xl:grid-cols-4`.
- **768px (md):** Tek sütuna iner (`grid-cols-1`), **sağ sütun üstte (`order-1 lg:order-2`), ayarlar altta (`order-2 lg:order-1`)**; gelir tablosu masaüstü görünümünde kalır.
- **390px (< sm):** TH butonları `grid-cols-4`; senaryo & net ihtiyaç kartları tek sütun; gelir dağılımı `md:hidden` ile mobil kartlara geçer.

### Sorunlar
- Altın referanslardaki `GamePanel` / ahşap/koyu oyuk dili yerine düz beyaz-parşömen SaaS kartı (`bg-[#FFFDF8] border-[#D4C9B8]`) kullanılıyor; oyun arayüzü butonları (`GameButton`) veya `IconFrame` yerine özel düz butonlar ve `UnitIcon` kullanılmış.

---

## 8. Duvar Yazısı (`#/duvar`, `#/duvaryazisi`, `#/wall`) — *[Altın Referans 2]*

- **Rota:** `#/duvar`, `#/duvaryazisi`, `#/wall` (`frontend/src/app/page.tsx`)
- **Ana Bileşen:** `WallArtView` (`frontend/src/components/wall/WallArtView.tsx`)
- **Bağımlı Bileşenler:** `GameTabBar`, `GameTab`, `GameButton`, `wallArtEngine.ts`, `bitmapFonts`, `assetsConfig.ts`

### Paneller (Dıştan İçe)
1. **Dış Pencere (`AppShell` → `GameWindow variant="bare"`):** Şeffaf sarmalayıcı.
2. **Ana Ahşap Pencere Çerçevesi (`.game-window-frame`):**
   - Üst Şerit (`.game-tab-strip`): `GameTabBar` + aktif `GameTab` (`t.nav.wall`) + sağda `"Planı İndir"` (`GameButton variant="green"`).
   - Başlık Satırı: `t.wall.title`, `t.wall.subtitle`.
   - Metin & Duvar Bütçesi Satırı (`bg-[#1A120C] border-2 border-[#4E3120]`): 35 karakterlik metin inputu + duvar sayısı inputu (1–2000).
   - Açılır Bitmap Font Seçici (`bg-[#1A120C] border-2 border-[#4E3120]`): `BitmapFontPreview` önizlemeli font kartları.
   - Ayarlar Çubuğu (`bg-[#1A120C] border-2 border-[#4E3120]`): Ölçek slider, harf aralığı slider, otomatik sığdır checkbox, açılır gelişmiş ayarlar çekmecesi (`convertTurkish`, `preserveThinLines`, `showDebugGrid`, `show2dSceneryBg`, konum sıfırla).
   - Duvar Bütçesi Sayacı (`bg-[#1A120C] border-2 border-[#4E3120]`): Kullanılan/maksimum duvar + yüzde rozeti + ilerleme çubuğu.
   - Etkileşimli 3D/2D Kanvas Görünümü (`max-w-[1100px] border-2 border-[#4E3120]`): 3D sahne + izometrik duvarlar veya 2D 44×44 ızgara, masaüstünde 4 köşede `.game-btn-panel-green` kaydırma okları, yakınlaştırma/sıfırlama/imleç modu/2D-3D araç çubuğu, `"Önizleme İndir"` (`GameButton variant="gold"`), `"Rehberi Kopyala"` (`GameButton variant="blue"`).
   - Açılır Satır Bazlı İnşa Rehberi (`isGuideOpen` iken `bg-[#1A120C]`).
   - Açılır Sahne Seçici (`.game-panel-wood` benzeri kahve gradient başlık + `bg-[#160E09]` thumbnail ızgarası).
   - Özet İstatistik Şeridi (`wallCount`, `maxWalls`, sınırlar, harf yüksekliği, hover satır/sütun) & Uyarı Bandı (`bg-[#2B120E] border-red-800/80`).
- **Veri Kaynağı:** Tamamen istemci tarafı (`computeWallArt`, `getAllBitmapFonts`, `ASSETS_CONFIG`, `localStorage["wallart.scenery"]`).

### Durumlar
- `sceneryLoading`: Kanvas üzerinde dönen yükleme kaplaması.
- `error` / uyarılar: Eksik font uyarısı, bütçe aşımı / ızgara taşması / desteklenmeyen karakter uyarı bandı.
- `normal`: Canlı 3D/2D kanvas ve rehber.

### Etkileşimler
- Kanvas üzerinde sürükle-bırak (metin taşıma veya sahne kaydırma), tekerlek ile zoom, klavye ok tuşları (`handleKeyDown`), basılı tutarak kaydırma (`useHoldAction`), akordeon font/gelişmiş/rehber/sahne çekmeceleri, PNG dışa aktarma, panoya kopyalama.

### Responsive Davranış
- **1440px (lg) & 768px (md/sm):** Kanvas üzerinde `hidden sm:block` ile 4 köşede kaydırma okları; sahne seçici `sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8`; rehber `sm:grid-cols-2 lg:grid-cols-3`.
- **390px (< sm):** Kanvas `aspect-[16/10]` engelsiz; kaydırma okları `flex sm:hidden` ile kanvas altı araç çubuğuna taşınır; font seçici tek sütun (`grid-cols-1`).

### Sorunlar
- Altın referanstır.

---

## 9. Geliştirici UI Vitrini (`/dev/game-ui`)

- **Rota:** `/dev/game-ui` (`frontend/src/app/dev/game-ui/page.tsx`)
- **Ana Bileşen:** `GameUIShowcasePage`
- **Bağımlı Bileşenler:** `GameButton`, `GamePanel`, `GameTabBar`, `GameTab`, `LevelBadge`, `IconFrame`, `StatPill`
- **Paneller:** `AppShell` olmadan `bg-[#1F140D]` üzerinde 5 vitrin bölümü (`GameButton`, `GameTabBar`, 4 `GamePanel` varyantı, `IconFrame`, `StatPill`). Statik demo verisi gösterir; responsive olarak `md:grid-cols-2` ve `flex-wrap` kullanır.

---

## Ortak Bileşenler Tablosu

| Bileşen Adı | Dosya Yolu | Props | Varyantlar | Kullanıldığı Sayfalar / Bileşenler |
| --- | --- | --- | --- | --- |
| `AppShell` | `frontend/src/components/shell/AppShell.tsx` | `activeTab`, `onTabChange`, `variant?`, `children` | `variant`: `"cream"` \| `"bare"` (varsayılan: `home`/`search`/`cwl`/`ore` → `"cream"`, `meta`/`wall` → `"bare"`) | Ana SPA (`frontend/src/app/page.tsx`) — tüm 8 ana görünümü sarar |
| `GameHeaderTabs` | `frontend/src/components/shell/GameHeaderTabs.tsx` | `activeTab`, `onTabChange`, `variant?`, `className?` | `variant`: `"cream"` \| `"bare"` | `AppShell` (masaüstü `hidden lg:block`) |
| `MobileNav` | `frontend/src/components/shell/MobileNav.tsx` | `activeTab`, `onTabChange`, `className?` | — (alt çubuk + "Daha Fazla" alt çekmecesi) | `AppShell` (mobil `lg:hidden`) |
| `GameWindow` | `frontend/src/components/game/GameWindow.tsx` | `variant?`, `children`, `...HTMLDivElement` | `variant`: `"cream"` (varsayılan) \| `"bare"` | `AppShell` |
| `GamePanel` | `frontend/src/components/game/GamePanel.tsx` | `variant?`, `title?`, `headerRight?`, `headerClassName?`, `onHeaderClick?`, `bodyClassName?`, `insetWell?`, `children` | `variant`: `"wood"` (varsayılan) \| `"blue"` \| `"dark"` \| `"cream"` | `MetaDashboardView`, `/dev/game-ui` |
| `SectionPanel` | `frontend/src/components/game/SectionPanel.tsx` | `title?`, `icon?`, `rightBadge?`, `children`, `...HTMLDivElement` | — (tek mavi-gri `.game-section-panel`) | `PlayerProfileView`, `PlayerHeaderSection`, `PlayerArmySection`, `PlayerBattleLogSection`, `BuilderBaseSection` |
| `GameButton` | `frontend/src/components/game/GameButton.tsx` | `variant?`, `size?`, `icon?`, `href?`, `target?`, `rel?`, `disabled?`, `children` | `variant`: `"green"` \| `"blue"` \| `"red"` \| `"gold"`; `size`: `"sm"` \| `"md"` \| `"lg"` | `MetaDashboardView`, `WallArtView`, `PlayerProfileView`, `PlayerHeaderSection`, `PlayerArmySection`, `PlayerBattleLogSection`, `ClanDetailsView`, `ClanHeaderCard`, `ClanWarLogModal`, `ScoutedArmyCard`, `/dev/game-ui` |
| `GameTabBar` / `GameTab` | `frontend/src/components/game/GameTab.tsx` | `GameTabBar`: `children`; `GameTab`: `active?`, `icon?`, `children` | `active`: `true` \| `false` | `MetaDashboardView`, `WallArtView`, `/dev/game-ui` |
| `GameInput` | `frontend/src/components/game/GameInput.tsx` | `prefixTag?` (varsayılan `"#"`), `containerClassName?`, `...InputHTMLAttributes` | — | `PlayerSearchView`, `ScoutedArmyCard` |
| `GraySegmented` | `frontend/src/components/game/GraySegmented.tsx` | `items`, `activeId`, `onChange`, `className?` | — | `SearchHubView`, `PlayerProfileView`, `ClanDetailsView` |
| `IconFrame` | `frontend/src/components/game/IconFrame.tsx` | `name?`, `village?`, `count?`, `level?`, `maxLevel?`, `isMax?`, `size?`, `tileType?`, `rarity?`, `iconUrl?`, `className?`, `showTooltip?` | `size`: `"xs"` \| `"sm"` \| `"md"` \| `"lg"` \| `"unit"` \| `"hero"` \| `"equipment"` \| `"pet"`; `tileType`: `"elixir"` \| `"dark-elixir"` \| `"spell"` \| `"siege"` \| `"super"` \| `"hero"` \| `"equipment"` \| `"pet"`; `rarity`: `"common"` \| `"rare"` \| `"epic"` \| `"legendary"` | `MetaDashboardView`, `PlayerArmySection`, `PlayerBattleLogSection`, `BuilderBaseSection`, `ScoutedArmyCard`, `/dev/game-ui` |
| `LevelBadge` | `frontend/src/components/game/LevelBadge.tsx` | `level`, `isMax?`, `compact?`, `className?` | `isMax`: `true` \| `false`; `compact`: `true` \| `false` | `IconFrame`, `/dev/game-ui` |
| `StatPill` | `frontend/src/components/game/StatPill.tsx` | `icon?`, `label?`, `value`, `variant?`, `...HTMLDivElement` | `variant`: `"default"` \| `"blue"` \| `"copper"` \| `"purple"` \| `"amber"` \| `"green"` | `MetaDashboardView`, `ScoutedArmyCard`, `/dev/game-ui` |
| `TownHallImage` | `frontend/src/components/game/TownHallImage.tsx` | `level`, `weaponLevel?`, `className?`, `size?` (varsayılan `120`) | — | `PlayerArmySection`, `ClanMemberList`, `ScoutedArmyCard` |
| `ClanBadge` | `frontend/src/components/game/ClanBadge.tsx` | `url?`, `name?`, `size?` (varsayılan `48`), `className?` | — | `ClanSearchView`, `PlayerHeaderSection`, `ClanHeaderCard` |
| `SkeletonBlock` | `frontend/src/components/game/SkeletonBlock.tsx` | `height?`, `width?`, `className?`, `...HTMLDivElement` | — | `MetaDashboardView`, `PlayerSearchView`, `ClanSearchView`, `PlayerProfileView`, `ClanDetailsView` |
| `UnitIcon` | `frontend/src/components/common/UnitIcon.tsx` | `name`, `village?`, `level?`, `maxLevel?`, `count?`, `size?`, `iconUrl?`, `isSuper?`, `isEpic?`, `className?`, `showNameBelow?` | `size`: `"xs"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"` | `OreCalculatorView` |

---

## Güncelleme — Stitch Tasarım Uygulaması Sonrası (Faz 0–7)

- **Dış Kabuk & Pencere:** `AppShell` (`home`, `search`, `cwl`, `ore` için `GameWindow variant="wood"`) ve `game-theme.css` (`--game-window-*` + `--ui-*` alias token'ları, `.ui-*` opak sınıfları) ile tüm sayfalar Meta & Ordu ahşap paletine hizalandı; `meta` ve `wall` görünümleri `variant="bare"` ile birebir korundu.
- **Yeni Eklenen Sayfa Bileşenleri:**
  - `home/`: `WoodStatusBanner`, `ToolLauncherCard`
  - `search/`: `RecentTagChip`
  - `player/`: `AccordionSection`
  - `clan/`: `WoodDataTable`, `ResponsiveMemberList`
  - `cwl/`: `CwlRosterCard`, `ScoutedSummaryBar`
  - `ore/`: `OreDeficitCard`, `ProgressBarWood`
