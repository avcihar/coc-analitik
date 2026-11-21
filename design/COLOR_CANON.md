# Kanon Panel Paleti (`design/COLOR_CANON.md`)

> **İlke:** Her arayüz rolü için tek kanon ton/gradyan tanımlanır. Tüm `--ui-*` alias token'ları yeni hex tanımlamadan mevcut `--game-*` token'larına `var(...)` ile bağlanır. Mevcut `--game-*` değerleri değiştirilmez; Meta & Ordu ve Duvar Yazısı görünümleri birebir korunur.

---

## 1. Rol Bazlı Kanon Palet Tablosu

| Rol | Alias Token (`--ui-*`) | Bağlandığı `--game-*` Token'ı | Karşılık Gelen Hex / Gradyan | Not |
|---|---|---|---|---|
| **Ana Pencere Çerçevesi** | `--ui-window-bg`, `--ui-window-border` | `--game-window-top/mid/bot`, `--game-window-border` | `linear-gradient(180deg, #5A3A28 0%, #4A2E1E 50%, #3B2214 100%)`, border `#28160C` | Meta `.game-window-frame` ile birebir aynı değerler |
| **Sekme Şeridi** | `--ui-tab-strip`, `--ui-tab-strip-border` | `--game-slot-bg-dark`, `--game-wood-header-border` | `#342219`, alt çizgi `#24140C` | Opak koyu ahşap şerit |
| **Aktif Sekme** | `--ui-tab-active-bg`, `--ui-tab-active-border` | `--game-wood-mid`, `--game-wood-header-border` | `#6E4D3A`, kenarlık `#24140C` | Gövdeyle birleşik aktif sekme |
| **Pasif Sekme** | `--ui-tab-inactive-bg`, `--ui-tab-inactive-border` | `--game-dark-box-dark`, `--game-dark-box-border` | `#1D150F`, kenarlık `#120C08` | Opak (`opacity: 1`) |
| **Ahşap Kart / Panel** | `--ui-panel-bg`, `--ui-panel-border`, `--ui-panel-shadow` | `--game-wood-light/mid/dark`, `--game-wood-border`, `--game-wood-shadow` | `linear-gradient(180deg, #7E5B47 0%, #6E4D3A 40%, #583929 100%)`, border `#2C180E` | **Tek ahşap kart tonu** (bkz. Bölüm 2) |
| **Panel Başlığı** | `--ui-panel-header-bg`, `--ui-panel-header-border` | `--game-wood-header-light/dark`, `--game-wood-header-border` | `linear-gradient(180deg, #5E3F32 0%, #462C22 100%)`, border `#24140C` | Tüm kart/akordeon başlıkları |
| **Bölüm Paneli (`SectionPanel`)** | `--ui-section-bg`, `--ui-section-border` | `--game-wood-light/mid/dark`, `--game-wood-border` | `--ui-panel-bg` ile tek tona indirildi (`#7E5B47 → #583929`) | `Meta`/`Duvar` `SectionPanel` kullanmaz |
| **İç Oyuk (`Well`)** | `--ui-well-bg`, `--ui-well-border` | `--game-slot-bg-dark/light`, `--game-slot-border` | `linear-gradient(180deg, #342219 0%, #443026 100%)`, border `#22140D` | Birlik/büyü/özet yuvaları |
| **Koyu Bilgi Kutusu** | `--ui-info-bg`, `--ui-info-border` | `--game-dark-box-light/mid/dark`, `--game-dark-box-border` | `linear-gradient(180deg, #382B22 0%, #2A1F17 50%, #1D150F 100%)`, border `#120C08` | Yarı saydam `rgba(...,0.78)` yerine **tam opak** |
| **StatPill** | `--ui-pill-bg`, `--ui-pill-border`, `--ui-pill-text` | `--game-dark-box-dark`, `--game-pill-border`, `--game-pill-text` | `#1D150F`, border `#3A2317`, metin `#FFFFFF` | Meta dışı sayfalarda opak |
| **Giriş Alanı (`Input` / `Select`)** | `--ui-input-bg`, `--ui-input-border`, `--ui-input-text` | `--game-dark-box-dark`, `--game-wood-border`, `--game-pill-text` | `#1D150F`, border `#2C180E`, metin `#FFFFFF` (veya `GameInput` beyazı `#FFFFFF`) | Yarı saydam `bg-[#FAF6EE]/65` kaldırılır |
| **Düğme — Yeşil** | `--ui-btn-green` | `--game-btn-green-top/mid/bot/border` | `#9CE04A → #72BD36 → #519E23`, border `#142E06` | Birincil eylem |
| **Düğme — Altın** | `--ui-btn-gold` | `--game-btn-gold-top/mid/bot/border` | `#FFEB75 → #F8C12C → #DB930D`, border `#382101` | Vurgulu eylem |
| **Düğme — Gri** | `--ui-btn-gray` | `--game-btn-gray-top/mid/bot/border` | `#C4BDB1 → #9C9488 → #7B746A`, border `#1F1B17` | İkincil / pasif eylem |
| **Düğme — Mavi** | `--ui-btn-blue` | `--game-btn-blue-top/mid/bot/border` | `#6ED3F7 → #2898C8 → #1A7198`, border `#0A222E` | Bilgi / kopyala |
| **Düğme — Kırmızı** | `--ui-btn-red` | `--game-btn-red-top/mid/bot/border` | `#FF6E75 → #EB2830 → #C61318`, border `#330305` | Yıkıcı / kapat |
| **Alt Gezinme & Üst Çubuk** | `--ui-nav-bg`, `--ui-nav-border` | `--game-dark-box-dark`, `--game-wood-header-border` | `#1D150F`, border `#24140C` | `backdrop-blur` ve `0.92/0.95` alfa **kaldırılır**, tam opak |

---

## 2. Ahşap Kart Tonunun Tekleştirilmesi

Projede iki farklı ahşap/bronz kart gradyanı bulunuyordu:
1. `.game-panel-wood`: `#7E5B47 → #6E4D3A → #583929` (Meta & Ordu kartları)
2. `.game-section-panel` / `.game-panel-blue`: `#5E4634 → #4E3828 → #3E2B1E` (Oyuncu Profili bölümleri)

**Karar:** Tüm kart ve bölüm panelleri **`.game-panel-wood`** (`--game-wood-light/mid/dark`) tonuna indirildi.
**Neden:** Meta & Ordu altın referans sayfasındaki kartların tamamı `--game-wood-*` gradyanını kullanır ve koyu pencere çerçevesi (`#5E4634 → #3E2B1E`) üzerinde daha net görsel ayrışma sağlar. `SectionPanel` yalnızca Oyuncu Profili'nde kullanıldığı için `Meta` ve `Duvar` sayfalarını etkilemez.

---

## 3. Şeffaflıkların Kaldırılması

Arka plan resminin (`background.webp`) panel tonunu bozmaması için Meta/Duvar dışındaki tüm panellerde:
- `backdrop-blur-*` sınıfları kaldırılır (`AppShell` mobil üst çubuk, `MobileNav`, `ClanWarLogModal` vb.).
- `bg-[#...]/55`, `bg-[#...]/65`, `bg-[#...]/75`, `bg-white/75`, `bg-[#...]/92` gibi yarı saydam sınıflar opak `--ui-*` sınıflarıyla değiştirilir.
- `opacity-90` / `opacity-85` gibi tüm paneli şeffaflaştıran sınıflar kaldırılır (`disabled` durumları hariç).
