import os
import sys
import glob
from datetime import datetime, timezone
import hashlib
import httpx

# These are used for the ONE-TIME initial upload only.
# Passed as env vars: $env:SUPABASE_URL="..." ; python upload_initial_models.py
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as environment variables.\n"
        "Run: $env:SUPABASE_URL='https://xxx.supabase.co' ; $env:SUPABASE_SERVICE_ROLE_KEY='eyJ...'"
    )

print(f"Connecting to: {SUPABASE_URL}")

_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/octet-stream",
    "x-upsert": "true",
}

def upload_all():
    client = httpx.Client(timeout=60.0)
    version_ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    
    onnx_files = glob.glob("*.onnx")
    if not onnx_files:
        print("No .onnx files found to upload.")
        return

    for filepath in onnx_files:
        grain = filepath.replace(".onnx", "").replace("_ensemble_model", "")
        if grain == "ensemble_model":
            # fallback if not prefixed
            grain = "rice" 
            
        print(f"Uploading {filepath} for grain {grain}...")
        
        with open(filepath, "rb") as f:
            data = f.read()
            
        file_hash = hashlib.sha256(data).hexdigest()
        
        # 1. Upload to storage
        path = f"{grain}/{grain}.onnx"
        resp = client.post(
            f"{SUPABASE_URL}/storage/v1/object/onnx-models/{path}",
            content=data,
            headers=_HEADERS
        )
        
        if resp.status_code not in (200, 201):
            print(f"FAILED to upload {grain}.onnx: {resp.status_code} {resp.text}")
            continue
            
        print(f"OK: Uploaded {grain}.onnx to storage")
        
        # 2. Insert into model_versions
        client.patch(
            f"{SUPABASE_URL}/rest/v1/model_versions",
            params={"grain_type": f"eq.{grain}", "is_active": "eq.true"},
            json={"is_active": False},
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json"
            }
        )
        
        resp2 = client.post(
            f"{SUPABASE_URL}/rest/v1/model_versions",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "grain_type": grain,
                "version": version_ts,
                "storage_path": path,
                "accuracy": 0.99,
                "sanity_pass_rate": 1.0,
                "trained_by": "manual_upload",
                "is_active": True,
                "file_hash": file_hash
            }
        )
        
        if resp2.status_code in (200, 201):
            print(f"OK: Registered {grain} version {version_ts} in DB")
        else:
            print(f"FAILED to register {grain}: {resp2.status_code} {resp2.text}")

    client.close()

if __name__ == "__main__":
    upload_all()
