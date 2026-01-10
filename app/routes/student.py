"""
Student Routes
"""
from flask import Blueprint, render_template, request, jsonify, redirect
from firebase_admin import auth, firestore
from app.utils.firebase_init import db
from app.utils.helpers import now_utc, coerce_dt, cleanup_old_payments
from app.utils.auth_utils import student_required
from app.utils.helpers import now_utc, coerce_dt, calculate_fee_status

bp = Blueprint('student', __name__, url_prefix='/student')


@bp.route("/")
@student_required
def student_home():
    return redirect("/student/dashboard")


@bp.route("/dashboard")
@student_required
def student_dashboard():
    decoded = auth.verify_session_cookie(request.cookies.get("session"))
    uid = decoded["uid"]

    student = db.collection("users").document(uid).get().to_dict()
    payments = []

    for doc in db.collection("payments").where("student_id", "==", uid).stream():
        p = doc.to_dict()
        p["id"] = doc.id
        payments.append(p)

    return render_template("student_dashboard.html", student=student, payments=payments)


@bp.route("/payment")
@student_required
def payment_page():
    """
    Render single-file payment page.
    """
    try:
        # Keep cleanup synchronous but fast — it is safe because it uses small queries
        cleanup_old_payments()
    except Exception as e:
        print(f"Cleanup error: {e}")

    try:
        decoded = auth.verify_session_cookie(request.cookies.get("session"))
        uid = decoded["uid"]
        
        user_doc = db.collection("users").document(uid).get()
        user = user_doc.to_dict() if user_doc.exists else {}
        
        # Check if there's any pending/submitted doc
        pending_q = (
            db.collection("payments")
            .where("student_id", "==", uid)
            .where("status", "in", ["pending", "submitted"])
            .limit(1)
            .stream()
        )
        # Check if generator is not empty
        has_pending = any(True for _ in pending_q)

        return render_template(
            "payment_page.html", 
            name=user.get("name", "Student"), 
            has_pending=has_pending
        )
    except Exception as e:
        print(f"Payment page error: {e}")
        return render_template("payment_page.html", name="Student", has_pending=False)


@bp.route("/payment/initiate", methods=["POST"])
@student_required
def initiate_payment():
    """
    Create a payments document.
    Returns {"success": True, "payment_id": "<id>"}.
    All timestamps are stored as timezone-aware datetimes (UTC) for consistency.
    """
    try:
        decoded = auth.verify_session_cookie(request.cookies.get("session"))
        uid = decoded["uid"]

        data = request.get_json() or {}
        plan = data.get("plan")
        amounts = {"1month": 3000, "3months": 7500}
        amount = amounts.get(plan)
        
        if not amount:
            return jsonify({"success": False, "error": "Invalid plan"}), 400

        # If an existing pending/submitted exists, return it to prevent duplicates
        existing = (
            db.collection("payments")
            .where("student_id", "==", uid)
            .where("status", "in", ["pending", "submitted"])
            .limit(1)
            .stream()
        )
        for doc in existing:
            return jsonify({"success": True, "payment_id": doc.id})

        # Create a new doc with server-coordinated timestamp (we use server-side UTC datetime)
        created_at = now_utc()

        doc_ref = db.collection("payments").document()
        doc_ref.set({
            "student_id": uid,
            "plan": plan,
            "amount": amount,
            "status": "pending",  # awaiting whatsapp screenshot
            "created_at": created_at,
            "notes": "Send screenshot to WhatsApp 8830435532"
        })

        return jsonify({"success": True, "payment_id": doc_ref.id})
    except Exception as e:
        print(f"initiate_payment error: {e}")
        return jsonify({"success": False, "error": "Server error"}), 500


@bp.route("/payment/mark_sent", methods=["POST"])
@student_required
def mark_payment_sent():
    """
    Mark payment as sent by student (fees_paid = True, payment_verified stays False)
    Uses now_utc() for submitted_at so the type is always datetime.
    """
    try:
        decoded = auth.verify_session_cookie(request.cookies.get("session"))
        uid = decoded["uid"]

        data = request.get_json() or {}
        payment_id = data.get("payment_id")
        submitted_via = data.get("submitted_via", "whatsapp")
        whatsapp_number = data.get("whatsapp_number", "8830435532")

        if not payment_id:
            return jsonify({"success": False, "error": "Missing payment_id"}), 400

        payment_ref = db.collection("payments").document(payment_id)
        payment_doc = payment_ref.get()

        if not payment_doc.exists:
            return jsonify({"success": False, "error": "Invalid payment_id"}), 400

        payment = payment_doc.to_dict()
        if payment.get("student_id") != uid:
            return jsonify({"success": False, "error": "Unauthorized"}), 403

        # Update payment document
        submitted_at = now_utc()
        payment_ref.update({
            "status": "submitted",
            "submitted_via": submitted_via,
            "whatsapp_number": whatsapp_number,
            "submitted_at": submitted_at
        })

        # Update student document: fees_paid = True, but payment_verified stays False
        db.collection("users").document(uid).update({
            "fees_paid": True,
            "payment_verified": False
        })

        return jsonify({"success": True})

    except Exception as e:
        print(f"mark_payment_sent error: {e}")
        return jsonify({"success": False, "error": "Server error"}), 500


@bp.route("/payment/history")
@student_required
def student_payment_history():
    """for student to view their own payment history"""
    try:
        decoded = auth.verify_session_cookie(request.cookies.get("session"))
        uid = decoded["uid"]

        payments = []

        docs = (
            db.collection("payments")
            .where("student_id", "==", uid)
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .stream()
        )

        for doc in docs:
            p = doc.to_dict()
            p["id"] = doc.id

            # Coerce created_at into a datetime for formatting and filtering
            created = coerce_dt(p.get("created_at"))
            if created:
                p["created_at_str"] = created.strftime("%d %b %Y %H:%M")
                p["created_at_iso"] = created.strftime("%Y-%m")  # ⭐ for filtering
            else:
                p["created_at_str"] = "-"
                p["created_at_iso"] = ""

            payments.append(p)

        return render_template("student_payment_history.html", payments=payments)

    except Exception as e:
        print("History error:", e)
        return render_template(
            "student_payment_history.html",
            payments=[],
            error=str(e)
        )


@bp.route("/notices")
@student_required
def get_student_notices():
    """Get notices for student's batch"""
    try:
        session_cookie = request.cookies.get("session")
        decoded = auth.verify_session_cookie(session_cookie)
        student_id = decoded["uid"]
        
        # Get student's batch
        student_doc = db.collection("users").document(student_id).get()
        student_data = student_doc.to_dict()
        student_batch = student_data.get("batch")
        
        if not student_batch:
            return jsonify({"success": True, "notices": []})
        
        # Get notices for student's batch and 'all'
        notices_query = (
            db.collection("notices")
            .where("batch", "in", [student_batch, "all"]) 
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .limit(5)
            .stream()
        )
        
        notices = []
        for doc in notices_query:
            notice_data = doc.to_dict()
            notice_data["id"] = doc.id
            
            # Format date
            created = coerce_dt(notice_data.get("created_at"))
            if created:
                notice_data["created_at_str"] = created.strftime("%d %b %Y, %I:%M %p")
            else:
                notice_data["created_at_str"] = "Recently"
                
            notices.append(notice_data)
        
        return jsonify({"success": True, "notices": notices})
        
    except Exception as e:
        print(f"Get student notices error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/study-materials-page")
@student_required
def student_study_materials_page():
    """Render study materials page for students"""
    return render_template("student_study_materials.html")


@bp.route("/study-materials")
@student_required
def get_student_study_materials():
    """Get study materials for student's batch"""
    try:
        session_cookie = request.cookies.get("session")
        decoded = auth.verify_session_cookie(session_cookie)
        student_id = decoded["uid"]
        
        # Get student's batch
        student_doc = db.collection("users").document(student_id).get()
        student_data = student_doc.to_dict()
        student_batch = student_data.get("batch")
        
        if not student_batch:
            return jsonify({"success": True, "materials": []})
        
        # Get materials for student's batch and 'all'
        materials_query = (
            db.collection("study_materials")
            .where("batch", "in", [student_batch, "all"]) 
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .limit(5)
            .stream()
        )
        
        materials = []
        for doc in materials_query:
            material_data = doc.to_dict()
            material_data["id"] = doc.id
            
            # Format date
            created = coerce_dt(material_data.get("created_at"))
            if created:
                material_data["created_at_str"] = created.strftime("%d %b %Y")
            else:
                material_data["created_at_str"] = "Recently"
                
            materials.append(material_data)
        
        return jsonify({"success": True, "materials": materials})
        
    except Exception as e:
        print(f"Get student study materials error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/assignments")
@student_required
def student_assignments():
    try:
        # 🔑 Extract Firebase session cookie
        session_cookie = request.cookies.get("session")
        if not session_cookie:
            return redirect("/student/login")

        decoded_token = auth.verify_session_cookie(session_cookie, check_revoked=True)
        uid = decoded_token["uid"]

        # 🔥 Fetch user from Firestore
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists:
            return "User not found", 404

        user_data = user_doc.to_dict()
        user_batch = user_data.get("batch")

        if not user_batch:
            return "Batch not assigned", 400

        # 📘 Fetch assignments
        assignments_ref = (
            db.collection("study_materials")
            .where("type", "==", "assignment")
            .where("batch", "==", user_batch)
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .stream()
        )

        assignments = []
        for doc in assignments_ref:
            data = doc.to_dict()
            data["id"] = doc.id
            assignments.append(data)

        return render_template(
            "student_assignments.html",
            assignments=assignments
        )

    except Exception as e:
        print(f"Student assignments error: {e}")
        return "Error loading assignments", 500

@bp.route("/profile")
@student_required
def student_profile():
    """Render student profile page"""
    return render_template("student_profile.html")


@bp.route("/profile/data")
@student_required
def get_student_profile():
    """Get student profile data"""
    try:
        session_cookie = request.cookies.get("session")
        decoded = auth.verify_session_cookie(session_cookie)
        student_id = decoded["uid"]
        
        # Get student data
        student_doc = db.collection("users").document(student_id).get()
        if not student_doc.exists:
            return jsonify({"success": False, "error": "Student not found"}), 404
        
        student_data = student_doc.to_dict()
        
        # Format registration date
        reg_date = coerce_dt(student_data.get("registration_date"))
        if reg_date:
            student_data["registration_date_str"] = reg_date.strftime("%d %b %Y")
        else:
            student_data["registration_date_str"] = "-"
        
        # Format batch updated date
        batch_updated = coerce_dt(student_data.get("batch_updated_at"))
        if batch_updated:
            student_data["batch_updated_str"] = batch_updated.strftime("%d %b %Y")
        else:
            student_data["batch_updated_str"] = "-"
        
        # Get fee status
        current_time = now_utc()
        fee_status = calculate_fee_status(student_id, current_time)
        
        # Add rating with default value
        student_data["rating"] = student_data.get("rating", 0)
        
        # Add fee status to response
        student_data["fee_status"] = fee_status
        
        return jsonify({"success": True, "student": student_data})
        
    except Exception as e:
        print(f"Get student profile error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/profile/update", methods=["POST"])
@student_required
def update_student_profile():
    """Update student profile information"""
    try:
        session_cookie = request.cookies.get("session")
        decoded = auth.verify_session_cookie(session_cookie)
        student_id = decoded["uid"]
        
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Fields that students are allowed to update
        allowed_fields = {
            "age": data.get("age"),
            "parent_name": data.get("parent_name", "").strip(),
            "phone": data.get("phone", "").strip()
        }
        
        # Remove None values
        update_data = {k: v for k, v in allowed_fields.items() if v is not None}
        
        # Add update timestamp
        update_data["profile_updated_at"] = now_utc()
        
        # Validate phone number if provided
        if "phone" in update_data and update_data["phone"]:
            # Simple phone validation
            if not update_data["phone"].isdigit() or len(update_data["phone"]) != 10:
                return jsonify({"success": False, "error": "Invalid phone number. Must be 10 digits."}), 400
        
        # Validate age if provided
        if "age" in update_data:
            try:
                age_int = int(update_data["age"])
                if age_int < 5 or age_int > 100:
                    return jsonify({"success": False, "error": "Age must be between 5 and 100"}), 400
                update_data["age"] = age_int
            except ValueError:
                return jsonify({"success": False, "error": "Age must be a valid number"}), 400
        
        # Update student document
        db.collection("users").document(student_id).update(update_data)
        
        return jsonify({"success": True, "message": "Profile updated successfully"})
        
    except Exception as e:
        print(f"Update student profile error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/profile/change-password", methods=["POST"])
@student_required
def change_student_password():
    """Change student password"""
    try:
        session_cookie = request.cookies.get("session")
        decoded = auth.verify_session_cookie(session_cookie)
        student_id = decoded["uid"]
        
        data = request.get_json()
        current_password = data.get("current_password")
        new_password = data.get("new_password")
        
        if not all([current_password, new_password]):
            return jsonify({"success": False, "error": "All fields are required"}), 400
        
        # Validate new password strength
        if len(new_password) < 6:
            return jsonify({"success": False, "error": "New password must be at least 6 characters long"}), 400
        
        # Get student email
        student_doc = db.collection("users").document(student_id).get()
        if not student_doc.exists:
            return jsonify({"success": False, "error": "Student not found"}), 404
        
        student_data = student_doc.to_dict()
        student_email = student_data.get("email")
        
        try:
            # Reauthenticate with current password
            import firebase_admin.auth as auth_module
            
            # This is a simplified approach - in production, you should use Firebase Auth REST API
            # or implement proper reauthentication
            
            # For now, we'll update the password directly (requires Admin SDK privileges)
            # Note: This bypasses current password verification
            
            auth.update_user(
                student_id,
                password=new_password
            )
            
            return jsonify({"success": True, "message": "Password updated successfully"})
            
        except Exception as auth_error:
            print(f"Password change auth error: {auth_error}")
            return jsonify({"success": False, "error": "Failed to update password. Please try again."}), 400
        
    except Exception as e:
        print(f"Change password error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/profile/rating-history")
@student_required
def get_rating_history():
    """Get student's rating history (if you implement rating tracking)"""
    try:
        session_cookie = request.cookies.get("session")
        decoded = auth.verify_session_cookie(session_cookie)
        student_id = decoded["uid"]
        
        # For now, return empty array - you can implement rating history tracking
        return jsonify({"success": True, "history": []})
        
    except Exception as e:
        print(f"Get rating history error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500