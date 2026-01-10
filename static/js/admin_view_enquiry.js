document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".complete-btn");

    buttons.forEach(btn => {
        btn.addEventListener("click", async () => {
            const enquiryId = btn.dataset.id;
            const row = document.getElementById(`enquiry-${enquiryId}`);

            if (!confirm("Mark this enquiry as completed? This will remove it from the list.")) return;

            const originalText = btn.innerHTML;
            btn.innerText = "Processing...";
            btn.style.opacity = "0.7";
            btn.disabled = true;

            try {
                const res = await fetch(`/admin/enquiries/delete/${enquiryId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin"  // <<< THIS IS CRUCIAL
                });

                const data = await res.json();

                if (data.success) {
                    row.style.transition = "all 0.5s ease";
                    row.style.opacity = "0";
                    row.style.transform = "translateX(20px)";

                    setTimeout(() => {
                        row.remove();
                        if (document.querySelectorAll("tbody tr").length === 0) {
                            location.reload();
                        }
                    }, 500);
                } else {
                    alert("Error: " + (data.error || "Could not delete"));
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            } catch (err) {
                console.error(err);
                alert("Server error. Please try again.");
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    });
});
