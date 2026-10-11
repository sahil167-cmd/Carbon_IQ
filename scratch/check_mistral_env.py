import os
from dotenv import load_dotenv

load_dotenv('.env')
load_dotenv('apps/core-api/.env')

key = os.environ.get('MISTRAL_API_KEY')
if key:
    print(f"MISTRAL_API_KEY detected: Length = {len(key)} chars, Prefix = {key[:4]}***")
else:
    print("MISTRAL_API_KEY is NOT set in environment.")
