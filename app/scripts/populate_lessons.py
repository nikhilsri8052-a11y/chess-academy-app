"""
Script to populate Firestore with chess lessons (Lesson 2-10)
Uses Firestore REST API with your web API key.

Usage:
  pip install requests
  python -m app.scripts.populate_lessons
"""

import requests
import json

FIREBASE_PROJECT_ID = "sschessclass"
FIREBASE_API_KEY = "AIzaSyAXuS_IRyEAPhsg4-qCk6mkFrsDdBB63Mo"

# Lesson data with FEN positions
lessons = [
    {
        "id": 2,
        "title": "Rook Movement",
        "text": "Rook moves any number of squares horizontally or vertically.",
        "fen": "8/8/8/8/3R4/8/8/8 w - - 0 1",
        "pieces": {"d4": "wr"}
    },
    {
        "id": 3,
        "title": "Bishop Movement",
        "text": "Bishop moves diagonally any number of squares.",
        "fen": "8/8/8/8/8/8/8/2B5 w - - 0 1",
        "pieces": {"c1": "wb"}
    },
    {
        "id": 4,
        "title": "Knight Movement",
        "text": "Knight moves in an L-shape and can jump over pieces.",
        "fen": "8/8/8/8/8/8/8/6N1 w - - 0 1",
        "pieces": {"g1": "wn"}
    },
    {
        "id": 5,
        "title": "Queen Movement",
        "text": "Queen moves like rook + bishop.",
        "fen": "8/8/8/8/8/8/8/3Q4 w - - 0 1",
        "pieces": {"d1": "wq"}
    },
    {
        "id": 6,
        "title": "King Movement",
        "text": "King moves one square in any direction.",
        "fen": "8/8/8/8/8/8/8/4K3 w - - 0 1",
        "pieces": {"e1": "wk"}
    },
    {
        "id": 7,
        "title": "Pawn Promotion",
        "text": "Move pawn to the 8th rank to trigger a promotion prompt.",
        "fen": "8/4P3/8/8/8/8/8/8 w - - 0 1",
        "pieces": {"e7": "wp"}
    },
    {
        "id": 8,
        "title": "Capture Example",
        "text": "Try capturing the black pawn with the white rook.",
        "fen": "8/3p4/8/8/3R4/8/8/8 w - - 0 1",
        "pieces": {"d4": "wr", "d7": "bp"}
    },
    {
        "id": 9,
        "title": "Combined Practice",
        "text": "Practice pawn, rook and knight in one position.",
        "fen": "8/8/8/8/3R4/8/4P3/6N1 w - - 0 1",
        "pieces": {"e2": "wp", "d4": "wr", "g1": "wn"}
    },
    {
        "id": 10,
        "title": "Free Practice",
        "text": "Open practice area.",
        "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "pieces": {"a2": "wp", "b2": "wp", "a1": "wr", "h1": "wr", "g1": "wn"}
    }
]

print("📚 Adding lessons to Firestore...")
print("-" * 60)

success_count = 0
for lesson in lessons:
    try:
        doc_id = str(lesson["id"])
        url = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents/lessons/{doc_id}?key={FIREBASE_API_KEY}"
        
        # Build Firestore-compatible payload
        payload = {
            "fields": {
                "id": {"integerValue": lesson["id"]},
                "title": {"stringValue": lesson["title"]},
                "text": {"stringValue": lesson["text"]},
                "fen": {"stringValue": lesson["fen"]},
                "pieces": {
                    "mapValue": {
                        "fields": {k: {"stringValue": v} for k, v in lesson["pieces"].items()}
                    }
                }
            }
        }
        
        response = requests.patch(url, json=payload)
        
        if response.status_code in [200, 201]:
            print(f"✅ Lesson {lesson['id']}: {lesson['title']}")
            success_count += 1
        else:
            print(f"❌ Lesson {lesson['id']}: {lesson['title']}")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Lesson {lesson['id']}: {lesson['title']} - Error: {e}")

print("-" * 60)
print(f"✅ Successfully added {success_count}/{len(lessons)} lessons!")
print("\n📍 View in Firebase Console:")
print("   https://console.firebase.google.com/project/sschessclass/firestore")
