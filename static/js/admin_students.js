// Global variables
let currentStudentId = null;
let currentStudentForRating = null;
let currentStudentRating = 0;
let allStudents = [];
let filteredStudents = [];
let currentPage = 1;
const pageSize = 10;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadStudents();
    
    // Event listeners
    document.getElementById('searchInput').addEventListener('input', debounce(loadStudents, 500));
    
    const filters = ['batchFilter', 'feesFilter', 'statusFilter', 'sortFilter'];
    filters.forEach(filterId => {
        document.getElementById(filterId).addEventListener('change', loadStudents);
    });
    
    // Rating input events
    const ratingSlider = document.getElementById('ratingSlider');
    const ratingInput = document.getElementById('newRating');
    
    if (ratingSlider && ratingInput) {
        ratingSlider.addEventListener('input', function() {
            ratingInput.value = this.value;
            updateRatingPreview(parseInt(this.value));
        });
        
        ratingInput.addEventListener('input', function() {
            const value = parseInt(this.value) || 0;
            ratingSlider.value = value;
            updateRatingPreview(value);
        });
    }
    
    // Plan selection
    document.querySelectorAll('.plan-option').forEach(option => {
        option.addEventListener('click', function() {
            selectPlan(this.dataset.plan);
        });
    });
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

// Load dashboard stats
async function loadStats() {
    try {
        const response = await fetch('/admin/students/stats');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            const statsHTML = `
                <div class="stat-card">
                    <div class="stat-value">${stats.total}</div>
                    <div class="stat-label"><i class="fas fa-users"></i> Total Students</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.active}</div>
                    <div class="stat-label"><i class="fas fa-user-check"></i> Active</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.paid}</div>
                    <div class="stat-label"><i class="fas fa-money-bill-wave"></i> Paid</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.new}</div>
                    <div class="stat-label"><i class="fas fa-star"></i> New</div>
                </div>
            `;
            
            document.getElementById('statsContainer').innerHTML = statsHTML;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load students with filters
async function loadStudents() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('studentsTable');
    const tbody = document.getElementById('studentsTableBody');
    const footer = document.getElementById('tableFooter');

    loadingState.style.display = 'block';
    emptyState.style.display = 'none';
    table.style.display = 'none';
    footer.style.display = 'none';

    // Get filter values
    const search = document.getElementById('searchInput').value.toLowerCase();
    const batch = document.getElementById('batchFilter').value;
    const fees = document.getElementById('feesFilter').value;
    const status = document.getElementById('statusFilter').value;
    const sort = document.getElementById('sortFilter').value;

    try {
        const response = await fetch('/admin/students/list');
        const data = await response.json();
        
        if (data.success) {
            allStudents = data.students || [];
            
            // Apply filters
            filteredStudents = allStudents.filter(student => {
                // Search filter
                if (search && !(
                    student.name.toLowerCase().includes(search) ||
                    student.email.toLowerCase().includes(search) ||
                    (student.phone && student.phone.includes(search))
                )) {
                    return false;
                }
                
                // Batch filter
                if (batch && student.batch !== batch) {
                    return false;
                }
                
                // Status filter
                if (status && student.status !== status) {
                    return false;
                }
                
                // Fee status filter
                if (fees) {
                    const isPaid = student.fee_status?.is_paid || false;
                    const daysRemaining = student.fee_status?.days_remaining || 0;
                    
                    if (fees === 'paid' && !isPaid) return false;
                    if (fees === 'unpaid' && isPaid) return false;
                    if (fees === 'expiring' && (!isPaid || daysRemaining > 7)) return false;
                }
                
                return true;
            });
            
            // Apply sorting
            applySorting(sort);
            
            // Update filter info
            updateFilterInfo();
            
            // Render table
            renderTable();
        } else {
            showEmptyState();
        }
    } catch (error) {
        console.error('Error loading students:', error);
        loadingState.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading students. Please try again.</p>
            </div>
        `;
    }
}

// Apply sorting to filtered students
function applySorting(sort) {
    switch(sort) {
        case 'newest':
            filteredStudents.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            break;
        case 'oldest':
            filteredStudents.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
            break;
        case 'rating_high':
            filteredStudents.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            break;
        case 'rating_low':
            filteredStudents.sort((a, b) => (a.rating || 0) - (b.rating || 0));
            break;
        case 'name_asc':
            filteredStudents.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name_desc':
            filteredStudents.sort((a, b) => b.name.localeCompare(a.name));
            break;
    }
}

// Update filter information text
function updateFilterInfo() {
    const search = document.getElementById('searchInput').value;
    const batch = document.getElementById('batchFilter').value;
    const fees = document.getElementById('feesFilter').value;
    const status = document.getElementById('statusFilter').value;
    
    let infoText = `Showing ${filteredStudents.length} students`;
    const filters = [];
    
    if (search) filters.push(`search: "${search}"`);
    if (batch) filters.push(`batch: ${batch.replace('_', ' ')}`);
    if (fees) filters.push(`fees: ${fees}`);
    if (status) filters.push(`status: ${status}`);
    
    if (filters.length > 0) {
        infoText += ` (filtered by ${filters.join(', ')})`;
    }
    
    document.getElementById('filterInfo').textContent = infoText;
}

// Render table with pagination
function renderTable() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('studentsTable');
    const tbody = document.getElementById('studentsTableBody');
    const footer = document.getElementById('tableFooter');
    const recordsCount = document.getElementById('recordsCount');
    
    loadingState.style.display = 'none';
    
    if (filteredStudents.length === 0) {
        showEmptyState();
        return;
    }
    
    // Update records count
    recordsCount.textContent = filteredStudents.length;
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredStudents.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredStudents.length);
    const pageStudents = filteredStudents.slice(startIndex, endIndex);
    
    // Render students
    tbody.innerHTML = '';
    pageStudents.forEach(student => {
        const row = createStudentRow(student);
        tbody.appendChild(row);
    });
    
    // Show table
    table.style.display = 'table';
    
    // Update footer
    document.getElementById('startCount').textContent = startIndex + 1;
    document.getElementById('endCount').textContent = endIndex;
    document.getElementById('totalCount').textContent = filteredStudents.length;
    
    footer.style.display = 'block';
    
    // Update pagination controls (if needed)
    updatePaginationControls(totalPages);
}

// Show empty state
function showEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('studentsTable');
    const footer = document.getElementById('tableFooter');
    
    table.style.display = 'none';
    footer.style.display = 'none';
    emptyState.style.display = 'block';
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
    
    // Status
    const statusClass = student.status === 'active' ? 'active' : 
                      student.status === 'disabled' ? 'disabled' : 'new';
    
    // Fee Status
    const feeStatus = student.fee_status || {};
    const isPaid = feeStatus.is_paid || false;
    const daysRemaining = feeStatus.days_remaining || 0;
    
    let feeClass = 'unpaid';
    let feeText = 'Unpaid';
    
    if (isPaid) {
        feeClass = daysRemaining <= 7 ? 'expiring' : 'paid';
        feeText = daysRemaining <= 7 ? `Expiring in ${daysRemaining}d` : `Paid (${daysRemaining}d left)`;
    }
    
    // Toggle button text
    const toggleBtnText = student.status === 'active' ? 'Disable' : 'Activate';
    const toggleBtnIcon = student.status === 'active' ? 'fa-user-slash' : 'fa-user-check';
    
    // Format batch name
    const batchName = student.batch ? formatBatchName(student.batch) : '-';
    
    tr.innerHTML = `
        <td>
            <div class="student-cell">
                <div class="student-avatar-small">
                    <i class="fas fa-user"></i>
                </div>
                <div class="student-info">
                    <span class="student-name">${student.name}</span>
                    <span class="student-email">${student.email}</span>
                    <div class="student-meta-info">
                        <div class="student-meta-item">
                            <span class="meta-label"><i class="fas fa-layer-group"></i> Batch:</span>
                            <span class="meta-value">${batchName}</span>
                        </div>
                        <div class="student-meta-item">
                            <span class="meta-label"><i class="fas fa-user-circle"></i> Status:</span>
                            <span class="meta-value status-badge ${statusClass}">${student.status}</span>
                        </div>
                    </div>
                </div>
            </div>
        </td>
        <td>
            <div class="contact-cell">
                <span class="contact-email">${student.email}</span>
                <span class="contact-phone">
                    <i class="fas fa-phone"></i> ${student.phone || 'Not provided'}
                </span>
            </div>
        </td>
        <td>
            <div class="rating-cell">
                <span class="rating-badge ${ratingClass}">${rating}</span>
                <span class="rating-level">${getRatingLevel(rating)}</span>
            </div>
        </td>
        <td>
            <div class="fee-cell">
                <span class="fee-badge ${feeClass}">${feeText}</span>
                <div class="fee-expiry">
                    <i class="far fa-calendar-alt"></i> ${feeStatus.expires_at_str || 'No expiry'}
                </div>
            </div>
        </td>
        <td>
            <div class="action-buttons">
                <button class="btn-action btn-view" onclick="viewFeeHistory('${student.id}', '${student.name}', '${student.batch || 'N/A'}')">
                    <i class="fas fa-history"></i> Fees
                </button>
                <button class="btn-action btn-batch" onclick="openBatchModal('${student.id}', '${student.name}', '${student.batch || ''}')">
                    <i class="fas fa-exchange-alt"></i> Batch
                </button>
                <button class="btn-action btn-rating" onclick="openRatingModal('${student.id}', '${student.name}', ${rating})">
                    <i class="fas fa-chart-line"></i> Rating
                </button>
                <button class="btn-action btn-add-payment" onclick="openOfflinePaymentModal('${student.id}', '${student.name}')">
                    <i class="fas fa-money-check-alt"></i> Payment
                </button>
                <button class="btn-action btn-toggle" onclick="toggleStatus('${student.id}', '${student.status}')">
                    <i class="fas ${toggleBtnIcon}"></i> ${toggleBtnText}
                </button>
            </div>
        </td>
    `;
    
    return tr;
}

// Helper functions
function getRatingLevel(rating) {
    if (rating >= 1500) return 'Advanced';
    if (rating >= 1000) return 'Intermediate';
    return 'Beginner';
}

function formatBatchName(batch) {
    return batch.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Update pagination controls
function updatePaginationControls(totalPages) {
    // This function can be extended to add actual pagination controls
    // Currently using simple "Showing X to Y of Z" display
}

// Clear all filters
function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('batchFilter').value = '';
    document.getElementById('feesFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('sortFilter').value = 'newest';
    
    currentPage = 1;
    loadStudents();
}

// Export students to CSV
function exportStudents() {
    // Prepare export data
    const exportData = filteredStudents.map(student => ({
        'Name': student.name,
        'Email': student.email,
        'Phone': student.phone || '',
        'Rating': student.rating || 0,
        'Batch': student.batch || '',
        'Status': student.status,
        'Fee Status': student.fee_status?.is_paid ? 'Paid' : 'Unpaid',
        'Fee Expiry': student.fee_status?.expires_at_str || '',
        'Registration Date': student.created_at || ''
    }));
    
    // Create CSV
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
        headers.join(','),
        ...exportData.map(row => headers.map(header => {
            const cell = row[header];
            return typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell;
        }).join(','))
    ].join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `students_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Toggle student status
async function toggleStatus(studentId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    const action = newStatus === 'disabled' ? 'disable' : 'activate';
    
    if (!confirm(`Are you sure you want to ${action} this student?`)) {
        return;
    }
    
    try {
        showLoading();
        const response = await fetch('/admin/students/toggle-status', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ 
                student_id: studentId, 
                status: newStatus 
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showNotification(`Student ${action}d successfully`, 'success');
            loadStudents();
            loadStats(); // Refresh stats
        } else {
            throw new Error(data.error || 'Unknown error');
        }
    } catch (error) {
        hideLoading();
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Rating Modal Functions
function openRatingModal(studentId, studentName, currentRating) {
    currentStudentForRating = studentId;
    currentStudentRating = currentRating || 0;
    
    document.getElementById('ratingModalStudentName').textContent = studentName;
    document.getElementById('currentRatingDisplay').textContent = currentRating || 'Not set';
    document.getElementById('newRating').value = currentRating || '';
    document.getElementById('ratingSlider').value = currentRating || 0;
    
    updateRatingPreview(currentRating || 0);
    showModal('ratingModal');
}

function closeRatingModal() {
    closeModal('ratingModal');
    currentStudentForRating = null;
    currentStudentRating = 0;
}

function updateRatingPreview(rating) {
    const preview = document.getElementById('ratingPreview');
    const level = document.getElementById('ratingLevel');
    const change = document.getElementById('ratingChange');
    
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
    preview.className = `rating-preview-badge ${ratingClass}`;
    level.textContent = ratingText;
    
    // Calculate and display change
    if (currentStudentRating === 0) {
        change.textContent = 'New rating';
        change.style.color = '#4a5568';
    } else if (rating > currentStudentRating) {
        const diff = rating - currentStudentRating;
        change.textContent = `+${diff} (↑ ${Math.round((diff/currentStudentRating)*100)}%)`;
        change.style.color = '#2e7d32';
    } else if (rating < currentStudentRating) {
        const diff = currentStudentRating - rating;
        change.textContent = `-${diff} (↓ ${Math.round((diff/currentStudentRating)*100)}%)`;
        change.style.color = '#c53030';
    } else {
        change.textContent = 'No change';
        change.style.color = '#718096';
    }
}

function setQuickRating(rating) {
    document.getElementById('newRating').value = rating;
    document.getElementById('ratingSlider').value = rating;
    updateRatingPreview(rating);
}

async function updateRating() {
    const newRating = parseInt(document.getElementById('newRating').value, 10);
    
    if (isNaN(newRating) || newRating < 0 || newRating > 3000) {
        showNotification('Please enter a valid rating between 0 and 3000', 'error');
        return;
    }
    
    try {
        showLoading();
        const response = await fetch('/admin/students/update-rating', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                student_id: currentStudentForRating,
                rating: newRating
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showNotification('Rating updated successfully', 'success');
            closeRatingModal();
            loadStudents();
        } else {
            throw new Error(data.error || 'Failed to update rating');
        }
    } catch (error) {
        hideLoading();
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Batch Modal Functions
function openBatchModal(studentId, studentName, currentBatch) {
    currentStudentId = studentId;
    document.getElementById('batchModalStudentName').textContent = studentName;
    document.getElementById('batchSelect').value = currentBatch || 'online1';
    showModal('batchModal');
}

function closeBatchModal() {
    closeModal('batchModal');
    currentStudentId = null;
}

async function updateBatch() {
    const batch = document.getElementById('batchSelect').value;
    
    try {
        showLoading();
        const response = await fetch('/admin/students/update-batch', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ 
                student_id: currentStudentId, 
                batch: batch 
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            showNotification('Batch updated successfully', 'success');
            closeBatchModal();
            loadStudents();
        } else {
            throw new Error(data.error || 'Unknown error');
        }
    } catch (error) {
        hideLoading();
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Offline Payment Functions
function openOfflinePaymentModal(studentId, studentName) {
    currentStudentId = studentId;
    document.getElementById('offlinePaymentStudentName').textContent = studentName;
    selectPlan('1month'); // Default selection
    document.getElementById('offlinePaymentMethod').value = 'cash';
    document.getElementById('offlinePaymentNotes').value = '';
    showModal('offlinePaymentModal');
}

function closeOfflinePaymentModal() {
    closeModal('offlinePaymentModal');
    currentStudentId = null;
}

function selectPlan(plan) {
    // Update UI
    document.querySelectorAll('.plan-option').forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.plan === plan) {
            option.classList.add('selected');
        }
    });
    
    // Update hidden input
    document.getElementById('offlinePlanSelect').value = plan;
}

async function submitOfflinePayment() {
    const plan = document.getElementById('offlinePlanSelect').value;
    const paymentMethod = document.getElementById('offlinePaymentMethod').value;
    const notes = document.getElementById('offlinePaymentNotes').value.trim();
    
    const planName = plan === '1month' ? '1 Month (₹3,000)' : '3 Months (₹7,500)';
    
    if (!confirm(`Add offline payment?\n\nPlan: ${planName}\nMethod: ${paymentMethod}\n\nThis will immediately verify the payment and activate the student.`)) {
        return;
    }
    
    try {
        showLoading();
        const response = await fetch('/admin/students/add-offline-payment', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                student_id: currentStudentId,
                plan: plan,
                payment_method: paymentMethod,
                notes: notes
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            let message = `Payment added successfully!\n\nNew Expiry Date: ${data.expiry_date}\nStudent Status: ACTIVE`;
            if (data.extended) {
                message += '\n\n✓ Fee period extended from existing expiry date';
            }
            
            showNotification('Payment added successfully', 'success');
            alert(message); // Keep alert for important info
            closeOfflinePaymentModal();
            loadStudents();
            loadStats(); // Refresh stats
        } else {
            throw new Error(data.error || 'Unknown error');
        }
    } catch (error) {
        hideLoading();
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Fee History Functions
async function viewFeeHistory(studentId, studentName, batch) {
    document.getElementById('modalStudentName').textContent = studentName;
    document.getElementById('modalStudentBatch').textContent = formatBatchName(batch);
    showModal('feeHistoryModal');
    
    const content = document.getElementById('feeHistoryContent');
    content.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading payment history...</p></div>';
    
    try {
        const response = await fetch(`/admin/students/fee-history/${studentId}`);
        const data = await response.json();
        
        if (data.success && data.payments.length > 0) {
            let html = '<table class="fee-history-table"><thead><tr>';
            html += '<th>Date</th><th>Plan</th><th>Amount</th><th>Expiry</th><th>Method</th><th>Status</th>';
            html += '</tr></thead><tbody>';
            
            data.payments.forEach(payment => {
                html += `<tr>
                    <td>${payment.verified_at_str}</td>
                    <td>${payment.plan === '1month' ? '1 Month' : '3 Months'}</td>
                    <td>₹${payment.amount.toLocaleString()}</td>
                    <td>${payment.expiry_str}</td>
                    <td>${formatPaymentMethod(payment.payment_method)}</td>
                    <td><span class="fee-badge ${payment.is_active ? 'paid' : 'unpaid'}">
                        ${payment.is_active ? 'Active' : 'Expired'}
                    </span></td>
                </tr>`;
            });
            
            html += '</tbody></table>';
            content.innerHTML = html;
        } else {
            content.innerHTML = '<div class="empty-state"><p>No payment history found</p></div>';
        }
    } catch (error) {
        console.error('Error:', error);
        content.innerHTML = '<div class="error-state"><p style="color: red;">Error loading history</p></div>';
    }
}

function closeFeeHistoryModal() {
    closeModal('feeHistoryModal');
}

// Helper functions for modal management
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target.id);
    }
}

// Escape key to close modals
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.modal.show').forEach(modal => {
            closeModal(modal.id);
        });
    }
});

// Utility functions
function formatPaymentMethod(method) {
    const methods = {
        'cash': '💵 Cash',
        'bank_transfer': '🏦 Bank Transfer',
        'cheque': '📄 Cheque',
        'upi': '📱 UPI',
        'other': '📝 Other'
    };
    return methods[method] || method;
}

function showLoading() {
    // You can implement a global loading spinner here
}

function hideLoading() {
    // Hide the global loading spinner
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getCSRFToken() {
    // Get CSRF token from meta tag (if using Flask-WTF)
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    return metaTag ? metaTag.getAttribute('content') : '';
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 9999;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .notification-success {
        background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
    }
    
    .notification-error {
        background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
    }
    
    .notification-info {
        background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
    }
    
    .notification button {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        margin-left: auto;
        opacity: 0.8;
    }
    
    .notification button:hover {
        opacity: 1;
    }
`;

document.head.appendChild(notificationStyles);