"""
Authentication Routes
"""
from flask import Blueprint, render_template, request, jsonify, make_response, redirect
from datetime import timedelta
from firebase_admin import auth
from app.utils.firebase_init import db
from app.utils.helpers import now_utc
# Note: auth routes don't use decorators, they handle their own authentication

bp = Blueprint('auth', __name__)


# ---------------- ENQUIRY ----------------


@bp.route("/enquiry", methods=["GET", "POST"])
def enquiry():
    if request.method == "POST":
        import re
        data = request.get_json() or {}

        name = data.get("name", "").strip()
        email = data.get("email", "").strip()
        phone = data.get("phone", "").strip()
        batch = data.get("batch", "").strip()
        message = data.get("message", "").strip()

        if not name or len(name) < 2 or not re.match(r"^[a-zA-Z\s'-]+$", name):
            return jsonify({"error": "Invalid name"}), 400

        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
            return jsonify({"error": "Invalid email"}), 400

        phone_digits = re.sub(r"\D", "", phone)
        if len(phone_digits) != 10:
            return jsonify({"error": "Phone must be 10 digits"}), 400

        if not message or len(message) < 5:
            return jsonify({"error": "Message too short"}), 400

        db.collection("enquiries").add({
            "name": name,
            "email": email,
            "phone": phone_digits,
            "batch": batch,
            "message": message,
            "status": "new",
            "created_at": now_utc()
        })

        return jsonify({"success": True})

    return render_template("enquiry_form.html")


# ---------------- ADMIN AUTH ----------------


@bp.route("/admin/login")
def admin_login():
    return render_template("admin_login.html")


@bp.route("/admin/session", methods=["POST"])
def admin_session():
    token = request.json.get("token")
    decoded = auth.verify_id_token(token)
    uid = decoded["uid"]

    user = db.collection("users").document(uid).get()
    if not user.exists or user.to_dict().get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    expires = timedelta(days=5)
    session_cookie = auth.create_session_cookie(token, expires_in=expires)

    resp = make_response(jsonify({"success": True}))
    resp.set_cookie("session", session_cookie, max_age=expires.total_seconds(), httponly=True)
    return resp


@bp.route("/admin/logout")
def admin_logout():
    resp = redirect("/admin/login")
    resp.set_cookie("session", expires=0)
    return resp


# ---------------- STUDENT AUTH ----------------


@bp.route("/student/login")
def student_login():
    return render_template("student_login.html")


@bp.route("/student/register", methods=["GET"])
def student_register_page():
    return render_template("student_register.html")


@bp.route("/student/register", methods=["POST"])
def student_register():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    decoded = auth.verify_id_token(token)
    uid = decoded["uid"]

    data = request.json

    db.collection("users").document(uid).set({
        "uid": uid,
        "name": data["name"],
        "email": data["email"],
        "phone": data["phone"],
        "age": data["age"],
        "parent_name": data["parent_name"],
        "rating": data.get("rating"),
        "role": "student",
        "status": "new",
        "batch": None,
        "fees_paid": False,
        "payment_verified": False,
        "registration_date": now_utc()
    })

    db.collection("notifications").add({
        "type": "new_registration",
        "student_id": uid,
        "created_at": now_utc(),
        "read": False
    })

    return jsonify({"success": True})


@bp.route("/student/session", methods=["POST"])
def student_session():
    token = request.json.get("token")
    decoded = auth.verify_id_token(token)
    uid = decoded["uid"]

    user = db.collection("users").document(uid).get()
    if not user.exists or user.to_dict().get("role") != "student":
        return jsonify({"error": "Unauthorized"}), 403

    expires = timedelta(days=5)
    session_cookie = auth.create_session_cookie(token, expires_in=expires)

    resp = make_response(jsonify({"success": True}))
    resp.set_cookie("session", session_cookie, max_age=expires.total_seconds(), httponly=True)
    return resp


@bp.route("/student/logout")
def student_logout():
    resp = redirect("/student/login")
    resp.set_cookie("session", expires=0)
    return resp
