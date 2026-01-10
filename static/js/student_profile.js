let studentData = null;

// Load student profile on page load
document.addEventListener('DOMContentLoaded', function() {
    loadStudentProfile();
    
    // Setup form submissions
    document.getElementById('editProfileForm').addEventListener('submit', updateProfile);
    document.getElementById('changePasswordForm').addEventListener('submit', changePassword);
    
    // Setup password strength indicator
    document.getElementById('newPassword').addEventListener('input', updatePasswordStrength);
});

// Load student profile data
async function loadStudentProfile() {
    try {
        const response = await fetch('/student/profile/data');
        const data = await response.json();
        
        if (data.success) {
            studentData = data.student;
            updateProfileDisplay(data.student);
        } else {
            alert('Error loading profile: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Error loading profile. Please try again.');
    }
}

// Update profile display with data
function updateProfileDisplay(student) {
    // Update avatar initials
    const name = student.name || '';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'ST';
    document.getElementById('avatarInitials').textContent = initials;
    
    // Update basic info
    document.getElementById('studentName').textContent = student.name || 'N/A';
    document.getElementById('studentEmail').textContent = student.email || 'N/A';
    document.getElementById('studentBatch').textContent = student.batch || 'Not assigned';
    document.getElementById('memberSince').textContent = student.registration_date_str || '-';
    
    // Update rating
    const rating = student.rating || 0;
    updateRatingDisplay(rating);
    
    // Update status badges
    const status = student.status || 'new';
    document.getElementById('studentStatus').textContent = status;
    document.getElementById('studentStatus').className = `status-badge ${status}`;
    
    // Update fee status
    const feeStatus = student.fee_status || {};
    const isPaid = feeStatus.is_paid || false;
    const daysRemaining = feeStatus.days_remaining || 0;
    const expiryStr = feeStatus.expires_at_str || 'N/A';
    
    document.getElementById('feeStatus').textContent = isPaid ? 'Paid' : 'Unpaid';
    document.getElementById('feeStatus').className = `fee-badge ${isPaid ? 'paid' : 'unpaid'}`;
    
    document.getElementById('feePaidStatus').textContent = isPaid ? 'Yes' : 'No';
    document.getElementById('feeExpiry').textContent = expiryStr;
    document.getElementById('daysRemaining').textContent = isPaid ? `${daysRemaining} days` : 'Expired';
    
    // Update personal information
    document.getElementById('infoName').textContent = student.name || 'N/A';
    document.getElementById('infoEmail').textContent = student.email || 'N/A';
    document.getElementById('infoPhone').textContent = student.phone || '-';
    document.getElementById('infoAge').textContent = student.age || '-';
    document.getElementById('infoParent').textContent = student.parent_name || '-';
    document.getElementById('infoRegDate').textContent = student.registration_date_str || '-';
    document.getElementById('infoBatchUpdated').textContent = student.batch_updated_str || '-';
}

// Update rating display with appropriate color
function updateRatingDisplay(rating) {
    const ratingBadge = document.getElementById('ratingBadge');
    ratingBadge.textContent = rating;
    
    // Determine badge class
    let ratingClass = 'rating-low';
    if (rating >= 1500) {
        ratingClass = 'rating-high';
    } else if (rating >= 1000) {
        ratingClass = 'rating-mid';
    }
    
    ratingBadge.className = `rating-badge ${ratingClass}`;
}

// Open edit modal
function openEditModal() {
    if (!studentData) return;
    
    // Populate form fields
    document.getElementById('editAge').value = studentData.age || '';
    document.getElementById('editPhone').value = studentData.phone || '';
    document.getElementById('editParentName').value = studentData.parent_name || '';
    
    // Show modal
    document.getElementById('editModal').classList.add('show');
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').classList.remove('show');
}

// Open change password modal
function openChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.add('show');
}

// Close change password modal
function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.remove('show');
    // Clear password fields
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

// Update profile
async function updateProfile(event) {
    event.preventDefault();
    
    const age = document.getElementById('editAge').value;
    const phone = document.getElementById('editPhone').value;
    const parentName = document.getElementById('editParentName').value.trim();
    
    // Validation
    if (phone && (phone.length !== 10 || !/^\d+$/.test(phone))) {
        alert('Phone number must be 10 digits only');
        return;
    }
    
    if (age && (age < 5 || age > 100)) {
        alert('Age must be between 5 and 100');
        return;
    }
    
    try {
        const response = await fetch('/student/profile/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                age: age || null,
                phone: phone || '',
                parent_name: parentName
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Profile updated successfully!');
            closeEditModal();
            loadStudentProfile(); // Refresh data
        } else {
            alert('Error: ' + (data.error || 'Failed to update profile'));
        }
    } catch (error) {
        console.error('Update error:', error);
        alert('Error updating profile. Please try again.');
    }
}

// Change password
async function changePassword(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('All fields are required');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('New password must be at least 6 characters long');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }
    
    if (newPassword === currentPassword) {
        alert('New password must be different from current password');
        return;
    }
    
    if (!confirm('Are you sure you want to change your password?')) {
        return;
    }
    
    try {
        const response = await fetch('/student/profile/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Password changed successfully!');
            closeChangePasswordModal();
        } else {
            alert('Error: ' + (data.error || 'Failed to change password'));
        }
    } catch (error) {
        console.error('Password change error:', error);
        alert('Error changing password. Please try again.');
    }
}

// Update password strength indicator
function updatePasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');
    
    let strength = 0;
    let color = '#f44336'; // Red
    let text = 'Weak';
    
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    
    if (strength >= 75) {
        color = '#4CAF50'; // Green
        text = 'Strong';
    } else if (strength >= 50) {
        color = '#FF9800'; // Orange
        text = 'Medium';
    }
    
    strengthBar.style.setProperty('--strength-color', color);
    strengthBar.querySelector('::after').style.width = strength + '%';
    strengthBar.style.background = `linear-gradient(to right, ${color} ${strength}%, #eee ${strength}%)`;
    strengthText.textContent = `Password strength: ${text}`;
    strengthText.style.color = color;
}

// Export profile (future feature)
function exportProfile() {
    alert('Export feature coming soon!');
}

// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
}