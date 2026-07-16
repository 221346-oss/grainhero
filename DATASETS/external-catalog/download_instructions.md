# Download Instructions — External Datasets

Step-by-step guides for obtaining each external dataset.
After downloading, place files in this `external-catalog/` folder.

---

## IMMEDIATE (This Week)

### 1. Open-Meteo Historical Weather — No Account Needed

```python
# Run this from the project root:
# python DATASETS/external-catalog/download_weather.py

import requests
import csv

params = {
    "latitude": 31.5497, "longitude": 74.3436,
    "hourly": "temperature_2m,relativehumidity_2m,precipitation,windspeed_10m,dewpoint_2m",
    "start_date": "2023-01-01",
    "end_date": "2025-12-31",
    "timezone": "Asia/Karachi"
}
r = requests.get("https://api.open-meteo.com/v1/forecast", params=params)
data = r.json()["hourly"]
rows = list(zip(data["time"], data["temperature_2m"],
                data["relativehumidity_2m"], data["precipitation"],
                data["dewpoint_2m"]))
with open("lahore_weather_2023_2025.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp","outside_temp","outside_humidity","rainfall_mm","outside_dew_point"])
    w.writerows(rows)
print(f"Downloaded {len(rows)} hourly records (3 years = 26,280 rows)")
```

For other cities, change lat/lon:
- Karachi: `30.3753, 69.3451`
- Multan: `30.1575, 71.5249`
- Faisalabad: `31.4504, 73.1350`
- Hyderabad: `25.3960, 68.3578`

---

### 2. Kaggle Smart Agriculture Dataset

1. Create a free Kaggle account at https://www.kaggle.com
2. Go to: https://www.kaggle.com/datasets/sankha1998/smart-agriculture-dataset
3. Click **Download** (top right)
4. Unzip and save `smart_agriculture.csv` to this folder as `kaggle_smart_agriculture.csv`
5. ~16,000 rows, ~5 MB

---

## HIGH PRIORITY (This Month)

### 3. Mendeley Multi-Parameter Food Spoilage Dataset

1. Go to: https://doi.org/10.17632/v6998c7674.1
2. Click **Download All** button
3. Save the CSV file to this folder as `mendeley_food_spoilage.csv`
4. No account required

---

### 4. MDPI Granary Temperature Dataset (186K rows)

1. Open paper: https://www.mdpi.com/2073-4395/15/3/305
2. Scroll to **Supplementary Materials** section at bottom
3. Download the CSV attachment
4. Save as `mdpi_granary_timeseries.csv` in this folder
5. This is a real 186K-row time series from an operational granary

---

### 5. FAOSTAT Pakistan Post-Harvest Loss Data

1. Go to: https://www.fao.org/faostat/en/
2. Navigate: Data → Food and Agriculture → SDG 12.3.1a (Food Loss Index)
3. Select: Country = Pakistan | Commodities = Wheat, Rice, Maize
4. Years: 2015–2023
5. Click **Download CSV**
6. Save as `faostat_pakistan_postharvest_loss.csv`

---

## MEDIUM PRIORITY (Month 2–3)

### 6. SPID Acoustic Dataset (Stored Product Insect Dataset)

1. Go to: https://www.kaggle.com/
2. Search: "SPID stored product insect detection"
3. Download (large — several GB of WAV files)
4. Save to `acoustic-insects/` subfolder here
5. Run preprocessing to extract MFCC features before training

---

### 7. InsectSound1000 (12 species, 165K audio files)

1. Go to: https://www.openagrar.de/
2. Search: "InsectSound1000"
3. Register (free) and download
4. Save to `acoustic-insects/InsectSound1000/`

---

## LONG-TERM (Year 2)

### 8. USDA ARS Grain Pest Acoustic Data

Email: Contact USDA ARS Grain Marketing and Production Research Center
- Website: https://www.ars.usda.gov/plains-area/manhattan-ks/center-for-grain-and-animal-health-research/
- Request: "Acoustic insect detection dataset for stored grain pests"
- Species of interest: Sitophilus granarius, Tribolium castaneum, Rhyzopertha dominica

---

### 9. EU RASFF Grain Rejection Database

1. Go to: https://webgate.ec.europa.eu/rasff-window/portal/
2. Select: Hazard = Mycotoxins | Product = Cereals and cereal products
3. Country of origin = Pakistan (if available) or global
4. Export to CSV
5. Save as `eu_rasff_grain_rejections.csv`
