"""
Helper Utility Functions
"""
from datetime import datetime, timezone
from flask import request
from firebase_admin import auth
from dateutil import parser as dateparser
from app.utils.firebase_init import db


def now_utc():
    """Return a timezone-aware UTC datetime (consistent everywhere)."""
    return datetime.now(timezone.utc)


def coerce_dt(value):
    """
    Coerce various timestamp-like values into a timezone-aware datetime.
    Handles:
      - Python datetime (adds UTC tz if missing)
      - Firestore Timestamp-like objects with ToDatetime()
      - google.protobuf-like objects with seconds/nanos
      - ints/floats (epoch seconds)
      - ISO-format strings (fall back to dateutil)
    Returns None if it cannot be coerced.
    """
    if value is None:
        return None

    # Already a datetime
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    # Firestore/Proto timestamp objects sometimes have ToDatetime()
    try:
        if hasattr(value, "ToDatetime"):
            dt = value.ToDatetime()
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt

        # google.protobuf.Timestamp-like
        if hasattr(value, "seconds") and hasattr(value, "nanos"):
            seconds = float(getattr(value, "seconds", 0)) + float(getattr(value, "nanos", 0)) / 1e9
            return datetime.fromtimestamp(seconds, tz=timezone.utc)

        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(float(value), tz=timezone.utc)

        if isinstance(value, str):
            try:
                # prefer fromisoformat then fall back
                dt = datetime.fromisoformat(value)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc)
            except Exception:
                try:
                    dt = dateparser.parse(value)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    return dt.astimezone(timezone.utc)
                except Exception:
                    return None

    except Exception:
        return None

    return None


def cleanup_old_payments():
    """Delete payment docs older than 1 year (no storage operations)."""
    try:
        from datetime import timedelta
        one_year_ago = now_utc() - timedelta(days=365)
        old_payments = (
            db.collection("payments")
            .where("created_at", "<", one_year_ago)
            .stream()
        )
        deleted = 0
        for doc in old_payments:
            try:
                doc.reference.delete()
                deleted += 1
            except Exception as e:
                print(f"cleanup delete doc failed: {e}")
        if deleted:
            print(f"[cleanup] Deleted {deleted} old payment docs")
    except Exception as e:
        print(f"cleanup error: {e}")


def calculate_fee_status(student_id, current_time):
    """
    Finds the latest 'expires_at' date among all verified payments.
    Ensures type consistency by coercing expiry values.
    """
    try:
        payments = db.collection("payments")\
            .where("student_id", "==", student_id)\
            .where("status", "==", "verified")\
            .stream()
        
        latest_expiry = None
        
        for doc in payments:
            p = doc.to_dict()
            expiry = coerce_dt(p.get("expires_at"))
            if expiry:
                # Ensure expiry is timezone aware for comparison
                if latest_expiry is None or expiry > latest_expiry:
                    latest_expiry = expiry
        
        if latest_expiry and latest_expiry > current_time:
            return {
                "is_paid": True,
                "expires_at": latest_expiry,
                "expires_at_str": latest_expiry.strftime("%d %b %Y"),
                "days_remaining": (latest_expiry - current_time).days
            }
        
        return {"is_paid": False, "expires_at": latest_expiry, "expires_at_str": "-", "days_remaining": 0}
    except Exception as e:
        return {"is_paid": False, "expires_at": None, "expires_at_str": "Error", "days_remaining": 0}


def inject_user_role():
    """Context processor to inject user role into templates"""
    is_admin = False
    is_student = False

    session_cookie = request.cookies.get("session")

    if session_cookie:
        try:
            decoded = auth.verify_session_cookie(
                session_cookie, check_revoked=False
            )
            uid = decoded.get("uid")

            user_doc = db.collection("users").document(uid).get()
            if user_doc.exists:
                role = user_doc.to_dict().get("role")

                if role == "admin":
                    is_admin = True
                elif role == "student":
                    is_student = True

        except Exception as e:
            # Optional debug
            print("Context processor auth error:", e)

    return {
        "is_admin": is_admin,
        "is_student": is_student
    }
