import os
import glob
import hashlib

os.makedirs('scratch/real_ocr_validation', exist_ok=True)

# Find PNG and JPG files in workspace or artifacts
artifacts_dir = r"C:\Users\Sahil Borhade\.gemini\antigravity-ide\brain\50235a35-e34e-4965-9325-5199f171574a\.user_uploaded"
images = glob.glob(os.path.join(artifacts_dir, "*.png"))

print(f"Found {len(images)} user-uploaded images in artifacts directory.")
for img in images[:5]:
    size = os.path.getsize(img)
    with open(img, 'rb') as f:
        data = f.read()
        h = hashlib.sha256(data).hexdigest()
    print(f"Image: {os.path.basename(img)} | Size: {size} bytes | SHA-256: {h}")
