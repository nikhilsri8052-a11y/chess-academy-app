// Validation functions
function validateName(name) {
  if (!name || name.trim().length < 2) return 'Name must be at least 2 characters';
  if (!/^[a-zA-Z\s'-]+$/.test(name)) return 'Name can only contain letters, spaces, hyphens, and apostrophes';
  return '';
}

function validateEmail(email) {
  if (!email) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return '';
}

function validatePhone(phone) {
  if (!phone) return 'Phone number is required';
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone.replace(/\D/g, ''))) return 'Phone must be 10 digits';
  return '';
}

function validateMessage(message) {
  if (!message || message.trim().length < 5) return 'Message must be at least 5 characters';
  if (message.trim().length > 1000) return 'Message cannot exceed 1000 characters';
  return '';
}

function showError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const group = field.parentElement;
  let errorDiv = group.querySelector('.error-message');
  
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    group.appendChild(errorDiv);
  }
  
  errorDiv.textContent = message;
  field.classList.add('input-error');
}

function clearError(fieldId) {
  const field = document.getElementById(fieldId);
  const group = field.parentElement;
  const errorDiv = group.querySelector('.error-message');
  
  if (errorDiv) errorDiv.remove();
  field.classList.remove('input-error');
}

document.addEventListener('DOMContentLoaded', function() {
    const enquiryForm = document.getElementById('enquiryForm');
    if (!enquiryForm) return;

    enquiryForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Clear all previous errors
      ['name', 'email', 'phone', 'message'].forEach(id => clearError(id));
      
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const batch = document.getElementById('batch').value;
      const message = document.getElementById('message').value.trim();
      
      // Validate all fields
      let hasError = false;
      
      const nameError = validateName(name);
      if (nameError) {
        showError('name', nameError);
        hasError = true;
      }
      
      const emailError = validateEmail(email);
      if (emailError) {
        showError('email', emailError);
        hasError = true;
      }
      
      const phoneError = validatePhone(phone);
      if (phoneError) {
        showError('phone', phoneError);
        hasError = true;
      }
      
      const messageError = validateMessage(message);
      if (messageError) {
        showError('message', messageError);
        hasError = true;
      }
      
      // If validation fails, show error and return
      if (hasError) {
        const messageDiv = document.getElementById('formMessage');
        messageDiv.textContent = '✗ Please correct the errors above and try again.';
        messageDiv.className = 'form-message error';
        messageDiv.style.display = 'block';
        return;
      }
      
      const formData = {
        name: name,
        email: email,
        phone: phone,
        batch: batch,
        message: message
      };

      try {
        const response = await fetch('/enquiry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();
        const messageDiv = document.getElementById('formMessage');
        
        if (data.success) {
          messageDiv.textContent = '✓ ' + (data.message || 'Enquiry submitted successfully!');
          messageDiv.className = 'form-message success';
          document.getElementById('enquiryForm').reset();
        } else {
          messageDiv.textContent = '✗ ' + (data.error || 'Error submitting form. Please try again.');
          messageDiv.className = 'form-message error';
        }
        
        messageDiv.style.display = 'block';
        setTimeout(() => messageDiv.style.display = 'none', 5000);
      } catch (error) {
        console.error('Error:', error);
        const messageDiv = document.getElementById('formMessage');
        messageDiv.textContent = '✗ An error occurred. Please try again later.';
        messageDiv.className = 'form-message error';
        messageDiv.style.display = 'block';
      }
    });

    // Real-time validation on blur
    document.getElementById('name').addEventListener('blur', function() {
      const error = validateName(this.value);
      if (error) showError('name', error);
      else clearError('name');
    });

    document.getElementById('email').addEventListener('blur', function() {
      const error = validateEmail(this.value);
      if (error) showError('email', error);
      else clearError('email');
    });

    document.getElementById('phone').addEventListener('blur', function() {
      const error = validatePhone(this.value);
      if (error) showError('phone', error);
      else clearError('phone');
    });

    document.getElementById('message').addEventListener('blur', function() {
      const error = validateMessage(this.value);
      if (error) showError('message', error);
      else clearError('message');
    });
});
