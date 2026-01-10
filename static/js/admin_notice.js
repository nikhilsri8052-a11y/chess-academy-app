document.addEventListener('DOMContentLoaded', function() {
    loadNotices();
    setupForm();
});

function loadNotices() {
    // Simulate API call for demonstration (Replace with actual fetch)
    fetch('/admin/notices/list')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                displayNotices(data.notices);
            } else {
                // Fallback for demo purposes if backend isn't ready
                console.log("Using demo data");
            }
        })
        .catch(err => console.error('Error loading notices:', err));
}

function displayNotices(noticesByBatch) {
    const batches = ['online1', 'online2', 'offline_advance', 'offline_base', 'all'];
    
    batches.forEach(batch => {
        const container = document.getElementById(`notices-${batch}`);
        const countBadge = document.getElementById(`count-${batch}`);
        const notices = noticesByBatch[batch] || [];
        
        // Update Count
        countBadge.textContent = notices.length;
        
        // Handle Empty State
        if (notices.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="ph-tray" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                    No notices yet
                </div>`;
            return;
        }
        
        // Build HTML
        let html = '';
        notices.forEach(notice => {
            // Determine badge text
            let badgeText = notice.priority.charAt(0).toUpperCase() + notice.priority.slice(1);
            
            html += `
                <div class="notice-card ${notice.priority}" id="notice-${notice.id}">
                    <div class="card-top">
                        <span class="priority-badge">${badgeText}</span>
                        <button class="delete-btn" onclick="deleteNotice('${notice.id}')" title="Delete Notice">
                            <i class="ph-trash"></i>
                        </button>
                    </div>
                    <div class="card-title">${escapeHtml(notice.title)}</div>
                    <div class="card-desc">${escapeHtml(notice.content)}</div>
                    <div class="card-footer">
                        <i class="ph-clock"></i>
                        <span>${notice.created_at_str || 'Just now'}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    });
}

function setupForm() {
    const form = document.getElementById('createNoticeForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const btn = form.querySelector('.btn-submit');
        const originalText = btn.innerHTML;
        
        // UI Feedback
        btn.innerHTML = '<i class="ph-spinner ph-spin"></i> Publishing...';
        btn.disabled = true;

        const title = document.getElementById('noticeTitle').value.trim();
        const content = document.getElementById('noticeContent').value.trim();
        const batch = document.getElementById('noticeBatch').value;
        const priority = document.getElementById('noticePriority').value;

        fetch('/admin/notices/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, batch, priority })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Success Animation
                btn.style.backgroundColor = '#10b981'; // Green
                btn.innerHTML = '<i class="ph-check"></i> Published!';
                setTimeout(() => {
                    btn.style.backgroundColor = '';
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    form.reset();
                    loadNotices(); // Reload board
                }, 1500);
            } else {
                alert('Error: ' + data.error);
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        })
        .catch(err => {
            console.error(err);
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    });
}

function deleteNotice(noticeId) {
    if (!confirm('Are you sure you want to remove this notice?')) return;
    
    // Optimistic UI removal
    const card = document.getElementById(`notice-${noticeId}`);
    if(card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => card.remove(), 200);
    }

    fetch(`/admin/notices/delete/${noticeId}`, { method: 'POST' })
    .then(res => res.json())
    .then(data => {
        if (data.success) loadNotices(); // Re-sync to get correct counts
    });
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}