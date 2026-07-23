"""
GrainHero — Open-Meteo Historical Weather Downloader
Downloads 3 years of hourly weather data for major Pakistan grain cities.
Output: DATASETS/external-catalog/<city>_weather_2023_2025.csv

Usage:
    python DATASETS/external-catalog/download_weather.py

Requirements:
    pip install requests
"""

import requests
import csv
import os
import time

CITIES = {
    "Lahore":      {"lat": 31.5497, "lon": 74.3436},
    "Karachi":     {"lat": 24.8607, "lon": 67.0011},
    "Multan":      {"lat": 30.1575, "lon": 71.5249},
    "Faisalabad":  {"lat": 31.4504, "lon": 73.1350},
    "Hyderabad":   {"lat": 25.3960, "lon": 68.3578},
}

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

def download_city(city_name, lat, lon):
    params = {
        "latitude":   lat,
        "longitude":  lon,
        "hourly": ",".join([
            "temperature_2m",
            "relativehumidity_2m",
            "dewpoint_2m",
            "precipitation",
            "rain",
            "windspeed_10m",
            "weathercode"
        ]),
        "start_date": "2023-01-01",
        "end_date":   "2025-12-31",
        "timezone":   "Asia/Karachi"
    }

    print(f"  Downloading {city_name} ({lat}, {lon})...")
    r = requests.get("https://api.open-meteo.com/v1/forecast", params=params, timeout=30)
    r.raise_for_status()
    data = r.json()["hourly"]

    rows = list(zip(
        data["time"],
        data["temperature_2m"],
        data["relativehumidity_2m"],
        data["dewpoint_2m"],
        data["precipitation"],
        data["rain"],
        data["windspeed_10m"],
    ))

    out_path = os.path.join(OUTPUT_DIR, f"{city_name.lower()}_weather_2023_2025.csv")
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "timestamp", "outside_temp_c", "outside_humidity_pct",
            "outside_dew_point_c", "precipitation_mm", "rain_mm", "windspeed_kmh"
        ])
        writer.writerows(rows)

    print(f"  Saved {len(rows):,} hourly records → {out_path}")
    return len(rows)


if __name__ == "__main__":
    print("=" * 60)
    print("GrainHero — Open-Meteo Weather Downloader")
    print("=" * 60)
    total = 0
    for city, coords in CITIES.items():
        try:
            n = download_city(city, coords["lat"], coords["lon"])
            total += n
            time.sleep(1)  # Be polite to the API
        except Exception as e:
            print(f"  ERROR for {city}: {e}")
    print(f"\nDone. Total: {total:,} records across {len(CITIES)} cities.")
    print(f"Files saved to: {OUTPUT_DIR}")
