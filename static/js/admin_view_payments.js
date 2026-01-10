// Variables for modal
let currentRejectPaymentId = null;
let currentRejectStudentId = null;

// --- 1. Tab Switching Logic ---
function switchTab(tabName) {
    const tabContents = document.querySelectorAll('.tab-content');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    // Hide all
    tabContents.forEach(el => el.classList.remove('active'));
    tabBtns.forEach(el => el.classList.remove('active'));

    // Show target
    const activeTab = document.getElementById('tab-' + tabName);
    activeTab.classList.add('active');
    
    // Activate Button
    const btnIndex = tabName === 'pending' ? 0 : 1;
    tabBtns[btnIndex].classList.add('active');

    // Month Filter Visibility
    const monthFilterContainer = document.querySelector('.month-filter-container');
    if (tabName === 'history') {
        monthFilterContainer.style.display = 'block';
    } else {
        monthFilterContainer.style.display = 'none';
        document.getElementById('monthFilter').value = 'all';
    }

    filterPayments();
}

// --- 2. Filtering Logic ---
function filterPayments() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const planFilter = document.getElementById('planFilter').value;
    const monthFilter = document.getElementById('monthFilter').value;
    
    const activeTabId = document.querySelector('.tab-content.active').id;
    const listId = activeTabId === 'tab-pending' ? 'pending-list' : 'history-list';
    const listContainer = document.getElementById(listId);

    const rows = listContainer.querySelectorAll('.pay-row');
    let visibleCount = 0;

    rows.forEach(row => {
        const name = row.dataset.name;
        const plan = row.dataset.plan;
        let monthMatch = true;

        // Date filtering for history
        if (activeTabId === 'tab-history' && monthFilter !== 'all') {
            const dateText = row.querySelector('.date-text').textContent;
            // Assumes format like "12 Jan 2024" or similar
            const monthMap = { 
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' 
            };
            // Try to find the month abbreviation in the date string
            const foundMonth = Object.keys(monthMap).find(m => dateText.includes(m));
            if (foundMonth) {
                monthMatch = monthMap[foundMonth] === monthFilter;
            }
        }

        const matchName = name.includes(searchText);
        const matchPlan = planFilter === 'all' || plan === planFilter;

        if (matchName && matchPlan && monthMatch) {
            row.style.display = window.innerWidth > 1024 ? 'grid' : 'flex'; // maintain display type
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    // Toggle Empty Message
    const emptyMsg = listContainer.querySelector('.empty-msg');
    emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
}

// --- 3. Verification API ---
function verifyPayment(paymentId) {
    if (!confirm("Are you sure you want to verify this payment?")) return;

    const btn = document.querySelector(`#row-${paymentId} .btn-verify`);
    const originalText = btn.textContent;
    btn.textContent = "Processing...";
    btn.disabled = true;

    fetch('/admin/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            window.location.reload();
        } else {
            alert(data.error || "Verification failed");
            btn.textContent = originalText;
            btn.disabled = false;
        }
    })
    .catch(err => {
        alert("Network error");
        btn.textContent = originalText;
        btn.disabled = false;
    });
}

// --- 4. Rejection Modal Logic ---
function openRejectModal(paymentId, studentId) {
    currentRejectPaymentId = paymentId;
    currentRejectStudentId = studentId;
    document.getElementById('rejectionReason').value = '';
    document.getElementById('rejectModal').style.display = 'flex';
}

function closeRejectModal() {
    document.getElementById('rejectModal').style.display = 'none';
    currentRejectPaymentId = null;
    currentRejectStudentId = null;
}

function confirmRejectPayment() {
    const reason = document.getElementById('rejectionReason').value.trim();
    if (!reason) {
        alert("Please provide a reason.");
        return;
    }

    fetch('/admin/reject-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            payment_id: currentRejectPaymentId,
            student_id: currentRejectStudentId,
            reason: reason
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            closeRejectModal();
            window.location.reload();
        } else {
            alert(data.error || "Rejection failed");
        }
    })
    .catch(err => alert("Network error"));
}

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    // Update pending count
    const pendingCount = document.querySelectorAll('#pending-list .pay-row').length;
    document.getElementById('pending-count').textContent = pendingCount;
    
    // Initial filter
    filterPayments();

    // Modal close on outside click
    const modal = document.getElementById('rejectModal');
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeRejectModal();
    });
});