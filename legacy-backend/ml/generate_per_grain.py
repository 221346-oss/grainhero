"""
Generate separate 10,000-row synthetic datasets for each grain type.
Matches the original SmartBin dataset column format exactly:
  Temperature, Humidity, Storage_Days, Spoilage_Label, Grain_Type,
  Airflow, Dew_Point, Ambient_Light, Pest_Presence, Grain_Moisture, Rainfall

Spoilage thresholds are from:
  - FAO Guidelines for Grain Storage (2011)
  - IRRI Rice Post-Harvest Guidelines
  - ASABE Standards for Grain Drying & Storage
"""
import numpy as np
import pandas as pd
import os, math

ROWS = 10000
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# --- Grain-specific parameters from literature ---
GRAINS = {
    'rice': {
        'grain_type_id': 1,
        'temp_range': (18, 42),    # tropical storage
        'hum_range':  (40, 95),
        'moisture_safe': 14,       # FAO: <14% MC for safe storage
        'moisture_risky': 16,
        'moisture_spoiled': 18,
        'temp_safe': 25,           # IRRI: <25°C ideal
        'temp_risky': 30,
        'temp_spoiled': 35,
        'hum_safe': 65,
        'hum_risky': 75,
        'hum_spoiled': 80,
        'storage_max_safe': 180,   # ~6 months
        'storage_max': 730,
    },
    'wheat': {
        'grain_type_id': 2,
        'temp_range': (5, 40),
        'hum_range':  (35, 90),
        'moisture_safe': 13,       # FAO: <13% MC
        'moisture_risky': 15,
        'moisture_spoiled': 16,
        'temp_safe': 20,
        'temp_risky': 25,
        'temp_spoiled': 30,
        'hum_safe': 60,
        'hum_risky': 70,
        'hum_spoiled': 75,
        'storage_max_safe': 240,
        'storage_max': 730,
    },
    'maize': {
        'grain_type_id': 3,
        'temp_range': (15, 42),
        'hum_range':  (40, 95),
        'moisture_safe': 14,       # ASABE: <14%
        'moisture_risky': 16,
        'moisture_spoiled': 18,
        'temp_safe': 25,
        'temp_risky': 30,
        'temp_spoiled': 35,
        'hum_safe': 65,
        'hum_risky': 75,
        'hum_spoiled': 80,
        'storage_max_safe': 180,
        'storage_max': 730,
    },
    'sorghum': {
        'grain_type_id': 4,
        'temp_range': (15, 45),
        'hum_range':  (30, 90),
        'moisture_safe': 13,
        'moisture_risky': 15,
        'moisture_spoiled': 16,
        'temp_safe': 28,
        'temp_risky': 33,
        'temp_spoiled': 38,
        'hum_safe': 60,
        'hum_risky': 70,
        'hum_spoiled': 75,
        'storage_max_safe': 300,
        'storage_max': 730,
    },
    'barley': {
        'grain_type_id': 5,
        'temp_range': (5, 38),
        'hum_range':  (35, 90),
        'moisture_safe': 13,
        'moisture_risky': 15,
        'moisture_spoiled': 16,
        'temp_safe': 20,
        'temp_risky': 25,
        'temp_spoiled': 30,
        'hum_safe': 60,
        'hum_risky': 70,
        'hum_spoiled': 75,
        'storage_max_safe': 240,
        'storage_max': 730,
    },
}


def calc_dew_point(temp, rh):
    """Magnus formula"""
    a, b = 17.27, 237.7
    alpha = (a * temp) / (b + temp) + math.log(max(rh / 100, 1e-9))
    return round((b * alpha) / (a - alpha), 2)


def classify(row, g):
    """
    Multi-factor spoilage classification using FAO/IRRI/ASABE thresholds.
    Returns 'Safe', 'Risky', or 'Spoiled'.
    """
    danger = 0.0

    # Temperature factor
    if row['Temperature'] > g['temp_spoiled']:
        danger += 2.5
    elif row['Temperature'] > g['temp_risky']:
        danger += 1.5
    elif row['Temperature'] > g['temp_safe']:
        danger += 0.5

    # Humidity factor
    if row['Humidity'] > g['hum_spoiled']:
        danger += 2.5
    elif row['Humidity'] > g['hum_risky']:
        danger += 1.5
    elif row['Humidity'] > g['hum_safe']:
        danger += 0.5

    # Grain moisture factor (most critical for spoilage)
    if row['Grain_Moisture'] > g['moisture_spoiled']:
        danger += 3.0
    elif row['Grain_Moisture'] > g['moisture_risky']:
        danger += 1.5
    elif row['Grain_Moisture'] > g['moisture_safe']:
        danger += 0.5

    # Storage days
    if row['Storage_Days'] > g['storage_max_safe'] * 2:
        danger += 2.0
    elif row['Storage_Days'] > g['storage_max_safe']:
        danger += 1.0
    elif row['Storage_Days'] > g['storage_max_safe'] * 0.5:
        danger += 0.3

    # Pest presence
    if row['Pest_Presence'] == 1:
        danger += 1.5

    # Low airflow amplifies risk
    if row['Airflow'] < 0.3:
        danger += 0.5

    # High dew point (condensation risk)
    if row['Dew_Point'] > 18:
        danger += 0.5

    # Classify
    if danger >= 5.0:
        return 'Spoiled'
    elif danger >= 2.0:
        return 'Risky'
    else:
        return 'Safe'


def generate_grain_dataset(grain_name, params, n=ROWS):
    """Generate n rows of synthetic data for one grain type."""
    np.random.seed(42 + params['grain_type_id'])
    
    tmin, tmax = params['temp_range']
    hmin, hmax = params['hum_range']

    rows = []
    for _ in range(n):
        temp = round(np.random.uniform(tmin, tmax), 2)
        hum = round(np.random.uniform(hmin, hmax), 2)
        storage_days = int(np.random.randint(1, params['storage_max'] + 1))
        airflow = round(np.random.uniform(0.05, 1.5), 3)
        dew_point = calc_dew_point(temp, hum)
        ambient_light = round(np.random.uniform(20, 200), 1)
        pest = int(np.random.choice([0, 1], p=[0.75, 0.25]))
        grain_moisture = round(np.random.uniform(
            params['moisture_safe'] - 4,
            params['moisture_spoiled'] + 4
        ), 2)
        rainfall = round(max(0, np.random.exponential(2)), 2)

        row = {
            'Temperature': temp,
            'Humidity': hum,
            'Storage_Days': storage_days,
            'Spoilage_Label': '',  # filled below
            'Grain_Type': grain_name.capitalize(),
            'Airflow': airflow,
            'Dew_Point': dew_point,
            'Ambient_Light': ambient_light,
            'Pest_Presence': pest,
            'Grain_Moisture': grain_moisture,
            'Rainfall': rainfall,
        }
        row['Spoilage_Label'] = classify(row, params)
        rows.append(row)

    df = pd.DataFrame(rows)
    return df


def main():
    for grain_name, params in GRAINS.items():
        print(f"\n{'='*60}")
        print(f"Generating {ROWS:,} rows for: {grain_name.upper()}")
        print(f"{'='*60}")

        df = generate_grain_dataset(grain_name, params)

        # Print class distribution
        dist = df['Spoilage_Label'].value_counts()
        total = len(df)
        print(f"  Safe:    {dist.get('Safe', 0):>5}  ({dist.get('Safe', 0)/total*100:.1f}%)")
        print(f"  Risky:   {dist.get('Risky', 0):>5}  ({dist.get('Risky', 0)/total*100:.1f}%)")
        print(f"  Spoiled: {dist.get('Spoiled', 0):>5}  ({dist.get('Spoiled', 0)/total*100:.1f}%)")

        # Save to /ml folder
        filename = f"{grain_name}_spoilage_10k.csv"
        filepath = os.path.join(SCRIPT_DIR, filename)
        df.to_csv(filepath, index=False)
        print(f"  [OK] Saved: {filepath}")
        print(f"  Columns: {list(df.columns)}")

    print(f"\n{'='*60}")
    print("ALL DONE! Files created in: farmHomeBackend-main/ml/")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
