document.addEventListener("DOMContentLoaded", function () {

    const container = document.querySelector(".admin-container") || document.body;

    /* ------------------------------
       VERIFY PAYMENT (New Applicants)
    ------------------------------ */
    container.addEventListener("click", function (e) {
        const btn = e.target.closest(".verify-payment");
        if (!btn) return;

        e.preventDefault();

        const studentId = btn.dataset.studentId;
        const paymentId = btn.dataset.paymentId;

        if (!studentId || !paymentId) {
            alert("Missing student or payment ID");
            return;
        }

        if (!confirm("Verify this payment?")) return;

        btn.disabled = true;
        btn.innerText = "Verifying...";

        fetch("/admin/new-applicants/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                student_id: studentId,
                payment_id: paymentId
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert("✓ Payment verified");
                location.reload();
            } else {
                alert(data.error || "Verification failed");
                btn.disabled = false;
                btn.innerText = "✓ Verify Payment";
            }
        })
        .catch(err => {
            console.error(err);
            alert("Server error");
            btn.disabled = false;
            btn.innerText = "✓ Verify Payment";
        });
    });

    /* ------------------------------
       REJECT PAYMENT
    ------------------------------ */
    container.addEventListener("click", function (e) {
        const btn = e.target.closest(".reject-payment");
        if (!btn) return;

        e.preventDefault();

        const studentId = btn.dataset.studentId;
        const paymentId = btn.dataset.paymentId;

        const reason = prompt("Enter rejection reason:");
        if (!reason) return;

        btn.disabled = true;
        btn.innerText = "Rejecting...";

        fetch("/admin/reject-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                student_id: studentId,
                payment_id: paymentId,
                reason: reason
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert("Payment rejected");
                location.reload();
            } else {
                alert(data.error || "Rejection failed");
                btn.disabled = false;
                btn.innerText = "✗ Reject Payment";
            }
        })
        .catch(err => {
            console.error(err);
            alert("Server error");
            btn.disabled = false;
            btn.innerText = "✗ Reject Payment";
        });
    });

    /* ------------------------------
       ASSIGN BATCH (Activates student)
    ------------------------------ */
    container.addEventListener("click", function (e) {
        const btn = e.target.closest(".assign-batch");
        if (!btn) return;

        e.preventDefault();

        const studentId = btn.dataset.studentId;
        const card = btn.closest(".applicant-card");
        const select = card.querySelector(".batch-select");

        if (!select || !select.value) {
            alert("Please select a batch first");
            return;
        }

        if (!confirm(`Assign batch "${select.value}" and activate student?`)) return;

        btn.disabled = true;
        btn.innerText = "Assigning...";

        fetch("/admin/assign-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                student_id: studentId,
                batch: select.value
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert("✓ Batch assigned, student activated");
                location.reload();
            } else {
                alert(data.error || "Batch assignment failed");
                btn.disabled = false;
                btn.innerText = "Assign Batch";
            }
        })
        .catch(err => {
            console.error(err);
            alert("Server error");
            btn.disabled = false;
            btn.innerText = "Assign Batch";
        });
    });

});
