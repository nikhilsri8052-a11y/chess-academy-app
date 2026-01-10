"""
Firebase Admin SDK Initialization
"""
import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()

cred = credentials.Certificate({
    "type": "service_account",
    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
    "token_uri": os.getenv("FIREBASE_TOKEN_URI"),
    "private_key": os.getenv("FIREBASE_PRIVATE_KEY").replace("\\n", "\n"),
})

firebase_admin.initialize_app(cred)
db = firestore.client()
