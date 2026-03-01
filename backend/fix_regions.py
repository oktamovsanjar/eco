"""
Mavjud hisobotlarning region maydonini koordinatalar asosida aniqlash.
Nominatim API ishlatiladi, agar xato bo'lsa — koordinata chegaralari orqali.
"""
import sqlite3
import urllib.request
import urllib.parse
import json
import time

DB_PATH = "ecowatch.db"

# O'zbekiston viloyatlari koordinata chegaralari (zaxira)
REGION_BOUNDS = [
    {"name": "Toshkent shahri",           "lat": (41.18, 41.43), "lon": (69.10, 69.45)},
    {"name": "Toshkent viloyati",         "lat": (40.60, 41.80), "lon": (68.40, 70.80)},
    {"name": "Samarqand viloyati",        "lat": (38.80, 40.20), "lon": (65.50, 68.20)},
    {"name": "Buxoro viloyati",           "lat": (37.50, 41.20), "lon": (61.00, 66.50)},
    {"name": "Farg'ona viloyati",         "lat": (39.80, 41.10), "lon": (70.50, 72.00)},
    {"name": "Andijon viloyati",          "lat": (40.30, 41.00), "lon": (72.00, 73.00)},
    {"name": "Namangan viloyati",         "lat": (40.50, 41.60), "lon": (70.50, 72.00)},
    {"name": "Qashqadaryo viloyati",      "lat": (37.80, 39.80), "lon": (65.00, 68.50)},
    {"name": "Surxondaryo viloyati",      "lat": (37.00, 38.80), "lon": (66.50, 68.50)},
    {"name": "Jizzax viloyati",           "lat": (39.80, 41.20), "lon": (66.50, 69.00)},
    {"name": "Sirdaryo viloyati",         "lat": (40.20, 41.20), "lon": (67.50, 69.80)},
    {"name": "Navoiy viloyati",           "lat": (39.50, 42.50), "lon": (62.50, 67.50)},
    {"name": "Xorazm viloyati",           "lat": (41.00, 42.10), "lon": (60.00, 62.50)},
    {"name": "Qoraqalpog'iston",          "lat": (42.00, 46.00), "lon": (55.00, 62.00)},
]

# Nominatim state → standart nom
NOMINATIM_MAP = {
    "Tashkent":                  "Toshkent shahri",
    "Toshkent":                  "Toshkent shahri",
    "Tashkent Region":           "Toshkent viloyati",
    "Toshkent viloyati":         "Toshkent viloyati",
    "Samarqand viloyati":        "Samarqand viloyati",
    "Samarkand Region":          "Samarqand viloyati",
    "Samarqand shahri":          "Samarqand viloyati",
    "Samarkand City":            "Samarqand viloyati",
    "Bukhara Region":            "Buxoro viloyati",
    "Buxoro viloyati":           "Buxoro viloyati",
    "Fergana Region":            "Farg'ona viloyati",
    "Farg'ona viloyati":         "Farg'ona viloyati",
    "Andijan Region":            "Andijon viloyati",
    "Andijon viloyati":          "Andijon viloyati",
    "Namangan Region":           "Namangan viloyati",
    "Namangan viloyati":         "Namangan viloyati",
    "Kashkadarya Region":        "Qashqadaryo viloyati",
    "Qashqadaryo viloyati":      "Qashqadaryo viloyati",
    "Surkhandarya Region":       "Surxondaryo viloyati",
    "Surxondaryo viloyati":      "Surxondaryo viloyati",
    "Jizzakh Region":            "Jizzax viloyati",
    "Jizzax viloyati":           "Jizzax viloyati",
    "Syrdarya Region":           "Sirdaryo viloyati",
    "Sirdaryo viloyati":         "Sirdaryo viloyati",
    "Navoi Region":              "Navoiy viloyati",
    "Navoiy viloyati":           "Navoiy viloyati",
    "Khorezm Region":            "Xorazm viloyati",
    "Xorazm viloyati":           "Xorazm viloyati",
    "Republic of Karakalpakstan":"Qoraqalpog'iston",
    "Qoraqalpog'iston":          "Qoraqalpog'iston",
}


def normalize_region(raw: str) -> str:
    """Nominatim dan kelgan region nomini standart nomga o'tkazish."""
    if not raw:
        return None
    for key, val in NOMINATIM_MAP.items():
        if key.lower() in raw.lower():
            return val
    return raw


def region_from_coords(lat: float, lon: float) -> str:
    """Koordinatalar asosida hududni aniqlash (zaxira)."""
    for r in REGION_BOUNDS:
        if r["lat"][0] <= lat <= r["lat"][1] and r["lon"][0] <= lon <= r["lon"][1]:
            return r["name"]
    return None


def nominatim_region(lat: float, lon: float) -> str:
    """Nominatim orqali region aniqlash."""
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&accept-language=uz"
    req = urllib.request.Request(url, headers={"User-Agent": "EcoWatch/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read())
            addr = data.get("address", {})
            state = addr.get("state") or addr.get("county") or addr.get("city")
            return normalize_region(state)
    except Exception as e:
        print(f"  Nominatim xato: {e}")
        return None


def main():
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT id, latitude, longitude, region FROM reports ORDER BY id"
    ).fetchall()

    print(f"Jami {len(rows)} ta hisobot tekshiriladi...\n")
    updated = 0

    for rid, lat, lon, cur_region in rows:
        # Agar allaqachon to'g'ri region bor bo'lsa — standartlashtirish
        normalized = normalize_region(cur_region) if cur_region else None

        if normalized and normalized != cur_region:
            # Faqat standartlashtirish
            conn.execute("UPDATE reports SET region=? WHERE id=?", (normalized, rid))
            conn.commit()
            print(f"  [ID={rid}] Standartlashtirildi: '{cur_region}' → '{normalized}'")
            updated += 1
            continue

        if normalized:
            print(f"  [ID={rid}] Mavjud: {normalized} ✓")
            continue

        # Region yo'q — Nominatim orqali aniqlash
        print(f"  [ID={rid}] lat={lat:.4f}, lon={lon:.4f} — Nominatim so'rovi...", end="", flush=True)
        region = nominatim_region(lat, lon)
        time.sleep(1.1)  # Nominatim rate limit: max 1 req/sec

        if not region:
            # Zaxira: koordinata chegaralari
            region = region_from_coords(lat, lon)
            if region:
                print(f" [zaxira] → {region}")
            else:
                print(" aniqlanmadi")
                continue
        else:
            print(f" → {region}")

        conn.execute("UPDATE reports SET region=? WHERE id=?", (region, rid))
        conn.commit()
        updated += 1

    conn.close()
    print(f"\n✅ Tugadi! {updated} ta hisobot yangilandi.")


if __name__ == "__main__":
    main()
