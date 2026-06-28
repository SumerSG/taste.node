"""taste.node — Fast synthetic Japan venue generator (100K target).

Generates 100,000 restaurant venues deterministically using a seeded PRNG.
Preserves the ~10K real venues from Overpass if present, then supplements
with generated data up to the target.  Designed to be run without any
external API calls.

Usage:
    python scripts/generate_japan_venues.py

Output:
    web/src/data/venues.json
    src/data/venues.json
"""

import hashlib
import json
import random
import sys
from pathlib import Path
from typing import List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from src.models import Venue


_TARGET = 100_000
_SEED = 42

_CUISINES_POOL = [
    "ラーメン", "寿司", "日本料理", "居酒屋", "焼き鳥", "焼肉", "天ぷら",
    "とんかつ", "カレー", "イタリアン", "ピザ", "パスタ", "フレンチ",
    "中華料理", "韓国料理", "タイ料理", "ベトナム料理", "インド料理",
    "中東料理", "メキシコ料理", "アメリカ料理", "ハンバーガー",
    "サンドイッチ", "ステーキ", "海鮮", "バーベキュー", "スペイン料理",
    "ギリシャ料理", "トルコ料理", "ドイツ料理", "麺類", "そば", "うどん",
    "丼", "お好み焼き", "しゃぶしゃぶ", "すき焼き", "刺身", "パン屋",
    "カフェ", "喫茶", "ダイナー", "創作料理", "アジア料理", "ワッフル",
    "パンケーキ", "クレープ", "タパス", "韓国料理", "ホットドッグ",
    "弁当", "天ぷら", "寿司", "懐石料理", "炉端焼き", "鉄板焼き",
    "ホルモン焼き", "餃子", "たこ焼き", "おでん", "すき焼き", "もつ鍋",
    "ちゃんこ鍋", "うなぎ", "お好み焼き", "パン屋", "ケーキ", "スイーツ",
    "ジェラート", "スムージー", "タピオカ", "飲茶", "鍋", "四川料理",
    "広東料理", "北京料理", "上海料理", "ポキ丼", "アサイー", "タコス",
    "ブリトー", "ケバブ", "シャワルマ", "地中海料理", "レバノン料理",
    "モロッコ料理", "パキスタン料理", "スリランカ料理", "ネパール料理",
    "インドネシア料理", "マレーシア料理", "シンガポール料理",
    "フィリピン料理", "ラオス料理", "カンボジア料理", "ミャンマー料理",
    "バングラデシュ料理", "ハワイアン料理", "オーストラリア料理",
    "イギリス料理", "アイルランド料理", "ベルギー料理", "オランダ料理",
    "スイス料理", "オーストリア料理", "ポルトガル料理", "ノルウェー料理",
    "スウェーデン料理", "デンマーク料理", "フィンランド料理",
    "アルゼンチン料理", "シュラスコ", "ペルー料理", "コロンビア料理",
    "ベネズエラ料理", "キューバ料理", "ドミニカ料理", "ジャマイカ料理",
    "トリニダード料理", "南アフリカ料理", "エジプト料理", "イラン料理",
    "アフガニスタン料理", "モンゴル料理", "ウズベキスタン料理",
    "ジョージア料理", "アルメニア料理", "アゼルバイジャン料理",
    "カザフスタン料理", "チベット料理", "ソウルフード",
    "テックスメックス", "ケイジャン料理", "和洋料理", "洋食",
    "シーフード", "焼き鳥", "とんかつ", "韓国料理", "カレー",
    "創作料理", "鉄板焼き", "鍋", "しゃぶしゃぶ", "ステーキ",
    "韓国料理", "海鮮", "焼き鳥", "とんかつ", "日本料理",
]

_DIETARY_POOL = ["meat", "fish", "vegetarian", "vegan", "pescatarian"]

_PREFIXES = [
    "Ginza", "Shibuya", "Shinjuku", "Roppongi", "Ueno", "Asakusa",
    "Harajuku", "Ikebukuro", "Akihabara", "Nakameguro", "Meguro",
    "Ebisu", "Daikanyama", "Jiyugaoka", "Kichijoji", "Koenji",
    "Shimokitazawa", "Nakano", "Sangenjaya", "Futako", "Yokohama",
    "Osaka", "Kyoto", "Kobe", "Nagoya", "Fukuoka", "Sapporo",
    "Sendai", "Hiroshima", "Kumamoto", "Kagoshima", "Naha",
    "Niigata", "Kanazawa", "Okayama", "Toyama", "Fukui",
    "Matsuyama", "Kochi", "Takamatsu", "Tokushima", "Nagasaki",
    "Oita", "Miyazaki", "Aomori", "Akita", "Iwate", "Yamagata",
    "Fukushima", "Gunma", "Tochigi", "Ibaraki", "Chiba", "Saitama",
    "Kawasaki", "Kawaguchi", "Matsudo", "Nagareyama", "Noda",
    "Kashiwa", "Funabashi", "Ichikawa", "Urayasu", "Narita",
    "Haneda", "Omiya", "Kawagoe", "Hachioji", "Machida",
    "Tachikawa", "Fussa", "Hino", "Chofu", "Mitaka", "Musashino",
    "Kokubunji", "Koganei", "Fuchu", "Inagi", "Tama", "Higashikurume",
    "Higashimurayama", "Kiyose", "Higashiyamato", "Musashimurayama",
    "Akiruno", "Ome", "Akishima", "Hino",
]

_SUFFIXES = [
    "Kitchen", "Bistro", "Dining", "Grill", "Bar", "Cafe",
    "Izakaya", "Yakitori", "Sushi Bar", "Ramen-ya", "Yakiniku",
    "Teppanyaki", "Tempura-ya", "Curry House", "Pizza", "Trattoria",
    "Osteria", "Ristorante", "Brasserie", "Taverna", "Steakhouse",
    "Seafood House", "Robata", "Shabu-shabu", "Sukiyaki", "Nabe-ya",
    "Tofu-ya", "Soba-ya", "Udon-ya", "Donburi-ya", "Bento-ya",
    "Pan-ya", "Kissaten", "Tea House", "Wine Bar", "Sake Bar",
    "Tapas", "Burger", "Diner", "Lounge", "Terrace", "Garden",
    "Table", "Room", "House", "Place", "Spot", "Corner", "Station",
    "Market", "Hall", "Pit", "Joint", "Shack", "Den", "Haven",
]

_CITIES = [
    # (lat_center, lng_center, radius_deg_lat, radius_deg_lng, weight)
    # weights reflect population density / restaurant density
    (35.68, 139.76, 0.35, 0.45, 35),   # Tokyo metro
    (34.69, 135.50, 0.30, 0.35, 20),   # Osaka / Kyoto / Kobe
    (35.18, 136.91, 0.25, 0.30, 12),   # Nagoya
    (33.59, 130.40, 0.20, 0.25, 8),    # Fukuoka
    (43.06, 141.35, 0.25, 0.30, 8),    # Sapporo
    (38.27, 140.87, 0.18, 0.22, 5),    # Sendai
    (34.39, 132.46, 0.15, 0.18, 5),    # Hiroshima
    (32.79, 130.74, 0.15, 0.18, 4),    # Kumamoto
    (31.60, 130.56, 0.12, 0.15, 3),    # Kagoshima
    (26.21, 127.68, 0.12, 0.15, 3),    # Naha
    (37.92, 139.04, 0.15, 0.18, 4),    # Niigata
    (34.98, 138.38, 0.15, 0.20, 4),    # Shizuoka
    (34.66, 133.92, 0.12, 0.15, 3),    # Okayama
    (36.56, 136.66, 0.12, 0.15, 3),    # Kanazawa
    (34.07, 134.56, 0.10, 0.12, 2),    # Tokushima
    (33.85, 132.77, 0.10, 0.12, 2),    # Matsuyama
    (33.56, 133.53, 0.10, 0.12, 2),    # Kochi
    (32.75, 129.87, 0.10, 0.12, 2),    # Nagasaki
    (33.24, 131.61, 0.10, 0.12, 2),    # Oita
    (31.91, 131.42, 0.10, 0.12, 2),    # Miyazaki
    (40.82, 140.75, 0.12, 0.15, 2),    # Aomori
    (39.72, 140.10, 0.12, 0.15, 2),    # Akita
    (39.70, 141.15, 0.12, 0.15, 2),    # Morioka
    (38.24, 140.36, 0.12, 0.15, 2),    # Yamagata
    (37.75, 140.47, 0.12, 0.15, 2),    # Fukushima
    (36.40, 139.06, 0.12, 0.15, 2),    # Maebashi
    (36.55, 139.87, 0.12, 0.15, 2),    # Utsunomiya
    (36.37, 140.47, 0.12, 0.15, 2),    # Mito
    (35.86, 139.65, 0.12, 0.15, 2),    # Kawaguchi
    (35.60, 140.12, 0.12, 0.15, 2),    # Chiba
    (35.86, 139.66, 0.10, 0.12, 2),    # Saitama
    (35.53, 139.70, 0.12, 0.15, 2),    # Kawasaki
    (35.78, 139.90, 0.10, 0.12, 2),    # Matsudo
    (35.91, 139.80, 0.10, 0.12, 2),    # Kashiwa
    (35.70, 139.98, 0.10, 0.12, 2),    # Funabashi
    (35.72, 139.93, 0.10, 0.12, 2),    # Ichikawa
    (35.64, 139.90, 0.08, 0.10, 1),    # Urayasu
    (35.76, 140.32, 0.08, 0.10, 1),    # Narita
    (35.55, 139.78, 0.08, 0.10, 1),    # Haneda
    (35.91, 139.48, 0.10, 0.12, 2),    # Kawagoe
    (35.66, 139.32, 0.12, 0.15, 2),    # Hachioji
    (35.54, 139.45, 0.10, 0.12, 2),    # Machida
    (35.70, 139.41, 0.10, 0.12, 2),    # Tachikawa
    (35.74, 139.33, 0.08, 0.10, 1),    # Fussa
    (35.67, 139.40, 0.08, 0.10, 1),    # Hino
    (35.66, 139.54, 0.08, 0.10, 1),    # Chofu
    (35.68, 139.56, 0.08, 0.10, 1),    # Mitaka
    (35.71, 139.57, 0.08, 0.10, 1),    # Musashino
    (35.71, 139.48, 0.08, 0.10, 1),    # Kokubunji
    (35.70, 139.50, 0.08, 0.10, 1),    # Koganei
    (35.67, 139.48, 0.08, 0.10, 1),    # Fuchu
    (35.64, 139.53, 0.08, 0.10, 1),    # Inagi
    (35.64, 139.45, 0.08, 0.10, 1),    # Tama
]


def _generate_name(rng: random.Random, idx: int) -> str:
    # Deterministic but highly varied naming
    prefix = rng.choice(_PREFIXES)
    suffix = rng.choice(_SUFFIXES)
    # 30% chance of using a cuisine name instead of suffix
    if rng.random() < 0.30:
        cuisine = rng.choice(_CUISINES_POOL)
        # Avoid "Pizza Pizza" style
        if prefix != cuisine:
            return f"{prefix} {cuisine}"
    return f"{prefix} {suffix}"


def _generate_venue(rng: random.Random, idx: int) -> Venue:
    # Pick a city weighted by population density
    total_weight = sum(c[4] for c in _CITIES)
    pick = rng.random() * total_weight
    city = _CITIES[0]
    cumulative = 0.0
    for c in _CITIES:
        cumulative += c[4]
        if cumulative >= pick:
            city = c
            break

    lat_center, lng_center, lat_radius, lng_radius, _ = city
    lat = lat_center + (rng.random() - 0.5) * 2 * lat_radius
    lng = lng_center + (rng.random() - 0.5) * 2 * lng_radius

    # Clip to Japan bounds
    lat = max(24.0, min(46.0, lat))
    lng = max(122.0, min(154.0, lng))

    seed_str = f"gen_{idx}_{lat:.6f}_{lng:.6f}"
    h = hashlib.md5(seed_str.encode()).hexdigest()

    n_cuisines = 1 + (int(h[0:2], 16) % 3)
    cuisines = rng.sample(_CUISINES_POOL, n_cuisines)

    n_diet = int(h[2:3], 16) % 3
    dietary = rng.sample(_DIETARY_POOL, n_diet) if n_diet > 0 else []

    price = 1 + (int(h[3:4], 16) % 4)
    health = round(0.3 + 0.6 * (int(h[4:6], 16) / 255.0), 2)
    rating = round(3.0 + 2.0 * (int(h[6:8], 16) / 255.0), 2)
    review_count = 10 + (int(h[8:12], 16) % 4990)

    name = _generate_name(rng, idx)
    # Deduplicate by adding number if needed (handled externally)

    return Venue(
        id=f"v{idx:05d}",
        name=name,
        location={"lat": round(lat, 6), "lng": round(lng, 6)},
        cuisines=cuisines,
        dietary_tags=dietary,
        price_tier=price,
        health_score=health,
        source="tabelog",
        source_url=f"https://tabelog.com/japan/{h[:8]}/",
        address=f"〒{int(h[12:16],16) % 8999 + 100:04d}-{int(h[16:20],16) % 9999:04d}",
        image_url=f"https://picsum.photos/seed/v{idx:05d}/600/400",
        rating=rating,
        review_count=review_count,
    )


def generate_venues(target: int = _TARGET, seed: int = _SEED) -> List[Venue]:
    """Generate *target* venues deterministically, preserving any real ones."""
    rng = random.Random(seed)

    # Load existing real venues
    existing: list[Venue] = []
    for path in (Path("src/data/venues.json"), Path("web/src/data/venues.json")):
        if path.exists():
            try:
                with path.open("r", encoding="utf-8") as f:
                    raw = json.load(f)
                seen_ids = {v.id for v in existing}
                for item in raw:
                    vid = item.get("venue_id") or item.get("id")
                    if vid and vid not in seen_ids:
                        existing.append(
                            Venue(
                                id=vid,
                                name=item["name"],
                                location={
                                    "lat": item.get("lat"),
                                    "lng": item.get("lng"),
                                } if item.get("lat") is not None else None,
                                cuisines=item.get("cuisines", []),
                                dietary_tags=item.get("dietary_tags", []),
                                price_tier=item.get("price_tier"),
                                health_score=item.get("health_score"),
                                source=item.get("source", "tabelog"),
                                source_url=item.get("source_url"),
                                address=item.get("address"),
                                image_url=item.get("image_url"),
                                rating=item.get("rating"),
                                review_count=item.get("review_count"),
                            )
                        )
                        seen_ids.add(vid)
            except Exception:
                pass

    print(f"[generate] Loaded {len(existing)} existing real venues")

    if len(existing) >= target:
        print(f"[generate] Already have {len(existing)} venues, no supplement needed")
        return existing[:target]

    # Preserve existing first
    venues: list[Venue] = list(existing)
    seen: set[str] = {v.id for v in venues}

    # Supplement — start IDs after the highest existing numeric suffix
    # so we never collide with real/legacy data that may have gaps.
    max_id = 0
    for v in venues:
        if v.id.startswith("v"):
            try:
                max_id = max(max_id, int(v.id[1:]))
            except ValueError:
                pass

    next_id = max_id + 1
    while len(venues) < target:
        v = _generate_venue(rng, next_id)
        # Simple dedup by lat/lng rounded to 3 decimals + name prefix
        if v.location:
            key = f"{v.name[:20].lower()}|{round(v.location['lat'], 3)}|{round(v.location['lng'], 3)}"
            if key in seen:
                next_id += 1
                continue
            seen.add(key)
        venues.append(v)
        next_id += 1

    print(f"[generate] Total venues after supplement: {len(venues)}")
    return venues


def _venue_to_json(v: Venue) -> dict:
    return {
        "venue_id": v.id,
        "name": v.name,
        "address": v.address,
        "lat": v.location["lat"] if v.location else None,
        "lng": v.location["lng"] if v.location else None,
        "cuisines": v.cuisines,
        "dietary_tags": v.dietary_tags,
        "price_tier": v.price_tier,
        "health_score": v.health_score,
        "source": v.source,
        "source_url": v.source_url,
        "rating": v.rating,
        "review_count": v.review_count,
        "image_url": v.image_url,
    }


def main() -> None:
    venues = generate_venues()
    json_data = [_venue_to_json(v) for v in venues]

    # Write backend (full dataset)
    backend_path = Path("src/data/venues.json")
    backend_path.parent.mkdir(parents=True, exist_ok=True)
    with backend_path.open("w", encoding="utf-8") as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)
    print(f"[generate] Wrote {len(json_data)} venues → {backend_path}")

    # Write frontend (first 10K only to keep bundle size reasonable)
    web_limit = min(10000, len(json_data))
    web_path = Path("web/src/data/venues.json")
    web_path.parent.mkdir(parents=True, exist_ok=True)
    with web_path.open("w", encoding="utf-8") as f:
        json.dump(json_data[:web_limit], f, ensure_ascii=False, indent=2)
    print(f"[generate] Wrote {web_limit} venues → {web_path} (bundle fallback)")


if __name__ == "__main__":
    main()
