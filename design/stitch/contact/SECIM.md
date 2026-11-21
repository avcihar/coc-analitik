# Seçim Formu

Her grup için `design/stitch/contact/` altındaki kontak görsellerini inceleyip seçiminizi aşağıdaki tabloya işaretleyin (ör. `A`, `Alt1`, `Alt2` veya `Krem B`).

| Grup | Mobil seçim (A / Alt1 / Alt2 / Krem) | Masaüstü seçim (A / Alt1 / Alt2 / Krem) | Not |
|---|---|---|---|
| **1. Ana Sayfa** ([görsel](ana-sayfa.png)) | ALt1 | Alt2 | |
| **2. Meta Ordular** ([görsel](meta-ordular.png)) *(Referans)* | A | A | |
| **3. Kullanım İstatistikleri** ([görsel](kullanim-istatistikleri.png)) *(Referans)* | Alt1 | A | |
| **4. Oyuncu Ara** ([görsel](oyuncu-ara.png)) | Alt2 | Alt1 | Masaüstü seçimimde Klan Ara panelinin Alt2 referans alınsın |
| **5. Oyuncu Profili** ([mobil](oyuncu-profili-mobil.png) · [masaustu](oyuncu-profili-masaustu.png)) | A | Alt2| |
| **6. Klan Ara** ([görsel](klan-ara.png)) | Alt2 | Alt2 | |
| **7. Klan Detayı** ([mobil](klan-detay-mobil.png) · [masaustu](klan-detay-masaustu.png)) | A | Alt1 | |
| **8. CWL Keşif** ([görsel](cwl-kesif.png)) | Alt1 | Alt1 | |
| **9. Cevher Analizi** ([görsel](cevher-analizi.png)) | A | A | |
| **10. Duvar Yazısı** ([görsel](duvar-yazisi.png)) *(Referans)* | Alt2 | Alt2 | |

> **Önemli İpucu:** Meta & Ordu ve Duvar Yazısı kod olarak değişmeyecek, bu iki grup yalnızca referans: onları görsel olarak beğendiğin düzene göre seç; kodda mevcut hâlleri kalır.

---

## Grup Betimleri ve Dikkat Edilecekler (`AUDIT.md` & `COMPONENT_MAP.md`)

1. **Ana Sayfa** — *Ana Sayfa — araç kartları, son aranan oyuncu ve hızlı arama*
   - **Dikkat (`ana-sayfa-mobil-A`, `-alt1`, `-alt2`, `-B`):** Stitch mobilde istenmeyen `CANLI` rozeti ve `Sıralama` sekmesi eklemiş; bazı kart başlık/açıklamalarında `truncate` ve `<44px` düğme (`py-1`/`h-10`) var. `ToolLauncherCard` ve `WoodStatusBanner` yeni bileşen olarak kodlanacak.
   - **Dikkat (`ana-sayfa-masaustu-A`, `-alt1`, `-alt2`):** Alt 2'de `truncate` var; üst gezinme ve `ToolLauncherCard` ızgarası temiz.

2. **Meta Ordular** *(Referans — kod değişmez)* — *Meta & Ordu — en çok kazanan ordular (TH18/TH17) sekmesi*
   - **Dikkat:** `TH18/TH17` filtresi ve sekme düzeni altın referansla uyumlu; `meta-ordular-mobil-A`, `-alt1` ve `-masaustu-A-alt2` içinde birkaç `<44px` (`h-8`) düğme ve mobilde `truncate` işaretlendi.

3. **Kullanım İstatistikleri** *(Referans — kod değişmez)* — *Meta & Ordu — kullanım istatistikleri (birlik/büyü/kahraman)*
   - **Dikkat:** `kullanim-istatistikleri-mobil-A-alt1` ve `-alt2` ekranlarında istenmeyen `Sıralama` kelimesi ve tüm varyantlarda `truncate` var.

4. **Oyuncu Ara** — *Oyuncu & Klan — oyuncu etiketi ile arama ve etiket rehberi*
   - **Dikkat:** Stitch `'Etiketini Nerede Bulursun?'` rehber kartını ve son aranan etiket çiplerini (`TagFormatGuideCard`, `RecentTagChip`) eklemiş; `oyuncu-ara-masaustu-A-alt2` içinde `py-1` düğmeler ve `truncate` var.

5. **Oyuncu Profili** — *Oyuncu Profili — özet, kahramanlar, ekipmanlar, birlikler, büyüler*
   - **Dikkat:** Tüm varyantlarda yer yer `truncate` ve `ProgressBarWood` yeni bileşeni var; `oyuncu-profili-mobil-B` içinde `<44px` (`h-10`/`py-1`) düğmeler tespit edildi. Krem alternatif (`B`) yalnızca bu sayfa, Ana Sayfa ve Klan Detayı için üretildi.

6. **Klan Ara** — *Oyuncu & Klan — klan adı ve filtrelerle klan arama*
   - **Dikkat:** `klan-ara-mobil-A-alt1/2` ve tüm masaüstü varyantlarında `Sıralama` kelimesi (sıralama filtresi) ve mobilde `<44px` (`h-10`/`h-8`) düğmeler mevcut; `truncate` işaretlendi.

7. **Klan Detayı** — *Klan Detayı — klan özeti, savaş istatistikleri ve üye tablosu*
   - **Dikkat:** Tüm varyantlarda `Sıralama` sütun/etiketi var; masaüstü varyantlarında `a:py-1` (`<44px`) bağlantılar ve `WoodDataTable`/`ResponsiveMemberList` yeni bileşeni gerekiyor.

8. **CWL Keşif** — *CWL Keşif — rakip klan kadrosu ve keşfedilen ordular*
   - **Dikkat:** `cwl-kesif-mobil-A`, `-alt1`, `-alt2` içinde `<44px` (`h-10`/`select:py-1`) öğeler ve `truncate` var; yeni `CwlRosterCard` / `ScoutedSummaryBar` sarmalayıcısı gerekir.

9. **Cevher Analizi** — *Cevher Analizi — kahraman ekipman cevher planı ve süre tahmini*
   - **Dikkat:** `cevher-analizi-mobil-*` içinde `<44px` (`h-6 p-0`) küçük adım düğmeleri ve tüm ekranlarda `truncate` var; yeni `OreDeficitCard` ve `ProgressBarWood` gerekir.

10. **Duvar Yazısı** *(Referans — kod değişmez)* — *Duvar Yazısı — 44×44 ana köy duvar piksel yazı/çizim düzenleyici*
    - **Dikkat:** Kanvas için CSS `background-image` ızgara/SVG deseni kullanılmış (harici görsel yok); birkaç `<44px` kontrol düğmesi/input (`h-8`/`h-10`/`p-0`) işaretlendi.
