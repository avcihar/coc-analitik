# Stitch MCP Araçları Keşif Raporu (`STITCH_TOOLS.md`)

Bu belge, `C:\Users\avcih\.gemini\antigravity\mcp\stitch\` klasöründeki `instructions.md` ve 18 adet araç şema (`*.json`) dosyası doğrudan okunarak hazırlanmıştır. **Hiçbir Stitch MCP aracı çalıştırılmamıştır.**

---

## 1. Erişim Durumu ve Genel Bakış

* **Erişim Durumu:** `C:\Users\avcih\.gemini\antigravity\mcp\stitch\` dizinindeki `instructions.md` ve 18 JSON şema dosyasının tamamına **erişildi ve okundu**.
* **Sunucu Özeti (`instructions.md`):** Stitch MCP sunucusu, metin ve görsellerden UI tasarımları ve frontend kodu üreten yapay zekâ tabanlı Stitch platformu (`https://stitch.withgoogle.com`) ile proje ve ekran yönetimi sağlar.

---

## 2. Sunulan Tüm Stitch MCP Araçları (18 Araç)

### 2.1. Proje Yönetimi

| Araç Adı | Açıklama | Parametreler (`REQ` = zorunlu, `opt` = opsiyonel) |
| :--- | :--- | :--- |
| **`create_project`** | Yeni bir Stitch projesi (UI tasarımları ve frontend kodu kapsayıcısı) oluşturur. | • `title` (`opt`, `string`): Proje başlığı |
| **`get_project`** | Belirli bir projenin detaylarını ve ekran örneklerini (`screenInstances`) getirir. | • `name` (`REQ`, `string`): `projects/{project}` formatında proje kaynak adı |
| **`list_projects`** | Kullanıcının erişebildiği projeleri en son güncellenene göre listeler. | • `filter` (`opt`, `string`): Örn. `view=owned` (varsayılan) veya `view=shared`<br>• `pageSize` (`opt`, `integer`): Sayfa başı kayıt (varsayılan 50, maks. 100)<br>• `pageToken` (`opt`, `string`): Sayfalama belirteci |
| **`update_project`** | Projenin üst verilerini (`title`, `background_theme`, `visibility`) veya tuval ekran yerleşimlerini (`screenInstances`: `x`, `y`, `width`, `height`, `label`, `hidden`, `groupId` vb.) günceller. | • `name` (`REQ`, `string`): `projects/{project}`<br>• `title` (`opt`, `string`)<br>• `backgroundTheme` (`opt`, `string`)<br>• `visibility` (`opt`, `string`, enum: `VISIBILITY_UNSPECIFIED`, `PUBLIC`, `PRIVATE`)<br>• `screenInstances` (`opt`, `array` of `ScreenInstance`)<br>• `updateMask` (`opt`, `array` of `string`) |
| **`delete_project`** | Projeyi kalıcı olarak siler (geri alınamaz). | • `name` (`REQ`, `string`): `projects/{project}` |

### 2.2. Ekran Listeleme, Okuma, Güncelleme ve İndirme

| Araç Adı | Açıklama | Parametreler |
| :--- | :--- | :--- |
| **`list_screens`** | Bir Stitch projesi içindeki tüm ekranları listeler. | • `projectId` (`REQ`, `string`): `projects/` öneki olmadan proje ID |
| **`get_screen`** | Belirli bir ekranın detaylarını (`html_code`, `screenshot` kaynak adları vb.) getirir. | • `name` (`REQ`, `string`): `projects/{project}/screens/{screen}` |
| **`update_screen`** | Mevcut bir ekranın HTML kodunu veya ekran görüntüsünü (PNG) günceller. | • `name` (`REQ`, `string`): `projects/{project}/screens/{screen}`<br>• `htmlCodeBase64` (`opt`, `string`): Base64 kodlu HTML<br>• `screenshotBase64` (`opt`, `string`): Base64 kodlu PNG ekran görüntüsü<br>• `updateMask` (`opt`, `array` of `string`: `"html_code"`, `"screenshot"`) |
| **`download_file`** | Bir ekranın HTML kodunu veya ekran görüntüsünü indirir (`download_url` doğrudan kullanılmamalıdır). | • `name` (`REQ`, `string`): `projects/{project}/files/{file}` (ekranın `html_code.name` veya `screenshot.name` alanından alınır) |

### 2.3. Yapay Zekâ ile Ekran Üretme ve Düzenleme

| Araç Adı | Açıklama | Parametreler |
| :--- | :--- | :--- |
| **`generate_screen_from_text`** | Metin isteminden (prompt) proje içinde yeni bir ekran üretir. | • `projectId` (`REQ`, `string`)<br>• `prompt` (`REQ`, `string`): Ekranı tanımlayan metin<br>• `designSystem` (`opt`, `string`): `assets/{id}` formatında tasarım sistemi ID<br>• `deviceType` (`opt`, `string`, enum: `DEVICE_TYPE_UNSPECIFIED`, `MOBILE`, `DESKTOP`, `TABLET`, `AGNOSTIC`)<br>• `modelId` (`opt`, `string`, enum: `MODEL_ID_UNSPECIFIED`, `GEMINI_3_8_FLASH`, `GEMINI_3_5_FLASH_LITE`) |
| **`edit_screens`** | Mevcut ekranları metin istemi kullanarak düzenler. | • `projectId` (`REQ`, `string`)<br>• `prompt` (`REQ`, `string`)<br>• `selectedScreenIds` (`REQ`, `array` of `string`): `screens/` öneki olmadan ekran ID listesi<br>• `deviceType` (`opt`, enum)<br>• `modelId` (`opt`, enum) |
| **`generate_variants`** | Mevcut ekranların varyantlarını üretir. | • `projectId` (`REQ`, `string`)<br>• `prompt` (`REQ`, `string`)<br>• `selectedScreenIds` (`REQ`, `array` of `string`)<br>• `variantOptions` (`REQ`, `object` — `VariantOptions`: `variantCount` [1–5, varsayılan 3], `creativeRange` [`REFINE`, `EXPLORE`, `REIMAGINE`], `aspects` [`LAYOUT`, `COLOR_SCHEME`, `IMAGES`, `TEXT_FONT`, `TEXT_CONTENT`])<br>• `deviceType` (`opt`, enum)<br>• `modelId` (`opt`, enum) |

### 2.4. Tasarım Sistemi (Design System) ve `DESIGN.md` Yönetimi

| Araç Adı | Açıklama | Parametreler |
| :--- | :--- | :--- |
| **`list_design_systems`** | Projeye ait (veya `projectId` boşsa global) tasarım sistemlerini listeler. | • `projectId` (`opt`, `string`) |
| **`create_design_system`** | Yeni tasarım sistemi oluşturur (renk, font, köşe yuvarlaklığı, görünüm, `designMd`). Sonrasında `update_design_system` çağrılması önerilir. | • `designSystem` (`REQ`, `object` — `displayName`, `theme`: `colorMode` [`LIGHT`/`DARK`], `headlineFont`, `bodyFont`, `labelFont`, `roundness` [`ROUND_TWO`..`ROUND_FULL`], `customColor` [hex], `colorVariant`, `overridePrimary/Secondary/Tertiary/NeutralColor`, `spacing`, `typography`, `designMd`)<br>• `projectId` (`opt`, `string`) |
| **`update_design_system`** | Mevcut tasarım sistemini günceller. | • `name` (`REQ`, `string`): `assets/{asset_id}`<br>• `projectId` (`REQ`, `string`)<br>• `designSystem` (`REQ`, `object`) |
| **`apply_design_system`** | Seçili ekran örneklerine bir tasarım sistemini uygular. | • `assetId` (`REQ`, `string`): `assets/` öneki olmadan ID<br>• `projectId` (`REQ`, `string`)<br>• `selectedScreenInstances` (`REQ`, `array` of `{id, sourceScreen}`) |
| **`upload_design_md`** | Bir `DESIGN.md` dosyasını Stitch projesine yükler. | • `projectId` (`REQ`, `string`)<br>• `designMdBase64` (`REQ`, `string`): Geçerli UTF-8 metnin base64 kodlanmış hali |
| **`create_design_system_from_design_md`** | `upload_design_md` ile yüklenen `DESIGN.md` üzerinden tasarım sistemi oluşturur. | • `projectId` (`REQ`, `string`)<br>• `selectedScreenInstance` (`REQ`, `object`)<br>• `deviceType` (`opt`, enum) |

---

## 3. Görsel / Referans Yükleme, Çıktı Biçimleri ve Sınırlar

### 3.1. Görsel veya Referans Yükleme Desteği
* **`generate_screen_from_text`, `edit_screens`, `generate_variants`:** Şemalarda **görsel/referans dosya yükleme parametresi YOKTUR**. Bu 3 üretim/düzenleme aracı yalnızca metin `prompt` (ve varsa `designSystem` / `selectedScreenIds`) kabul eder. (`instructions.md` web arayüzünün metin ve görselden üretebildiğini belirtse de MCP üretim araçlarında görsel girişi tanımlı değildir.)
* **`update_screen`:** `screenshotBase64` parametresi ile mevcut bir ekranın PNG ekran görüntüsünü güncelleyebilir (üretim için referans girişi değil, ekranın kendi görselini kaydetmek içindir).
* **`upload_design_md`:** `designMdBase64` ile yalnızca UTF-8 metin/Markdown (`DESIGN.md`) yüklemeyi destekler.

### 3.2. Çıktı Biçimleri
* **`download_file` Çıktısı:**
  * **HTML:** `html` alanında ham HTML kodu döner (Tailwind/CSS içeren frontend kodu).
  * **Görsel (Screenshot):** `image` alanında base64 kodlu görsel baytları ve `image_metadata` (`mime_type`, `width`, `height`) döner.
* **Figma Desteği:** MCP araç şemalarında doğrudan Figma dışa aktarma veya `.fig` çıktısı veren bir araç/parametre **bulunmamaktadır**.

### 3.3. Sınırlar ve Operasyonel Kısıtlar
* **Model Seçenekleri:** `GEMINI_3_8_FLASH` ve `GEMINI_3_5_FLASH_LITE` (şemalarda tanımlı enum değerleri).
* **Cihaz Türleri:** `MOBILE`, `DESKTOP`, `TABLET`, `AGNOSTIC`.
* **Varyant Sayısı:** `generate_variants` tek çağrıda **1–5** arası varyant üretir (varsayılan 3).
* **Sayfalama:** `list_projects` varsayılan 50, en fazla **100** proje/sayfa döner.
* **Zaman Aşımı & Tekrar Çağrı Yasağı:** `generate_screen_from_text`, `edit_screens` ve `generate_variants` birkaç dakika sürebilir; şema talimatları **"DO NOT RETRY"** uyarısı verir ve zaman aşımında `get_screen` ile 30 saniyede bir en fazla 10 kez yoklama yapılmasını önerir.
* **Font Enum Kısıtı (`create_design_system`):** `headlineFont`, `bodyFont`, `labelFont` alanları sabit bir enum listesiyle (örn. `PLUS_JAKARTA_SANS`, `INTER`, `RUBIK`, `OPEN_SANS`, `MONTSERRAT`, `JETBRAINS_MONO` vb.) sınırlıdır; özel/yerel oyun fontları (ör. `Lilita One`, `Fredoka`) bu enum'da yer almaz (ancak `typography.fontFamily` string alanında veya `designMd` içinde belirtilebilir).
