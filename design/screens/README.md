# Ekran Görüntüleri (`design/screens/`)

Tüm ekran görüntüleri masaüstü (`1440px` genişlik, `fullPage: true`) ve mobil (`390px` genişlik, `fullPage: true`) görünümlerde, Chrome headless + CDP üzerinden `next dev` + FastAPI backend çalışırken alınmıştır.

## Dosya Listesi ve Açıklamaları

- `home-1440-normal.png` — Ana Sayfa (`/#/home`), masaüstü (1440px) normal görünümü.
- `home-390-normal.png` — Ana Sayfa (`/#/home`), mobil (390px) normal görünümü.
- `search-player-1440-empty.png` — Oyuncu & Klan arama ekranı (`/#/oyuncu`), masaüstü (1440px) oyuncu arama boş durumu.
- `search-player-390-empty.png` — Oyuncu & Klan arama ekranı (`/#/oyuncu`), mobil (390px) oyuncu arama boş durumu.
- `search-clan-1440-empty.png` — Oyuncu & Klan arama ekranı (`/#/klan`), masaüstü (1440px) klan arama boş durumu.
- `search-clan-390-empty.png` — Oyuncu & Klan arama ekranı (`/#/klan`), mobil (390px) klan arama boş durumu.
- `player-1440-normal.png` — Oyuncu profili (`#P89PCUPUQ`), masaüstü (1440px) normal veri yüklü görünümü.
- `player-390-normal.png` — Oyuncu profili (`#P89PCUPUQ`), mobil (390px) normal veri yüklü görünümü.
- `player-1440-loading.png` — Oyuncu profili, masaüstü (1440px) iskelet yükleme (loading) durumu.
- `player-1440-error.png` — Oyuncu profili (`#INVALID`), masaüstü (1440px) geçersiz etiket hata durumu.
- `player-390-error.png` — Oyuncu profili (`#INVALID`), mobil (390px) geçersiz etiket hata durumu.
- `clan-1440-normal.png` — Klan görünümü (`#UUJL8CYP`), masaüstü (1440px) normal veri yüklü görünümü.
- `clan-390-normal.png` — Klan görünümü (`#UUJL8CYP`), mobil (390px) normal veri yüklü görünümü.
- `clan-1440-loading.png` — Klan görünümü, masaüstü (1440px) iskelet yükleme (loading) durumu.
- `clan-1440-error.png` — Klan görünümü (`#INVALID`), masaüstü (1440px) geçersiz etiket hata durumu.
- `clan-390-error.png` — Klan görünümü (`#INVALID`), mobil (390px) geçersiz etiket hata durumu.
- `meta-armies-1440-normal.png` — Meta & Ordu (`/#/meta?tab=armies`), masaüstü (1440px) "Meta Ordular" sekmesi normal görünümü.
- `meta-armies-390-normal.png` — Meta & Ordu (`/#/meta?tab=armies`), mobil (390px) "Meta Ordular" sekmesi normal görünümü.
- `meta-armies-1440-loading.png` — Meta & Ordu (`/#/meta?tab=armies`), masaüstü (1440px) yükleme (loading) durumu.
- `meta-stats-1440-normal.png` — Meta & Ordu (`/#/meta?tab=stats`), masaüstü (1440px) "Kullanım İstatistikleri" sekmesi normal görünümü.
- `meta-stats-390-normal.png` — Meta & Ordu (`/#/meta?tab=stats`), mobil (390px) "Kullanım İstatistikleri" sekmesi normal görünümü.
- `cwl-1440-normal.png` — CWL Keşif (`/#/cwl`), masaüstü (1440px) varsayılan klan (`#2PP`) yüklü normal görünümü.
- `cwl-390-normal.png` — CWL Keşif (`/#/cwl`), mobil (390px) varsayılan klan (`#2PP`) yüklü normal görünümü.
- `cwl-1440-error.png` — CWL Keşif (`#INVALID`), masaüstü (1440px) geçersiz klan etiketi hata durumu.
- `cwl-390-error.png` — CWL Keşif (`#INVALID`), mobil (390px) geçersiz klan etiketi hata durumu.
- `ore-1440-normal.png` — Cevher Analizi (`/#/cevher`), masaüstü (1440px) normal görünümü.
- `ore-390-normal.png` — Cevher Analizi (`/#/cevher`), mobil (390px) normal görünümü.
- `wall-1440-normal.png` — Duvar Yazısı (`/#/duvar`), masaüstü (1440px) normal görünümü.
- `wall-390-normal.png` — Duvar Yazısı (`/#/duvar`), mobil (390px) normal görünümü.
- `dev-game-ui-1440-normal.png` — `/dev/game-ui` UI tasarım sistemi vitrini, masaüstü (1440px) normal görünümü.
- `dev-game-ui-390-normal.png` — `/dev/game-ui` UI tasarım sistemi vitrini, mobil (390px) normal görünümü.

## Alınamayan / Kapsam Dışı Kalan Durumlar

- **CWL boş (empty) durumu**: `#/cwl` sayfası açılışta varsayılan olarak `#2PP` klanını otomatik keşfettiği için ilk açılışta boş durum oluşmamaktadır; kullanıcı gerekirse input alanını temizleyip özel bir boş durum tasarlayabilir veya mevcut `cwl-*-normal.png` / `cwl-*-error.png` üzerinden ilerleyebilir.
- **390px yükleme (loading) ve CWL yükleme durumları**: Yükleme (skeleton) durumları `1440px` için (`player-1440-loading.png`, `clan-1440-loading.png`, `meta-armies-1440-loading.png`) yakalanmıştır; 390px mobil yükleme ekranları ve CWL loading ekranı ayrıca alınmamıştır (gerekirse kullanıcı mobilde ağ yavaşlatma ile alabilir).
- **Klan arama sonuç listesi (dolu arama durumu) / Oyuncu İnşaatçı Üssü sekmesi / Savaş Geçmişi modalı**: İstenen ana rotaların tümü alınmıştır; etkileşimli alt modallar (ör. Klan Savaş Geçmişi modalı) veya arama sonuç listesi istenirse kullanıcı tarafından alınabilir.
