"""
Script to create admin user in Firebase
"""
import firebase_admin
from firebase_admin import credentials, auth, firestore

# 1. Initialize Firebase (Ensure you point to your actual service account key)
# If you are running this where 'firebase_admin_init.py' already exists,
# you can just import db and auth from there instead of initializing again.
try:
    cred = credentials.Certificate("firebase-admin.json")  # <--- UPDATE THIS PATH
    firebase_admin.initialize_app(cred)
except ValueError:
    # App already initialized
    pass

db = firestore.client()


def create_admin_user(email, password):
    print(f"Processing admin user: {email}...")

    try:
        # Step 1: Check if user exists in Authentication
        try:
            user = auth.get_user_by_email(email)
            print(f"✓ Found existing user in Auth (UID: {user.uid})")
        except auth.UserNotFoundError:
            # Create user if they don't exist
            user = auth.create_user(email=email, password=password)
            print(f"✓ Created new user in Auth (UID: {user.uid})")

        # Step 2: Create/Update the User Document in Firestore
        # This is the step that fixes "No user found"
        user_ref = db.collection("users").document(user.uid)
        
        user_ref.set({
            "email": email,
            "role": "admin",  # <--- This is what the login checks for
            "created_at": firestore.SERVER_TIMESTAMP
        }, merge=True)
        
        print("✓ Successfully created 'admin' role in Firestore database!")
        print("You can now log in at /admin/login")

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    # REPLACE with your desired admin credentials
    ADMIN_EMAIL = "admin@example.com" 
    ADMIN_PASS = "securePassword123"
    
    create_admin_user(ADMIN_EMAIL, ADMIN_PASS)
