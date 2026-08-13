import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", 8000))
RISK_THRESHOLD = float(os.getenv("RISK_THRESHOLD", 0.7))