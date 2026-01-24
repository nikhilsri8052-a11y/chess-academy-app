"""
Admin Routes
"""
from flask import Blueprint, render_template, request, jsonify, make_response
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from firebase_admin import auth, firestore
from app.utils.firebase_init import db
from app.utils.helpers import now_utc, coerce_dt, calculate_fee_status
from app.utils.auth_utils import admin_required
from dateutil.relativedelta import relativedelta

bp = Blueprint('admin', __name__, url_prefix='/admin')

@bp.route("/")
@admin_required
def admin_dashboard():
    try:
        current_time = now_utc()
        
        stats = {
            'total_students': 0,
            'active_students': 0,
            'new_students': 0,
            'disabled_students': 0,
            'fees_paid_count': 0,
            'fees_unpaid_count': 0,
            'batch_distribution': defaultdict(int),
            'recent_registrations': [],
            'new_enquiry_count': 0,
            'new_applicant_count': 0,
            'new_payment_count': 0,
            'recent_activities': []
        }

        try:
            all_students = list(db.collection("users").where("role", "==", "student").stream())
            stats['total_students'] = len(all_students)
            
            for doc in all_students:
                student = doc.to_dict()
                student_id = doc.id
                
                status = student.get('status', 'new')
                if status == 'active':
                    stats['active_students'] += 1
                elif status == 'new':
                    stats['new_students'] += 1
                elif status == 'disabled':
                    stats['disabled_students'] += 1
                
                try:
                    fee_status = calculate_fee_status(student_id, current_time)
                    if fee_status.get('is_paid'):
                        stats['fees_paid_count'] += 1
                    else:
                        stats['fees_unpaid_count'] += 1
                except Exception:
                    stats['fees_unpaid_count'] += 1
                
                batch = student.get('batch', 'Unassigned')
                if not batch: 
                    batch = 'Unassigned'
                stats['batch_distribution'][batch] += 1
                
                reg_date = coerce_dt(student.get('registration_date'))
                if reg_date:
                    days_diff = (current_time - reg_date).days
                    if days_diff <= 30:
                        stats['recent_registrations'].append({
                            'name': student.get('name', 'Unknown'),
                            'date': reg_date.strftime('%d %b'),
                            'batch': batch
                        })

            stats['recent_registrations'].sort(key=lambda x: x['date'], reverse=True)
            stats['recent_registrations'] = stats['recent_registrations'][:5]
            
            stats['batch_distribution'] = dict(stats['batch_distribution'])

        except Exception as e:
            print(f"Error processing students: {e}")

        try:
            stats['new_enquiry_count'] = len(list(
                db.collection("enquiries").where("status", "==", "new").stream()
            ))
            
            stats['new_applicant_count'] = len(list(
                db.collection("users")
                .where("role", "==", "student")
                .where("status", "==", "new")
                .stream()
            ))
            
            stats['new_payment_count'] = len(list(
                db.collection("payments").where("status", "==", "submitted").stream()
            ))
        except Exception as e:
            print(f"Error processing counts: {e}")

        try:
            recent_notices = []
            for doc in db.collection("notices").order_by("created_at", direction=firestore.Query.DESCENDING).limit(3).stream():
                notice = doc.to_dict()
                created = coerce_dt(notice.get('created_at'))
                recent_notices.append({
                    'type': 'notice',
                    'title': notice.get('title', 'Untitled'),
                    'time': created.strftime('%d %b, %I:%M %p') if created else 'Recently'
                })
            
            recent_materials = []
            for doc in db.collection("study_materials").order_by("created_at", direction=firestore.Query.DESCENDING).limit(2).stream():
                material = doc.to_dict()
                created = coerce_dt(material.get('created_at'))
                recent_materials.append({
                    'type': 'material',
                    'title': material.get('title', 'Untitled'),
                    'time': created.strftime('%d %b, %I:%M %p') if created else 'Recently'
                })
            
            stats['recent_activities'] = recent_notices + recent_materials
            stats['recent_activities'] = stats['recent_activities'][:5]
        except Exception as e:
            print(f"Error processing activities: {e}")

        return render_template("admin_dashboard.html", stats=stats, now_utc=now_utc)
        
    except Exception as e:
        print(f"CRITICAL Dashboard error: {e}")
        import traceback
        traceback.print_exc()
        return render_template("admin_dashboard.html", stats={
            'total_students': 0, 'active_students': 0, 'new_students': 0,
            'fees_paid_count': 0, 'fees_unpaid_count': 0,
            'batch_distribution': {}, 'recent_registrations': [], 'recent_activities': [],
            'new_enquiry_count': 0, 'new_applicant_count': 0, 'new_payment_count': 0
        }, now_utc=now_utc)
        
@bp.route("/enquiries")
@admin_required
def admin_enquiries():
    enquiries = []

    docs = list(
        db.collection("enquiries")
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .stream()
    )

    batch = db.batch()
    batch_has_updates = False

    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        enquiries.append(data)

        # auto new → seen
        if data.get("status") == "new":
            batch.update(doc.reference, {"status": "seen"})
            batch_has_updates = True

    if batch_has_updates:
        batch.commit()

    return render_template(
        "admin_view_enquiry.html",
        enquiries=enquiries
    )


@bp.route("/enquiries/delete/<enquiry_id>", methods=["POST"])
@admin_required
def delete_enquiry(enquiry_id):
    try:
        ref = db.collection("enquiries").document(enquiry_id)

        if not ref.get().exists:
            return jsonify({"success": False, "error": "Not found"}), 404

        ref.delete()

        return jsonify({"success": True})

    except Exception as e:
        print("Delete enquiry error:", e)
        return jsonify({"success": False, "error": "Server error"}), 500


@bp.route("/new-applicants")
@admin_required
def new_applicants():
    """
    Show ONLY students whose status is 'new'.
    """
    try:
        # JSON count (dashboard)
        if request.args.get('json') == '1':
            count = 0
            for doc in db.collection("users") \
                          .where("role", "==", "student") \
                          .where("status", "==", "new") \
                          .stream():
                count += 1
            return jsonify({"count": count})

        students = []

        # Fetch ONLY new students
        for doc in db.collection("users") \
                      .where("role", "==", "student") \
                      .where("status", "==", "new") \
                      .stream():

            student_data = doc.to_dict()
            student_id = doc.id
            student_data["id"] = student_id

            # Fetch latest payment
            payment_docs = (
                db.collection("payments")
                .where("student_id", "==", student_id)
                .stream()
            )

            payment_data = None
            latest_timestamp = None

            for payment_doc in payment_docs:
                p = payment_doc.to_dict()
                status = p.get("status")

                if status in ["submitted", "verified", "rejected"]:
                    created_at = coerce_dt(p.get("created_at"))
                    if payment_data is None or (
                        created_at and (
                            latest_timestamp is None or created_at > latest_timestamp
                        )
                    ):
                        payment_data = p
                        payment_data["payment_id"] = payment_doc.id
                        latest_timestamp = created_at

            student_data["payment"] = payment_data
            students.append(student_data)

        # Sort newest first
        students.sort(
            key=lambda x: x.get("registration_date") or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True
        )

        return render_template("new_applicant.html", students=students)

    except Exception as e:
        print(f"new_applicants error: {e}")
        import traceback
        traceback.print_exc()
        return f"Error loading applicants: {str(e)}", 500


@bp.route("/new-applicants/verify", methods=["POST"])
@admin_required
def verify_payment_new_applicant():
    try:
        data = request.get_json()
        student_id = data.get("student_id")
        payment_id = data.get("payment_id")

        if not student_id or not payment_id:
            return jsonify({"success": False, "error": "Missing data"}), 400

        # Update payment
        db.collection("payments").document(payment_id).update({
            "status": "verified",
            "verified_at": now_utc()
        })

        # Update student (status remains "new")
        db.collection("users").document(student_id).update({
            "payment_verified": True,
            "fees_paid": True
        })

        return jsonify({"success": True})

    except Exception as e:
        print("New Applicant Verify Error:", e)
        return jsonify({"success": False, "error": "Server error"}), 500


@bp.route("/reject-payment", methods=["POST"])
@admin_required
def reject_payment():
    data = request.get_json()
    student_id = data.get("student_id")
    payment_id = data.get("payment_id")
    reason = data.get("reason", "Not specified")

    db.collection("payments").document(payment_id).update({
        "status": "rejected",
        "rejection_reason": reason,
        "rejected_at": now_utc()
    })

    return jsonify({"success": True})


@bp.route("/assign-batch", methods=["POST"])
@admin_required
def assign_batch():
    try:
        data = request.get_json()
        student_id = data.get("student_id")
        batch = data.get("batch")

        if not all([student_id, batch]):
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        db.collection("users").document(student_id).update({
            "batch": batch,
            "batch_updated_at": now_utc(),
            "status": "active",
            "status_updated_at": now_utc()
        })

        return jsonify({"success": True, "message": "Batch assigned, student activated"})

    except Exception as e:
        print(f"assign_batch error: {e}")
        return jsonify({"success": False, "error": "Server error"}), 500


@bp.route("/payments")
@admin_required
def admin_payments_view():
    try:
        payments_ref = (
            db.collection("payments")
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .stream()
        )

        all_payments = []
        user_cache = {}

        for doc in payments_ref:
            p_data = doc.to_dict()
            p_data["id"] = doc.id

            # ---- Date formatting ----
            created_at = coerce_dt(p_data.get("created_at"))
            if created_at:
                try:
                    p_data["date_str"] = created_at.strftime("%d %b, %I:%M %p")
                except Exception:
                    p_data["date_str"] = str(created_at)
            else:
                p_data["date_str"] = "Unknown Date"

            # ---- Fetch student info ----
            sid = p_data.get("student_id")
            p_data["student_name"] = "Unknown Student"
            p_data["batch"] = None

            if sid:
                if sid in user_cache:
                    cached = user_cache[sid]
                else:
                    u_doc = db.collection("users").document(sid).get()
                    if u_doc.exists:
                        u = u_doc.to_dict()
                        cached = {
                            "name": u.get("name", "Unknown Student"),
                            "batch": u.get("batch")
                        }
                    else:
                        cached = {"name": "Deleted User", "batch": None}

                    user_cache[sid] = cached

                p_data["student_name"] = cached["name"]
                p_data["batch"] = cached["batch"]

            all_payments.append(p_data)

        return render_template(
            "admin_view_payments.html",
            payments=all_payments
        )

    except Exception as e:
        print("Admin Payments Error:", e)
        return "Error loading payments", 500


@bp.route("/payment/verify", methods=["POST"])
@admin_required
def admin_verify_payment():
    try:
        data = request.get_json()
        payment_id = data.get("payment_id")

        if not payment_id:
            return jsonify({"success": False, "error": "Missing payment ID"}), 400

        payment_ref = db.collection("payments").document(payment_id)
        payment_doc = payment_ref.get()

        if not payment_doc.exists:
            return jsonify({"success": False, "error": "Payment not found"}), 404

        payment_data = payment_doc.to_dict()
        student_id = payment_data.get("student_id")
        plan = payment_data.get("plan", "1month") 

        if not student_id:
            return jsonify({"success": False, "error": "Student ID missing"}), 400

        current_time = now_utc()

        # 1. Check existing status 
        current_status = calculate_fee_status(student_id, current_time)
        
        # Determine Start Date
        base_date = current_time
        if current_status['is_paid'] and current_status['expires_at']:
            # Check if expiry is in future, if so extend from there
            if current_status['expires_at'] > current_time:
                 base_date = current_status['expires_at']

        # 2. Calculate New Expiry
        if plan == "3months":
            new_expiry = base_date + relativedelta(months=3)
        else:
            new_expiry = base_date + relativedelta(months=1)

        # 3. Update payment 
        payment_ref.update({
            "status": "verified",
            "verified_at": current_time,
            "expires_at": new_expiry 
        })

        # 4. Update user
        user_ref = db.collection("users").document(student_id)
        user_ref.update({
            "fees_paid": True,
            "payment_verified": True,
            "status": "active",
            "status_updated_at": current_time
        })

        return jsonify({"success": True})

    except Exception as e:
        print("Verify Error:", e)
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/notices")
@admin_required
def admin_notices():
    return render_template("admin_notice.html")


@bp.route("/notices/create", methods=["POST"])
@admin_required
def create_notice():
    try:
        data = request.get_json()
        title = data.get("title", "").strip()
        content = data.get("content", "").strip()
        batch = data.get("batch", "all")
        
        if not title or not content:
            return jsonify({"success": False, "error": "Title and content are required"}), 400
        
        session_cookie = request.cookies.get("session")
        decoded = auth.verify_session_cookie(session_cookie)
        admin_id = decoded["uid"]
        
        admin_doc = db.collection("users").document(admin_id).get()
        admin_name = admin_doc.to_dict().get("name", "Admin") if admin_doc.exists else "Admin"
        
        notice_data = {
            "title": title,
            "content": content,
            "batch": batch,
            "created_by": admin_id,
            "created_by_name": admin_name,
            "created_at": now_utc(),
            "priority": data.get("priority", "normal")
        }
        
        db.collection("notices").add(notice_data)
        
        return jsonify({"success": True})
        
    except Exception as e:
        print(f"Create notice error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/notices/list")
@admin_required
def list_admin_notices():
    try:
        batches = ["all", "online1", "online2", "offline_advance", "offline_base"]
        notices_by_batch = {}
        
        for batch in batches:
            batch_notices = (
                db.collection("notices")
                .where("batch", "in", [batch, "all"]) 
                .order_by("created_at", direction=firestore.Query.DESCENDING)
                .limit(5)
                .stream()
            )
            
            notices_list = []
            for doc in batch_notices:
                notice_data = doc.to_dict()
                notice_data["id"] = doc.id
                
                created = coerce_dt(notice_data.get("created_at"))
                if created:
                    notice_data["created_at_str"] = created.strftime("%d %b %Y, %I:%M %p")
                else:
                    notice_data["created_at_str"] = "Recently"
                    
                notices_list.append(notice_data)
            
            notices_by_batch[batch] = notices_list
        
        return jsonify({"success": True, "notices": notices_by_batch})
        
    except Exception as e:
        print(f"List notices error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/notices/delete/<notice_id>", methods=["POST"])
@admin_required
def delete_notice(notice_id):
    try:
        db.collection("notices").document(notice_id).delete()
        return jsonify({"success": True})
    except Exception as e:
        print(f"Delete notice error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/students")
@admin_required
def admin_students():
    return render_template("admin_students.html")


@bp.route("/students/list")
@admin_required
def list_students():
    try:
        search = request.args.get('search', '').strip().lower()
        batch_filter = request.args.get('batch', '')
        fees_filter = request.args.get('fees', '')
        status_filter = request.args.get('status', '')
        sort = request.args.get('sort', 'newest')
        
        students_ref = db.collection("users").where(filter=firestore.FieldFilter("role", "==", "student"))
        
        if status_filter:
            students_ref = students_ref.where(filter=firestore.FieldFilter("status", "==", status_filter))
        
        students = []
        current_time = now_utc()
        
        for doc in students_ref.stream():
            student_data = doc.to_dict()
            student_data["id"] = doc.id
            
            if batch_filter and student_data.get("batch") != batch_filter:
                continue
            
            if search:
                searchable = f"{student_data.get('name', '').lower()} {student_data.get('email', '').lower()} {student_data.get('phone', '')}"
                if search not in searchable:
                    continue
            
            fee_status = calculate_fee_status(doc.id, current_time)
            student_data["fee_status"] = fee_status
            
            if fees_filter == 'paid' and not fee_status['is_paid']:
                continue
            elif fees_filter == 'unpaid' and fee_status['is_paid']:
                continue
            
            student_data["rating"] = student_data.get("rating", 0)
            
            reg_date = student_data.get("registration_date")
            reg_date = coerce_dt(reg_date)
            if reg_date:
                student_data["registration_date_str"] = reg_date.strftime("%d %b %Y")
            else:
                student_data["registration_date_str"] = "-"
            
            students.append(student_data)
        
        if sort == 'rating_high':
            students.sort(key=lambda x: x.get("rating", 0), reverse=True)
        elif sort == 'rating_low':
            students.sort(key=lambda x: x.get("rating", 0))
        elif sort == 'name':
            students.sort(key=lambda x: x.get("name", "").lower())
        else:
            students.sort(key=lambda x: x.get("registration_date") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
        
        return jsonify({"success": True, "students": students})
        
    except Exception as e:
        print(f"List students error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/students/add-offline-payment", methods=["POST"])
@admin_required
def add_offline_payment():
    try:
        data = request.get_json()
        student_id = data.get("student_id")
        plan = data.get("plan") 
        payment_method = data.get("payment_method", "cash")
        notes = data.get("notes", "")

        if not student_id or plan not in ["1month", "3months"]:
            return jsonify({"success": False, "error": "Invalid plan or missing ID"}), 400

        current_time = now_utc()
        current_status = calculate_fee_status(student_id, current_time)
        
        base_date = current_time
        is_extension = False
        
        if current_status['is_paid'] and current_status['expires_at']:
            # Only extend if not expired
            if current_status['expires_at'] > current_time:
                base_date = current_status['expires_at']
                is_extension = True

        if plan == "1month":
            new_expiry = base_date + relativedelta(months=1)
            amount = 3000
        else:
            new_expiry = base_date + relativedelta(months=3)
            amount = 7500

        payment_data = {
            "student_id": student_id,
            "plan": plan,
            "amount": amount,
            "status": "verified",
            "payment_method": payment_method,
            "created_at": current_time,
            "verified_at": current_time,
            "expires_at": new_expiry, 
            "notes": notes or f"Offline payment ({payment_method})",
            "offline_payment": True
        }
        
        db.collection("payments").add(payment_data)
        
        db.collection("users").document(student_id).update({
            "status": "active", 
            "status_updated_at": current_time,
            "payment_verified": True
        })
        
        return jsonify({
            "success": True, 
            "extended": is_extension,
            "expiry_date": new_expiry.strftime("%d %b %Y")
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/students/toggle-status", methods=["POST"])
@admin_required
def toggle_student_status():
    try:
        data = request.get_json()
        student_id = data.get("student_id")
        new_status = data.get("status") 
        
        if not student_id or new_status not in ['active', 'disabled']:
            return jsonify({"success": False, "error": "Invalid parameters"}), 400
        
        db.collection("users").document(student_id).update({
            "status": new_status,
            "status_updated_at": now_utc()
        })
        
        return jsonify({"success": True, "message": f"Student {new_status}"})
        
    except Exception as e:
        print(f"Toggle status error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/students/update-batch", methods=["POST"])
@admin_required
def update_student_batch():
    try:
        data = request.get_json()
        student_id = data.get("student_id")
        batch = data.get("batch")
        
        if not student_id or not batch:
            return jsonify({"success": False, "error": "Missing parameters"}), 400
                
        db.collection("users").document(student_id).update({
            "batch": batch,
            "batch_updated_at": now_utc(),
            "status": "active",
            "status_updated_at": now_utc()
        })
        
        return jsonify({"success": True, "message": "Batch updated and student activated"})
        
    except Exception as e:
        print(f"Update batch error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/students/fee-history/<student_id>")
@admin_required
def student_fee_history(student_id):
    try:
        current_time = now_utc()
        
        payment_docs = (
            db.collection("payments")
            .where("student_id", "==", student_id)
            .stream()
        )
        
        verified_payments = []
        for doc in payment_docs:
            payment = doc.to_dict()
            
            if payment.get("status") != "verified":
                continue
                
            payment["id"] = doc.id
            
            verified_at = coerce_dt(payment.get("verified_at"))
            plan = payment.get("plan")
            
            if verified_at and plan:
                # Use stored expires_at if available, otherwise calculate
                expires_at = coerce_dt(payment.get("expires_at"))
                if not expires_at:
                    if plan == "1month":
                        expires_at = verified_at + timedelta(days=30)
                    elif plan == "3months":
                        expires_at = verified_at + timedelta(days=90)
                
                payment["verified_at_str"] = verified_at.strftime("%d %b %Y")
                if expires_at:
                    payment["expiry_str"] = expires_at.strftime("%d %b %Y")
                    payment["is_active"] = expires_at > current_time
                else:
                    payment["expiry_str"] = "-"
                    payment["is_active"] = False
                
                payment["verified_at_timestamp"] = verified_at
                verified_payments.append(payment)
        
        verified_payments.sort(key=lambda x: x.get("verified_at_timestamp", datetime.min.replace(tzinfo=timezone.utc)), reverse=True)
        
        return jsonify({"success": True, "payments": verified_payments})
        
    except Exception as e:
        print(f"Fee history error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/students/export")
@admin_required
def export_students():
    try:
        import csv
        from io import StringIO
        
        students_ref = db.collection("users").where("role", "==", "student").stream()
        current_time = now_utc()
        
        output = StringIO()
        writer = csv.writer(output)
        
        writer.writerow([
            'Name', 'Email', 'Phone', 'Age', 'Batch', 
            'Status', 'Fees Paid', 'Fee Expiry', 'Registration Date'
        ])
        
        for doc in students_ref:
            student = doc.to_dict()
            fee_status = calculate_fee_status(doc.id, current_time)
            reg_date = coerce_dt(student.get('registration_date'))
            
            writer.writerow([
                student.get('name', ''),
                student.get('email', ''),
                student.get('phone', ''),
                student.get('age', ''),
                student.get('batch', ''),
                student.get('status', ''),
                'Yes' if fee_status['is_paid'] else 'No',
                fee_status['expires_at_str'],
                reg_date.strftime('%Y-%m-%d') if reg_date else ''
            ])
        
        output.seek(0)
        response = make_response(output.getvalue())
        response.headers["Content-Disposition"] = "attachment; filename=students.csv"
        response.headers["Content-Type"] = "text/csv"
        
        return response
        
    except Exception as e:
        print(f"Export error: {e}")
        return "Export failed", 500


@bp.route("/study-materials")
@admin_required
def admin_study_materials():
    return render_template("admin_study_materials.html")


@bp.route("/study-materials/create", methods=["POST"])
@admin_required
def create_study_material():
    try:
        data = request.get_json()
        
        title = data.get("title", "").strip()
        description = data.get("description", "").strip()
        link = data.get("link", "").strip()
        batch = data.get("batch", "all")
        material_type = data.get("type", "notes")
        
        if not all([title, description, link]):
            return jsonify({"success": False, "error": "Title, Description, and Link are required"}), 400
        
        session_cookie = request.cookies.get("session")
        decoded = auth.verify_session_cookie(session_cookie)
        admin_id = decoded["uid"]
        
        admin_doc = db.collection("users").document(admin_id).get()
        admin_name = admin_doc.to_dict().get("name", "Admin") if admin_doc.exists else "Admin"
        
        material_data = {
            "title": title,
            "description": description,
            "link": link,
            "batch": batch,
            "type": material_type,
            "created_by": admin_id,
            "created_by_name": admin_name,
            "created_at": now_utc()
        }
        
        db.collection("study_materials").add(material_data)
        
        return jsonify({"success": True})
        
    except Exception as e:
        print(f"Create study material error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/study-materials/list")
@admin_required
def list_admin_study_materials():
    try:
        batches = ["all", "online1", "online2", "offline_advance", "offline_base"]
        materials_by_batch = {batch: [] for batch in batches}
        
        all_materials = db.collection("study_materials").order_by(
            "created_at", direction=firestore.Query.DESCENDING
        ).limit(50).stream()
        
        for doc in all_materials:
            m = doc.to_dict()
            m["id"] = doc.id
            
            ts = coerce_dt(m.get("created_at"))
            if ts:
                m["created_at_str"] = ts.strftime("%d %b %Y")
            else:
                m["created_at_str"] = "Recently"
            
            item_batch = m.get("batch", "all")
            
            if item_batch in materials_by_batch:
                materials_by_batch[item_batch].append(m)
            
            if item_batch == "all":
                for key in batches:
                    if key != "all":
                        materials_by_batch[key].append(m)
            
            if item_batch != "all":
                 materials_by_batch["all"].append(m)

        return jsonify({"success": True, "materials": materials_by_batch})
    except Exception as e:
        print(f"List study materials error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/study-materials/delete/<material_id>", methods=["POST"])
@admin_required
def delete_study_material(material_id):
    try:
        db.collection("study_materials").document(material_id).delete()
        return jsonify({"success": True})
    except Exception as e:
        print(f"Delete study material error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@bp.route("/students/update-rating", methods=["POST"])
@admin_required
def update_student_rating():
    try:
        data = request.get_json(silent=True) or {}
        student_id = data.get("student_id")
        rating = data.get("rating")

        if not student_id or rating is None:
            return jsonify({"success": False, "error": "Missing data"}), 400

        rating = int(rating)
        if rating < 0 or rating > 3000:
            return jsonify({"success": False, "error": "Invalid rating"}), 400

        db.collection("users").document(student_id).update({
            "rating": rating,
            "rating_updated_at": now_utc()
        })

        return jsonify({"success": True})

    except Exception as e:
        print("UPDATE RATING ERROR:", e)
        return jsonify({"success": False, "error": "Server error"}), 500