# İkon, Font ve İndirilecek Varlık Listesi (`design/stitch/ICON_AND_FONT_LIST.md`)

> **Not:** `lucide-react` önerileri Stitch çıktılarındaki Material Symbols Outlined adlarından türetilmiştir ve paketin kurulu sürümünde (`^0.424.0`) export edilip edilmediği tek tek **[doğrulanmamıştır]**.

## 1. Fontlar (Stitch HTML Çıktıları vs Proje Durumu)

| Font Adı | Stitch HTML'deki Kaynak | Projedeki Durum (`design/ASSET_NEEDS.md`) | Eylem |
|---|---|---|---|
| `Plus Jakarta Sans` | Google Fonts CDN (`fonts.googleapis.com`) | Kurumsal/UI ana fontu olarak mevcut | Yerel veya mevcut `next/font` kurulumunu koru |
| `Material Symbols Outlined` | Google Fonts CDN (`fonts.googleapis.com`) | Projede kullanılmıyor (`lucide-react` `^0.424.0` kullanılıyor) | Uygulamada `lucide-react` ikonlarına dönüştür |
| `LilitaOne-Regular.ttf` | Stitch'te yok (yerel proje kuralı) | `PROJECT_RULES.md` gereği yerel dosya olarak korunur | Silme / değiştirme |

## 2. İndirilecek Oyun Varlıkları ve Hedef Klasörler (`design/ASSET_NEEDS.md` Özeti)

> AI ile üretilmiş görsel/ikon KULLANILMAZ; Supercell görselleri hotlink edilmez. Kullanıcı kendi dosyalarını aşağıdaki klasörlere koyar:

| Varlık Türü | Hedef Klasör | Kullanım Yeri |
|---|---|---|
| Genel UI & Kaynak İkonları | `frontend/public/icons/ui/` | İksir, kara iksir, altın, kupa, yıldız |
| Cevher İkonları (Shiny, Glowy, Starry) | `frontend/public/icons/ores/` | Cevher Analizi ve ekipman kartları |
| Belediye Binası Görselleri (TH11–TH18) | `frontend/public/town-halls/` | `TownHallImage`, profil, klan, CWL, meta |
| Lig Rozetleri | `frontend/public/icons/leagues/` | Oyuncu profili ve klan arama/detay |
| Duvar Seviyesi Görselleri | `frontend/public/walls/` | Duvar Yazısı (`wall/*` — altın referans) |

## 3. Stitch HTML'lerinde Geçen Tüm Material Symbols Adları (189 Benzersiz İkon)

| # | Material Symbols Adı | Önerilen `lucide-react` Karşılığı *(doğrulanmadı)* |
|---|---|---|
| 1 | `ac_unit` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 2 | `add` | `Plus` *(doğrulanmadı)* |
| 3 | `adjust` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 4 | `air` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 5 | `analytics` | `BarChart3` *(doğrulanmadı)* |
| 6 | `anchor` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 7 | `architecture` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 8 | `arrow_downward` | `ArrowDown` *(doğrulanmadı)* |
| 9 | `arrow_drop_down` | `ChevronDown` *(doğrulanmadı)* |
| 10 | `arrow_forward` | `ArrowRight` *(doğrulanmadı)* |
| 11 | `arrow_upward` | `ArrowUp` *(doğrulanmadı)* |
| 12 | `aspect_ratio` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 13 | `auto_awesome` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 14 | `auto_fix` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 15 | `auto_fix_high` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 16 | `bar_chart` | `BarChart2` *(doğrulanmadı)* |
| 17 | `bolt` | `Zap` *(doğrulanmadı)* |
| 18 | `bomb` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 19 | `border_all` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 20 | `border_outer` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 21 | `bubble_chart` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 22 | `build` | `Wrench` *(doğrulanmadı)* |
| 23 | `calendar_month` | `Calendar` *(doğrulanmadı)* |
| 24 | `campaign` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 25 | `car_crash` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 26 | `castle` | `Castle` *(doğrulanmadı)* |
| 27 | `celebration` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 28 | `chat` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 29 | `check` | `Check` *(doğrulanmadı)* |
| 30 | `check_circle` | `CheckCircle2` *(doğrulanmadı)* |
| 31 | `chevron_right` | `ChevronRight` *(doğrulanmadı)* |
| 32 | `close` | `X` *(doğrulanmadı)* |
| 33 | `construction` | `Hammer` *(doğrulanmadı)* |
| 34 | `content_copy` | `Copy` *(doğrulanmadı)* |
| 35 | `cottage` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 36 | `crisis_alert` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 37 | `crown` | `Crown` *(doğrulanmadı)* |
| 38 | `cruelty_free` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 39 | `delete` | `Trash2` *(doğrulanmadı)* |
| 40 | `delete_sweep` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 41 | `diamond` | `Gem` *(doğrulanmadı)* |
| 42 | `download` | `Download` *(doğrulanmadı)* |
| 43 | `egg` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 44 | `electric_bolt` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 45 | `emoji_events` | `Trophy` *(doğrulanmadı)* |
| 46 | `event_available` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 47 | `event_note` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 48 | `expand_less` | `ChevronUp` *(doğrulanmadı)* |
| 49 | `expand_more` | `ChevronDown` *(doğrulanmadı)* |
| 50 | `experiment` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 51 | `explore` | `Compass` *(doğrulanmadı)* |
| 52 | `face` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 53 | `favorite` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 54 | `female` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 55 | `file_open` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 56 | `file_upload_off` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 57 | `filter_alt` | `Filter` *(doğrulanmadı)* |
| 58 | `filter_list` | `ListFilter` *(doğrulanmadı)* |
| 59 | `filter_vintage` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 60 | `flag` | `Flag` *(doğrulanmadı)* |
| 61 | `flare` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 62 | `flash_on` | `Zap` *(doğrulanmadı)* |
| 63 | `flight` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 64 | `flight_takeoff` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 65 | `flutter` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 66 | `flutter_dash` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 67 | `font_download` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 68 | `footprint` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 69 | `forest` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 70 | `format_list_bulleted` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 71 | `format_list_numbered` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 72 | `format_quote` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 73 | `fort` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 74 | `foundation` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 75 | `front_hand` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 76 | `full_hd` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 77 | `gpp_bad` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 78 | `grid_view` | `LayoutGrid` *(doğrulanmadı)* |
| 79 | `group` | `Users` *(doğrulanmadı)* |
| 80 | `groups` | `Users` *(doğrulanmadı)* |
| 81 | `groups_2` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 82 | `handshake` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 83 | `handyman` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 84 | `hardware` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 85 | `healing` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 86 | `health_and_safety` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 87 | `help` | `HelpCircle` *(doğrulanmadı)* |
| 88 | `history` | `History` *(doğrulanmadı)* |
| 89 | `history_edu` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 90 | `home` | `Home` *(doğrulanmadı)* |
| 91 | `home_work` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 92 | `hotel_class` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 93 | `hourglass_top` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 94 | `icecream` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 95 | `info` | `Info` *(doğrulanmadı)* |
| 96 | `insights` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 97 | `join` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 98 | `keyboard_arrow_down` | `ChevronDown` *(doğrulanmadı)* |
| 99 | `label` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 100 | `landslide` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 101 | `leaderboard` | `Trophy` *(doğrulanmadı)* |
| 102 | `lightbulb` | `Lightbulb` *(doğrulanmadı)* |
| 103 | `local_fire_department` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 104 | `local_pharmacy` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 105 | `local_shipping` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 106 | `location_on` | `MapPin` *(doğrulanmadı)* |
| 107 | `lock` | `Lock` *(doğrulanmadı)* |
| 108 | `lock_open` | `Unlock` *(doğrulanmadı)* |
| 109 | `magic_button` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 110 | `manage_search` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 111 | `menu_book` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 112 | `military_tech` | `Medal` *(doğrulanmadı)* |
| 113 | `mode_heat` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 114 | `monitoring` | `Activity` *(doğrulanmadı)* |
| 115 | `more_horiz` | `MoreHorizontal` *(doğrulanmadı)* |
| 116 | `nature` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 117 | `nature_people` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 118 | `north_east` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 119 | `north_west` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 120 | `paid` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 121 | `pan_tool` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 122 | `paragliding` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 123 | `park` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 124 | `person` | `User` *(doğrulanmadı)* |
| 125 | `person_search` | `UserSearch` *(doğrulanmadı)* |
| 126 | `pest_control` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 127 | `pets` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 128 | `pin_drop` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 129 | `precision_manufacturing` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 130 | `psychology` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 131 | `public` | `Globe` *(doğrulanmadı)* |
| 132 | `query_stats` | `TrendingUp` *(doğrulanmadı)* |
| 133 | `radar` | `Radar` *(doğrulanmadı)* |
| 134 | `raven` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 135 | `refresh` | `RefreshCw` *(doğrulanmadı)* |
| 136 | `remove` | `Minus` *(doğrulanmadı)* |
| 137 | `restart_alt` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 138 | `rocket_launch` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 139 | `roller_skating` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 140 | `rotate_left` | `RotateCcw` *(doğrulanmadı)* |
| 141 | `rotate_right` | `RotateCw` *(doğrulanmadı)* |
| 142 | `sanitizer` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 143 | `save_as` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 144 | `schedule` | `Clock` *(doğrulanmadı)* |
| 145 | `science` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 146 | `search` | `Search` *(doğrulanmadı)* |
| 147 | `search_check` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 148 | `security` | `Shield` *(doğrulanmadı)* |
| 149 | `severe_cold` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 150 | `shield` | `Shield` *(doğrulanmadı)* |
| 151 | `shield_lock` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 152 | `shield_person` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 153 | `shield_with_heart` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 154 | `skull` | `Skull` *(doğrulanmadı)* |
| 155 | `smart_toy` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 156 | `social_leaderboard` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 157 | `sort` | `ArrowUpDown` *(doğrulanmadı)* |
| 158 | `sound_detection_dog_barking` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 159 | `south_east` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 160 | `south_west` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 161 | `sports_baseball` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 162 | `sports_esports` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 163 | `sports_kabaddi` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 164 | `sports_martial_arts` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 165 | `sports_mma` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 166 | `star` | `Star` *(doğrulanmadı)* |
| 167 | `star_half` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 168 | `stars` | `Sparkles` *(doğrulanmadı)* |
| 169 | `swap_vert` | `ArrowUpDown` *(doğrulanmadı)* |
| 170 | `swords` | `Swords` *(doğrulanmadı)* |
| 171 | `sync` | `RefreshCw` *(doğrulanmadı)* |
| 172 | `tag` | `Hash` *(doğrulanmadı)* |
| 173 | `target` | `Target` *(doğrulanmadı)* |
| 174 | `thunderstorm` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 175 | `tips_and_updates` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 176 | `token` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 177 | `toys` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 178 | `travel_explore` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 179 | `trending_up` | `TrendingUp` *(doğrulanmadı)* |
| 180 | `trophy` | `Trophy` *(doğrulanmadı)* |
| 181 | `tune` | `SlidersHorizontal` *(doğrulanmadı)* |
| 182 | `unfold_more` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 183 | `update` | `RefreshCw` *(doğrulanmadı)* |
| 184 | `upgrade` | `ArrowUpCircle` *(doğrulanmadı)* |
| 185 | `verified` | `BadgeCheck` *(doğrulanmadı)* |
| 186 | `visibility` | `Eye` *(doğrulanmadı)* |
| 187 | `volunteer_activism` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
| 188 | `whatshot` | `Flame` *(doğrulanmadı)* |
| 189 | `workspace_premium` | *(eşleme/yer tutucu seçilmeli — doğrulanmadı)* |
