"""
Authentication Decorators
"""
from functools import wraps
from flask import request, redirect, abort
from firebase_admin import auth
from app.utils.firebase_init import db


def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        session_cookie = request.cookies.get("session")
        
        if not session_cookie:
            return redirect("/admin/login")

        try:
            decoded_claims = auth.verify_session_cookie(session_cookie, check_revoked=True)
            uid = decoded_claims.get("uid")

            user_doc = db.collection("users").document(uid).get()
            if not user_doc.exists:
                return redirect("/admin/login")

            role = user_doc.to_dict().get("role")
            
            if role != "admin":
                abort(403)

            return f(*args, **kwargs)

        except Exception as e:
            print(f"Auth Verification Failed: {e}")
            return redirect("/admin/login")

    return wrapper


def student_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        session_cookie = request.cookies.get("session")

        if not session_cookie:
            return redirect("/student/login")

        try:
            decoded_claims = auth.verify_session_cookie(
                session_cookie, check_revoked=True
            )
            uid = decoded_claims.get("uid")

            user_doc = db.collection("users").document(uid).get()
            if not user_doc.exists:
                return redirect("/student/login")

            role = user_doc.to_dict().get("role")

            if role != "student":
                abort(403)

            return f(*args, **kwargs)

        except Exception as e:
            print(f"Auth Verification Failed: {e}")
            return redirect("/student/login")

    return wrapper
