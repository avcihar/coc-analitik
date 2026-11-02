import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.api.client import CoCAPIClient
from services.workers.leaderboard import (
    fetch_top_leaderboard_players,
    fetch_profiles_for_rankings,
    analyze_meta_statistics,
)

async def run_25():
    client = CoCAPIClient()
    try:
        print("Fetching top 25 players from official rankings...")
        players = await fetch_top_leaderboard_players(client, top_n=25)
        print(f"Fetched {len(players)} players from leaderboard.")

        print("Fetching profiles and battlelogs...")
        profiles = await fetch_profiles_for_rankings(client, players)
        print(f"Fetched {len(profiles)} full profiles.")

        stats = analyze_meta_statistics(profiles)
        print("\n=== METRİKLER ===")
        print(f"Toplam Oyuncu Analiz Edildi: {stats.get('totalPlayersAnalyzed')}")
        print(f"Toplam Savas Analiz Edildi: {stats.get('totalBattlesAnalyzed')}")

        print("\n=== EVCIL HAYVAN KULLANIM ORANLARI (PICK RATE %) ===")
        pet_usage = stats.get("petUsage", [])
        if not pet_usage:
            print("Evcil hayvan verisi bulunamadi (Ranked saldiri kaydi yok).")
        for p in pet_usage:
            avg_str = f"Lv.{p.get('avgLevel')} ({p.get('levelSource')})" if p.get('avgLevel') else "Yok"
            print(f" - {p.get('name')}: %{p.get('pickRatePct')} (Kullanim: {p.get('count')}, {avg_str})")

        print("\n=== KAHRAMAN BAZLI EVCIL HAYVAN KULLANIMI ===")
        by_hero = stats.get("petUsageByHero", {})
        for h_name, p_list in by_hero.items():
            if p_list:
                print(f" * {h_name}:")
                for p in p_list:
                    print(f"    - {p.get('name')}: %{p.get('pickRatePct')} (Adet: {p.get('count')})")

        print("\n=== AKTIF SUPER BIRLIK KULLANIM ORANLARI (PICK RATE %) ===")
        st_usage = stats.get("superTroopUsage", [])
        if not st_usage:
            print("Super birlik verisi bulunamadi.")
        for st in st_usage:
            print(f" - {st.get('name')}: %{st.get('pickRatePct')} (Kullanim: {st.get('count')})")

        st_names = [st.get("name") for st in st_usage]
        is_rocket_present = "Rocket Balloon" in st_names
        print(f"\nRocket Balloon Süper Birlik Listesinde mi?: {is_rocket_present} (Beklenen: False)")

        # Verify not 100%
        all_100 = len(pet_usage) > 0 and all(p.get("pickRatePct") == 100.0 for p in pet_usage)
        print(f"Tüm Petler %100 mü?: {all_100} (Beklenen: False)")

    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(run_25())
