let currentStudentId = null;
let currentStudentForRating = null;
let currentStudentRating = 0;

// Load students on page load
document.addEventListener('DOMContentLoaded', function() {
    loadStudents();
    
    // Add event listeners for real-time search
    document.getElementById('searchInput').addEventListener('input', debounce(loadStudents, 500));
    
    // Add event listener for rating input
    const newRatingInput = document.getElementById('newRating');
    if (newRatingInput) {
        newRatingInput.addEventListener('input', function() {
            const value = parseInt(this.value) || 0;
            updateRatingPreview(value);
        });
    }
});

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function loadStudents() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('studentsTable');
    const tbody = document.getElementById('studentsTableBody');

    loadingState.style.display = 'block';
    emptyState.style.display = 'none';
    table.style.display = 'none';

    // Get filter values
    const search = document.getElementById('searchInput').value;
    const batch = document.getElementById('batchFilter').value;
    const fees = document.getElementById('feesFilter').value;
    const status = document.getElementById('statusFilter').value;
    const sort = document.getElementById('sortFilter').value;

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (batch) params.append('batch', batch);
    if (fees) params.append('fees', fees);
    if (status) params.append('status', status);
    if (sort) params.append('sort', sort);

    try {
        const response = await fetch(`/admin/students/list?${params.toString()}`);
        const data = await response.json();
        
        // If backend doesn't handle sorting, do client-side sorting
        let students = data.students || [];
        
        if (sort === 'rating_high') {
            students.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (sort === 'rating_low') {
            students.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        } else if (sort === 'name') {
            students.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort === 'newest') {
            // Assuming students have registration_date or similar field
            students.sort((a, b) => new Date(b.registration_date || 0) - new Date(a.registration_date || 0));
        }

        loadingState.style.display = 'none';

        if (data.success && students.length > 0) {
            tbody.innerHTML = '';
            students.forEach(student => {
                const row = createStudentRow(student);
                tbody.appendChild(row);
            });
            table.style.display = 'table';
        } else {
            emptyState.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading students:', error);
        loadingState.innerHTML = '<p style="color: red;">Error loading students</p>';
    }
}

function createStudentRow(student) {
    const tr = document.createElement('tr');

    // Determine Rating Color
    const rating = student.rating || 0;
    let ratingClass = 'rating-low';
    if (rating >= 1500) {
        ratingClass = 'rating-high';
    } else if (rating >= 1000) {
        ratingClass = 'rating-mid';
    }

    const statusClass = student.status === 'active' ? 'active' : 
                      student.status === 'disabled' ? 'disabled' : 'new';
    
    const feeStatus = student.fee_status;
    const feeClass = feeStatus.is_paid ? 'paid' : 'unpaid';
    const feeText = feeStatus.is_paid ? 
        `Paid (${feeStatus.days_remaining}d left)` : 'Unpaid';

    // LOGIC FIX: If status is 'active', show 'Disable'. 
    // If status is 'new' OR 'disabled', show 'Activate'.
    const toggleBtnText = student.status === 'active' ? 'Disable' : 'Activate';

    tr.innerHTML = `
        <td><strong>${student.name}</strong></td>
        <td>${student.email}</td>
        <td>
            <div class="rating-cell">
                <span class="rating-badge ${ratingClass}">${rating}</span>
                ${rating > 0 ? `<span class="rating-level">${getRatingLevel(rating)}</span>` : ''}
            </div>
        </td>
        <td>${student.phone}</td>
        <td>${student.batch || '-'}</td>
        <td><span class="status-badge ${statusClass}">${student.status}</span></td>
        <td><span class="fee-badge ${feeClass}">${feeText}</span></td>
        <td>${feeStatus.expires_at_str}</td>
        <td>
            <div class="action-buttons">
                <button class="btn-action btn-view" onclick="viewFeeHistory('${student.id}', '${student.name}', '${student.batch || 'N/A'}')">
                    Fee History
                </button>
                <button class="btn-action btn-batch" onclick="openBatchModal('${student.id}', '${student.name}', '${student.batch || ''}')">
                    Update Batch
                </button>
                <button class="btn-action btn-rating" onclick="openRatingModal('${student.id}', '${student.name}', ${rating})">
                    Edit Rating
                </button>
                <button class="btn-action btn-add-payment" onclick="openOfflinePaymentModal('${student.id}', '${student.name}')">
                    Add Payment
                </button>
                <button class="btn-action btn-toggle" onclick="toggleStatus('${student.id}', '${student.status}')">
                    ${toggleBtnText}
                </button>
            </div>
        </td>
    `;

    return tr;
}

// Helper function to get rating level text
function getRatingLevel(rating) {
    if (rating >= 1500) return 'Advanced';
    if (rating >= 1000) return 'Intermediate';
    return 'Beginner';
}

// Rating Modal Functions
function openRatingModal(studentId, studentName, currentRating) {
    currentStudentForRating = studentId;
    currentStudentRating = currentRating || 0;
    
    document.getElementById('ratingModalStudentName').textContent = studentName;
    document.getElementById('currentRatingDisplay').textContent = currentRating || 'Not set';
    document.getElementById('newRating').value = currentRating || '';
    
    // Update preview
    updateRatingPreview(currentRating || 0);
    
    document.getElementById('ratingModal').classList.add('show');
    document.getElementById('newRating').focus();
}

function closeRatingModal() {
    document.getElementById('ratingModal').classList.remove('show');
    currentStudentForRating = null;
    currentStudentRating = 0;
}

function updateRatingPreview(rating) {
    const preview = document.getElementById('ratingPreview');
    const level = document.getElementById('ratingLevel');
    
    let ratingClass = 'rating-low';
    let ratingText = 'Beginner';
    
    if (rating >= 1500) {
        ratingClass = 'rating-high';
        ratingText = 'Advanced';
    } else if (rating >= 1000) {
        ratingClass = 'rating-mid';
        ratingText = 'Intermediate';
    }
    
    preview.textContent = rating;
    preview.className = `rating-badge ${ratingClass}`;
    
    // Add color indicator based on rating change
    if (rating > currentStudentRating) {
        level.style.color = '#2e7d32';
        level.innerHTML = `${ratingText} <span style="color: #2e7d32; font-size: 0.9em;">(↑ ${rating - currentStudentRating})</span>`;
    } else if (rating < currentStudentRating) {
        level.style.color = '#c62828';
        level.innerHTML = `${ratingText} <span style="color: #c62828; font-size: 0.9em;">(↓ ${currentStudentRating - rating})</span>`;
    } else {
        level.style.color = '#666';
        level.textContent = ratingText;
    }
}

function setQuickRating(rating) {
    document.getElementById('newRating').value = rating;
    updateRatingPreview(rating);
}

async function updateRating() {
    const newRating = parseInt(document.getElementById('newRating').value, 10);

    if (isNaN(newRating)) {
        alert('Please enter a valid number');
        return;
    }

    try {
        const response = await fetch('/admin/students/update-rating', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: currentStudentForRating,
                rating: newRating
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            alert('Rating updated successfully');
            closeRatingModal();
            loadStudents();
        } else {
            alert(data.error || 'Failed to update rating');
        }
    } catch (err) {
        console.error('Error updating rating:', err);
        alert('Server error while updating rating');
    }
}

async function toggleStatus(studentId, currentStatus) {
    // LOGIC FIX: If currently 'active', switch to 'disabled'.
    // If currently 'disabled' OR 'new', switch to 'active'.
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    const action = newStatus === 'disabled' ? 'disable' : 'activate';
    
    if (!confirm(`Are you sure you want to ${action} this student?`)) {
        return;
    }

    try {
        const response = await fetch('/admin/students/toggle-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId, status: newStatus })
        });

        const data = await response.json();
        
        if (data.success) {
            alert(`Student ${action}d successfully`);
            loadStudents();
        } else {
            alert('Error: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating status');
    }
}

function openBatchModal(studentId, studentName, currentBatch) {
    currentStudentId = studentId;
    document.getElementById('batchModalStudentName').textContent = studentName;
    document.getElementById('batchSelect').value = currentBatch || 'online1';
    document.getElementById('batchModal').classList.add('show');
}

function closeBatchModal() {
    document.getElementById('batchModal').classList.remove('show');
    currentStudentId = null;
}

async function updateBatch() {
    const batch = document.getElementById('batchSelect').value;

    try {
        const response = await fetch('/admin/students/update-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: currentStudentId, batch: batch })
        });

        const data = await response.json();
        
        if (data.success) {
            alert('Batch updated successfully');
            closeBatchModal();
            loadStudents();
        } else {
            alert('Error: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating batch');
    }
}

// Offline Payment Functions
function openOfflinePaymentModal(studentId, studentName) {
    currentStudentId = studentId;
    document.getElementById('offlinePaymentStudentName').textContent = studentName;
    document.getElementById('offlinePlanSelect').value = '1month';
    document.getElementById('offlinePaymentMethod').value = 'cash';
    document.getElementById('offlinePaymentNotes').value = '';
    document.getElementById('offlinePaymentModal').classList.add('show');
}

function closeOfflinePaymentModal() {
    document.getElementById('offlinePaymentModal').classList.remove('show');
    currentStudentId = null;
}

async function submitOfflinePayment() {
    const plan = document.getElementById('offlinePlanSelect').value;
    const paymentMethod = document.getElementById('offlinePaymentMethod').value;
    const notes = document.getElementById('offlinePaymentNotes').value.trim();

    if (!confirm(`Are you sure you want to add this payment?\n\nPlan: ${plan === '1month' ? '1 Month (₹3,000)' : '3 Months (₹7,500)'}\nMethod: ${paymentMethod}\n\nThis will be immediately verified and the student will be set to ACTIVE.`)) {
        return;
    }

    try {
        const response = await fetch('/admin/students/add-offline-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: currentStudentId,
                plan: plan,
                payment_method: paymentMethod,
                notes: notes
            })
        });

        const data = await response.json();
        
        if (data.success) {
            let message = `Payment added successfully!\n\nNew Expiry Date: ${data.expiry_date}\nStudent Status: ACTIVE`;
            if (data.extended) {
                message += '\n\n✓ Fee period extended from existing expiry date';
            }
            alert(message);
            closeOfflinePaymentModal();
            loadStudents();
        } else {
            alert('Error: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error adding payment');
    }
}

async function viewFeeHistory(studentId, studentName, batch) {
    document.getElementById('modalStudentName').textContent = studentName;
    document.getElementById('modalStudentBatch').textContent = batch;
    document.getElementById('feeHistoryModal').classList.add('show');
    
    const content = document.getElementById('feeHistoryContent');
    content.innerHTML = '<p>Loading...</p>';

    try {
        const response = await fetch(`/admin/students/fee-history/${studentId}`);
        const data = await response.json();

        if (data.success && data.payments.length > 0) {
            let html = '<table class="fee-history-table"><thead><tr>';
            html += '<th>Date</th><th>Plan</th><th>Amount</th><th>Expiry</th><th>Status</th>';
            html += '</tr></thead><tbody>';

            data.payments.forEach(payment => {
                html += `<tr>
                    <td>${payment.verified_at_str}</td>
                    <td>${payment.plan}</td>
                    <td>₹${payment.amount}</td>
                    <td>${payment.expiry_str}</td>
                    <td><span class="fee-badge ${payment.is_active ? 'paid' : 'unpaid'}">
                        ${payment.is_active ? 'Active' : 'Expired'}
                    </span></td>
                </tr>`;
            });

            html += '</tbody></table>';
            content.innerHTML = html;
        } else {
            content.innerHTML = '<p>No payment history found</p>';
        }
    } catch (error) {
        console.error('Error:', error);
        content.innerHTML = '<p style="color: red;">Error loading history</p>';
    }
}

function closeFeeHistoryModal() {
    document.getElementById('feeHistoryModal').classList.remove('show');
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('batchFilter').value = '';
    document.getElementById('feesFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('sortFilter').value = 'newest';
    loadStudents();
}

function exportStudents() {
    window.location.href = '/admin/students/export';
}

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
}