# Stitch HTML Denetim Raporu (`design/stitch/AUDIT.md`)

> **Kapsam:** `design/stitch/screens/` altındaki tüm **65 HTML dosyası** otomatik tarama ile denetlenmiştir. Bu rapor yalnızca bulguları belgeler; hiçbir HTML dosyası veya uygulama kodu değiştirilmemiştir.

## 1. Genel Özet (65 Ekran)

| Kriter | Bulgu Özeti | Durum |
|---|---|---|
| **a) İstenmeyen metin / etiket (`CANLI`, `Sıralama`)** | 18 ekranda tespit edildi (`ana-sayfa-mobil-*` içinde `CANLI`/`Sıralama`, `klan-ara-*` ve `klan-detay-*` ile `kullanim-istatistikleri-mobil-A-alt1/2` içinde `Sıralama` kelimesi) | Uyarı (uygulama aşamasında ayıklanmalı) |
| **b) Küçük dokunma hedefleri (`< 44px` şüphesi)** | 29 ekranda `h-6`/`h-8`/`h-10`/`py-1`/`p-0` sınıfı taşıyan `<button>`, `<a>`, `<input>` veya `<select>` öğesi bulundu (ör. masaüstü alt bar/tablo/stepper düğmeleri ve bazı mobil kompakt düğmeler) | Uyarı (React uygulamasında `min-h-[44px]` zorunlu) |
| **c) `<img>`, `background-image` ve dış URL** | `<img>` etiketi: **0** ekranda. `background-image`: **6** `duvar-yazisi-*` ekranında (yalnızca CSS ızgara/SVG data-URI). Dış URL: **3** `duvar-yazisi-mobil-*` ekranında yalnızca `http://www.w3.org/2000/svg` namespace URI'si. Harici fotoğraf/AI görsel **YOK** | Temiz |
| **d) Font ve ikon kütüphaneleri** | Fontlar: `Material Symbols Outlined, Plus Jakarta Sans`. İkonlar: Material Symbols Outlined (**189** benzersiz ikon adı) | Bilgi (uygulamada `lucide-react` + yerel font eşlemesi gerekir) |
| **e) Metin kesilmesi (`truncate` / `...`)** | 48 ekranda `truncate`/`text-ellipsis` sınıfı veya `...`/`…` karakteri tespit edildi | Uyarı (uygulama aşamasında tam metin/wrap kontrolü) |
| **f) Yatay taşma şüphesi (`w-[>=400px]` / `min-w-[>=300px]`)** | Mobilde **0** ekranda sabit genişlik şüphesi; masaüstünde 32 ekranda beklenen masaüstü container genişlikleri (`max-w-[1200px]` vb.) | Mobilde Temiz |

## 2. Kriter (a) — İstenmeyen Metinler (`CANLI` / `Sıralama`)

Aşağıdaki 18 ekranda `CANLI` veya `Sıralama` kelimesi geçmektedir (`klan-ara` ve `klan-detay` içindeki `Sıralama` genellikle sıralama filtresi/sütun başlığıdır; `ana-sayfa-mobil-*` içindeki `CANLI` ve `Sıralama` ise istenmeyen yan rozetlerdir):

- `ana-sayfa-mobil-A-alt1`: CANLI
- `ana-sayfa-mobil-A-alt2`: CANLI
- `ana-sayfa-mobil-A`: CANLI, Sıralama
- `ana-sayfa-mobil-B`: CANLI, Sıralama
- `klan-ara-masaustu-A-alt1`: Sıralama
- `klan-ara-masaustu-A-alt2`: Sıralama
- `klan-ara-masaustu-A`: Sıralama
- `klan-ara-mobil-A-alt1`: Sıralama
- `klan-ara-mobil-A-alt2`: Sıralama
- `klan-detay-masaustu-A-alt1`: Sıralama
- `klan-detay-masaustu-A-alt2`: Sıralama
- `klan-detay-masaustu-A`: Sıralama
- `klan-detay-masaustu-B`: Sıralama
- `klan-detay-mobil-A-alt1`: Sıralama
- `klan-detay-mobil-A`: Sıralama
- `klan-detay-mobil-B`: Sıralama
- `kullanim-istatistikleri-mobil-A-alt1`: Sıralama
- `kullanim-istatistikleri-mobil-A-alt2`: Sıralama

## 3. Kriter (b) — `< 44px` Dokunma Hedefi Şüphesi Taşıyan Ekranlar

| Ekran | Şüpheli Öğe Sayısı | Örnek Sınıflar |
|---|---|---|
| `ana-sayfa-mobil-A-alt1` | 1 | `input:p-0` |
| `ana-sayfa-mobil-A` | 1 | `button:py-1` |
| `ana-sayfa-mobil-B` | 3 | `button:h-10, button:h-10, button:h-9` |
| `cevher-analizi-mobil-A-alt1` | 3 | `button:h-6 p-0, button:h-6 p-0, button:h-6 p-0` |
| `cevher-analizi-mobil-A-alt2` | 3 | `button:h-6 p-0, button:h-6 p-0, button:h-6 p-0` |
| `cevher-analizi-mobil-A` | 3 | `button:h-6 p-0, button:h-6 p-0, button:h-6 p-0` |
| `cwl-kesif-mobil-A-alt1` | 1 | `button:h-10` |
| `cwl-kesif-mobil-A-alt2` | 15 | `button:h-10, input:h-10, button:h-10` |
| `cwl-kesif-mobil-A` | 2 | `button:h-10, select:py-1` |
| `duvar-yazisi-masaustu-A-alt1` | 3 | `input:p-0, button:py-1, button:py-1` |
| `duvar-yazisi-masaustu-A-alt2` | 11 | `input:p-0, button:h-10, button:h-10` |
| `duvar-yazisi-masaustu-A` | 1 | `input:p-0` |
| `duvar-yazisi-mobil-A-alt1` | 5 | `button:h-8, button:h-8, input:h-1` |
| `duvar-yazisi-mobil-A-alt2` | 10 | `button:h-10, input:h-1, input:h-1` |
| `duvar-yazisi-mobil-A` | 10 | `button:h-10, input:h-1, input:h-1` |
| `klan-ara-masaustu-A-alt1` | 5 | `button:py-1, button:py-1, button:py-1` |
| `klan-ara-masaustu-A-alt2` | 10 | `select:py-1, select:py-1, input:p-0` |
| `klan-ara-mobil-A-alt1` | 5 | `button:h-10, button:h-8, button:h-8` |
| `klan-ara-mobil-A-alt2` | 1 | `button:h-10` |
| `klan-ara-mobil-A` | 1 | `button:h-10` |
| `klan-detay-masaustu-A-alt1` | 9 | `a:py-1, a:py-1, a:py-1` |
| `klan-detay-masaustu-A-alt2` | 7 | `a:py-1, a:py-1, a:py-1` |
| `klan-detay-masaustu-A` | 6 | `a:py-1, a:py-1, a:py-1` |
| `klan-detay-mobil-A-alt1` | 1 | `button:py-1` |
| `meta-ordular-masaustu-A-alt2` | 4 | `button:h-8, button:h-8, button:h-8` |
| `meta-ordular-mobil-A-alt1` | 1 | `button:h-8` |
| `meta-ordular-mobil-A` | 1 | `button:h-8` |
| `oyuncu-ara-masaustu-A-alt2` | 3 | `button:py-1, button:py-1, button:py-1` |
| `oyuncu-profili-mobil-B` | 3 | `button:h-10, button:py-1, button:py-1` |

## 4. Tüm 65 Ekranın Ayrıntılı Denetim Tablosu

| Ekran | a) İstenmeyen | b) `<44px` | c) `<img>` / `bg-img` | d) Benzersiz İkon | e) `truncate` / `...` | f) Genişlik / `<table>` |
|---|---|---|---|---|---|---|
| `ana-sayfa-masaustu-A-alt1` | — | 0 | 0 / 0 | 12 | 0 / 0 | 4 / 0 |
| `ana-sayfa-masaustu-A-alt2` | — | 0 | 0 / 0 | 12 | 0 / 1 | 4 / 0 |
| `ana-sayfa-masaustu-A` | — | 0 | 0 / 0 | 11 | 0 / 0 | 4 / 0 |
| `ana-sayfa-mobil-A-alt1` | CANLI | 1 | 0 / 0 | 19 | 7 / 0 | 0 / 0 |
| `ana-sayfa-mobil-A-alt2` | CANLI | 0 | 0 / 0 | 20 | 16 / 1 | 0 / 0 |
| `ana-sayfa-mobil-A` | CANLI, Sıralama | 1 | 0 / 0 | 19 | 18 / 0 | 0 / 0 |
| `ana-sayfa-mobil-B` | CANLI, Sıralama | 3 | 0 / 0 | 19 | 1 / 0 | 0 / 0 |
| `cevher-analizi-masaustu-A-alt1` | — | 0 | 0 / 0 | 15 | 8 / 0 | 3 / 0 |
| `cevher-analizi-masaustu-A-alt2` | — | 0 | 0 / 0 | 13 | 8 / 0 | 3 / 0 |
| `cevher-analizi-masaustu-A` | — | 0 | 0 / 0 | 13 | 8 / 0 | 3 / 0 |
| `cevher-analizi-mobil-A-alt1` | — | 3 | 0 / 0 | 20 | 10 / 0 | 0 / 0 |
| `cevher-analizi-mobil-A-alt2` | — | 3 | 0 / 0 | 23 | 8 / 0 | 0 / 0 |
| `cevher-analizi-mobil-A` | — | 3 | 0 / 0 | 19 | 6 / 0 | 0 / 0 |
| `cwl-kesif-masaustu-A-alt1` | — | 0 | 0 / 0 | 29 | 0 / 0 | 3 / 0 |
| `cwl-kesif-masaustu-A-alt2` | — | 0 | 0 / 0 | 28 | 5 / 0 | 3 / 0 |
| `cwl-kesif-masaustu-A` | — | 0 | 0 / 0 | 28 | 0 / 0 | 3 / 0 |
| `cwl-kesif-mobil-A-alt1` | — | 1 | 0 / 0 | 32 | 12 / 0 | 0 / 0 |
| `cwl-kesif-mobil-A-alt2` | — | 15 | 0 / 0 | 30 | 15 / 0 | 0 / 0 |
| `cwl-kesif-mobil-A` | — | 2 | 0 / 0 | 31 | 7 / 0 | 0 / 0 |
| `duvar-yazisi-masaustu-A-alt1` | — | 3 | 0 / 2 | 16 | 2 / 0 | 3 / 0 |
| `duvar-yazisi-masaustu-A-alt2` | — | 11 | 0 / 2 | 18 | 0 / 0 | 3 / 0 |
| `duvar-yazisi-masaustu-A` | — | 1 | 0 / 2 | 16 | 0 / 0 | 3 / 0 |
| `duvar-yazisi-mobil-A-alt1` | — | 5 | 0 / 1 | 12 | 0 / 0 | 0 / 0 |
| `duvar-yazisi-mobil-A-alt2` | — | 10 | 0 / 1 | 13 | 0 / 0 | 0 / 0 |
| `duvar-yazisi-mobil-A` | — | 10 | 0 / 1 | 12 | 0 / 0 | 0 / 0 |
| `klan-ara-masaustu-A-alt1` | Sıralama | 5 | 0 / 0 | 14 | 4 / 0 | 4 / 0 |
| `klan-ara-masaustu-A-alt2` | Sıralama | 10 | 0 / 0 | 14 | 0 / 0 | 4 / 0 |
| `klan-ara-masaustu-A` | Sıralama | 0 | 0 / 0 | 14 | 0 / 0 | 4 / 0 |
| `klan-ara-mobil-A-alt1` | Sıralama | 5 | 0 / 0 | 13 | 4 / 1 | 0 / 0 |
| `klan-ara-mobil-A-alt2` | Sıralama | 1 | 0 / 0 | 15 | 8 / 0 | 0 / 0 |
| `klan-ara-mobil-A` | — | 1 | 0 / 0 | 9 | 3 / 0 | 0 / 0 |
| `klan-detay-masaustu-A-alt1` | Sıralama | 9 | 0 / 0 | 15 | 1 / 0 | 3 / 1 |
| `klan-detay-masaustu-A-alt2` | Sıralama | 7 | 0 / 0 | 7 | 1 / 0 | 3 / 1 |
| `klan-detay-masaustu-A` | Sıralama | 6 | 0 / 0 | 6 | 0 / 0 | 3 / 1 |
| `klan-detay-masaustu-B` | Sıralama | 0 | 0 / 0 | 16 | 1 / 0 | 4 / 1 |
| `klan-detay-mobil-A-alt1` | Sıralama | 1 | 0 / 0 | 11 | 19 / 0 | 0 / 0 |
| `klan-detay-mobil-A-alt2` | — | 0 | 0 / 0 | 17 | 7 / 0 | 0 / 0 |
| `klan-detay-mobil-A` | Sıralama | 0 | 0 / 0 | 9 | 7 / 0 | 0 / 0 |
| `klan-detay-mobil-B` | Sıralama | 0 | 0 / 0 | 13 | 7 / 0 | 0 / 0 |
| `kullanim-istatistikleri-masaustu-A-alt1` | — | 0 | 0 / 0 | 32 | 10 / 0 | 3 / 0 |
| `kullanim-istatistikleri-masaustu-A-alt2` | — | 0 | 0 / 0 | 31 | 12 / 0 | 3 / 0 |
| `kullanim-istatistikleri-masaustu-A` | — | 0 | 0 / 0 | 32 | 10 / 0 | 3 / 0 |
| `kullanim-istatistikleri-mobil-A-alt1` | Sıralama | 0 | 0 / 0 | 31 | 22 / 0 | 0 / 0 |
| `kullanim-istatistikleri-mobil-A-alt2` | Sıralama | 0 | 0 / 0 | 31 | 24 / 0 | 0 / 0 |
| `kullanim-istatistikleri-mobil-A` | — | 0 | 0 / 0 | 31 | 22 / 0 | 0 / 0 |
| `meta-ordular-masaustu-A-alt1` | — | 0 | 0 / 0 | 25 | 0 / 0 | 3 / 0 |
| `meta-ordular-masaustu-A-alt2` | — | 4 | 0 / 0 | 24 | 0 / 0 | 3 / 0 |
| `meta-ordular-masaustu-A` | — | 0 | 0 / 0 | 24 | 0 / 0 | 3 / 0 |
| `meta-ordular-mobil-A-alt1` | — | 1 | 0 / 0 | 28 | 4 / 0 | 0 / 0 |
| `meta-ordular-mobil-A-alt2` | — | 0 | 0 / 0 | 27 | 5 / 0 | 0 / 0 |
| `meta-ordular-mobil-A` | — | 1 | 0 / 0 | 27 | 4 / 0 | 0 / 0 |
| `oyuncu-ara-masaustu-A-alt1` | — | 0 | 0 / 0 | 13 | 4 / 0 | 4 / 0 |
| `oyuncu-ara-masaustu-A-alt2` | — | 3 | 0 / 0 | 15 | 4 / 0 | 3 / 0 |
| `oyuncu-ara-masaustu-A` | — | 0 | 0 / 0 | 12 | 4 / 0 | 4 / 0 |
| `oyuncu-ara-mobil-A-alt1` | — | 0 | 0 / 0 | 14 | 4 / 0 | 0 / 0 |
| `oyuncu-ara-mobil-A-alt2` | — | 0 | 0 / 0 | 13 | 0 / 0 | 0 / 0 |
| `oyuncu-ara-mobil-A` | — | 0 | 0 / 0 | 8 | 0 / 0 | 0 / 0 |
| `oyuncu-profili-masaustu-A-alt1` | — | 0 | 0 / 0 | 46 | 9 / 0 | 3 / 0 |
| `oyuncu-profili-masaustu-A-alt2` | — | 0 | 0 / 0 | 47 | 6 / 0 | 3 / 0 |
| `oyuncu-profili-masaustu-A` | — | 0 | 0 / 0 | 46 | 6 / 0 | 3 / 0 |
| `oyuncu-profili-masaustu-B` | — | 0 | 0 / 0 | 43 | 16 / 0 | 3 / 0 |
| `oyuncu-profili-mobil-A-alt1` | — | 0 | 0 / 0 | 28 | 20 / 0 | 0 / 0 |
| `oyuncu-profili-mobil-A-alt2` | — | 0 | 0 / 0 | 27 | 18 / 0 | 0 / 0 |
| `oyuncu-profili-mobil-A` | — | 0 | 0 / 0 | 29 | 6 / 0 | 0 / 0 |
| `oyuncu-profili-mobil-B` | — | 3 | 0 / 0 | 41 | 16 / 0 | 0 / 0 |
