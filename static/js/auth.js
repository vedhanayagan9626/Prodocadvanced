// Password strength indicator
function checkPasswordStrength(password) {
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    
    // Contains numbers
    if (/\d/.test(password)) strength++;
    
    // Contains special chars
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    
    // Contains upper and lower case
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    
    return strength;
}

function updatePasswordStrength() {
    const password = $('#reg-password').val();
    const strength = checkPasswordStrength(password);
    const strengthBar = $('#strength-bar');
    const strengthText = $('#strength-text');
    
    let color = '#ea4335'; // red
    let text = 'Weak';
    
    if (strength >= 4) {
        color = '#34a853'; // green
        text = 'Strong';
    } else if (strength >= 2) {
        color = '#f9ab00'; // yellow
        text = 'Medium';
    }
    
    strengthBar.css({
        'width': `${(strength / 5) * 100}%`,
        'background-color': color
    });
    
    strengthText.text(text).css('color', color);
}

// Toggle password visibility
function togglePasswordVisibility(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Form validation
function validateRegistrationForm() {
    const username = $('#reg-username').val().trim();
    const email = $('#reg-email').val().trim();
    const phone = $('#reg-phone').val().trim();
    const password = $('#reg-password').val();
    const confirmPassword = $('#reg-confirm-password').val();
    const terms = $('#terms').is(':checked');
    
    // Basic validation
    if (!username || !email || !phone || !password || !confirmPassword) {
        Swal.fire('Error', 'Please fill in all fields', 'error');
        return false;
    }
    
    if (password !== confirmPassword) {
        Swal.fire('Error', 'Passwords do not match', 'error');
        return false;
    }
    
    if (!terms) {
        Swal.fire('Error', 'You must agree to the terms and conditions', 'error');
        return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        Swal.fire('Error', 'Please enter a valid email address', 'error');
        return false;
    }
    
    // Phone validation (basic)
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone)) {
        Swal.fire('Error', 'Please enter a valid phone number', 'error');
        return false;
    }
    
    return true;
}

// API calls
// --- registerUser ---
async function registerUser(userData) {
    try {
        showLoading('Creating your account...');
        const response = await fetch('/api/v1/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            closeLoading();
            return await response.json();
        } else {
            const error = await response.json();
            closeLoading();
            throw new Error(error.message || 'Registration failed');
        }
    } catch (error) {
        closeLoading();
        throw error;
    }
}

// --- loginUser ---
async function loginUser(credentials) {
    try {
        showLoading('Authenticating...');
        const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials)
        });

        if (response.ok) {
            const result = await response.json();
            closeLoading();
            // Set token as cookie for backend to read
            document.cookie = `token=${result.access_token}; path=/;`;
            // Also store in localStorage for API calls
            localStorage.setItem('authToken', result.access_token);
            localStorage.setItem('userRole', result.role || '');
            showGlobalSpinner('Loading dashboard...');
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        } else {
            const error = await response.json();
            closeLoading();
            throw new Error(error.message || 'Login failed');
        }
    } catch (error) {
        closeLoading();
        throw error;
    }
}

// --- Logout handler ---
function logoutUser() {
    // Remove both cookie and localStorage
    document.cookie = 'token=; Max-Age=0; path=/;';
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    window.location.href = '/login';
}


async function sendPasswordReset(email) {
    try {
        const response = await fetch('/api/v1/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });
        
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Password reset failed');
        }
    } catch (error) {
        throw error;
    }
}

// Event Listeners
$(document).ready(function() {
    $('#reg-password').on('input', updatePasswordStrength);
    
    // Registration form
    $('#registerForm').on('submit', async function(e) {
        e.preventDefault();
        if (!validateRegistrationForm()) return;
        const userData = {
            username: $('#reg-username').val().trim(),
            email: $('#reg-email').val().trim(),
            phone: $('#reg-phone').val().trim(),
            password: $('#reg-password').val(),
            role: $('#reg-role').val()
        };
        try {
            Swal.fire({
                title: 'Registering...',
                html: 'Please wait while we create your account',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });
            await registerUser(userData);
            Swal.fire({
                title: 'Success!',
                text: 'Account created successfully',
                icon: 'success'
            }).then(() => {
                window.location.href = '/login';
            });
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    });

    // Login form
    $('#loginForm').on('submit', async function(e) {
        e.preventDefault();
        const credentials = {
            username: $('#username').val().trim(),
            password: $('#password').val()
        };
        if (!credentials.username || !credentials.password) {
            Swal.fire('Error', 'Please enter both username and password', 'error');
            return;
        }
        try {
            Swal.fire({
                title: 'Logging in...',
                html: 'Please wait while we authenticate you',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });
            await loginUser(credentials);
            // loginUser handles redirect
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    });

    // Logout button (add id="logout-btn" to your logout button)
    $('#logout-btn').on('click', function(e) {
        e.preventDefault();
        logoutUser();
    });

    // Forgot password form
    $('#forgotPasswordForm').on('submit', async function(e) {
        e.preventDefault();
        const email = $('#reset-email').val().trim();
        if (!email) {
            Swal.fire('Error', 'Please enter your email address', 'error');
            return;
        }
        try {
            Swal.fire({
                title: 'Sending...',
                html: 'Please wait while we send the reset link',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });
            await sendPasswordReset(email);
            Swal.fire({
                title: 'Success!',
                text: 'Password reset link sent to your email',
                icon: 'success'
            }).then(() => {
                window.location.href = '/login';
            });
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    });
});

// Expose logoutUser globally if needed
window.logoutUser = logoutUser;

// Expose functions to global scope
window.togglePasswordVisibility = togglePasswordVisibility;



// Loading configuration with custom spinner options
const LoadingConfig = {
  globalSpinner: {
    icon: 'static/logos/invoice1.png', // Your custom icon
    rippleColor: 'rgba(10, 142, 78, 0.3)', // Brand green with transparency
    animationDuration: 1.5 // seconds
  },
  sweetAlert: {
    background: '#f8f9fa',
    color: '#202124',
    spinnerColor: '#0a8e4e' // Brand green
  }
};

// Initialize loading animations
function initLoadingAnimations() {
  // Only add styles once
  if (!$('#loading-styles').length) {
    $('head').append(`
      <style id="loading-styles">
        /* Global Spinner Animations */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.9; }
        }
        @keyframes ripple {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        
        /* SweetAlert2 Custom Spinner */
        .swal2-loader {
          border-color: ${LoadingConfig.sweetAlert.spinnerColor} transparent ${LoadingConfig.sweetAlert.spinnerColor} transparent !important;
        }

        /* Ensure SweetAlert2 popup has no scrollbars */
        .swal2-popup {
        overflow: hidden !important;
        }
        
        /* Disable animations that might cause layout shifts */
        .swal2-noanimation {
        animation: none !important;
        }
      </style>
    `);
  }
}

// Show global spinner with message
function showGlobalSpinner(message = '') {
  initLoadingAnimations();
  
  // Create spinner overlay if it doesn't exist
  if (!$('#globalSpinnerOverlay').length) {
    $('body').append(`
      <div id="globalSpinnerOverlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.85);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        backdrop-filter: blur(2px);
      ">
        <div class="spinner-container" style="position: relative; margin-bottom: ${message ? '20px' : '0'}">
          <!-- Ripple Effect -->
          <div class="icon-ripple" style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: ${LoadingConfig.globalSpinner.rippleColor};
            animation: ripple ${LoadingConfig.globalSpinner.animationDuration}s infinite ease-out;
          "></div>
          
          <!-- Custom Icon -->
          <img src="${LoadingConfig.globalSpinner.icon}" alt="Loading" style="
            width: 48px;
            height: 48px;
            animation: spin ${LoadingConfig.globalSpinner.animationDuration}s infinite linear, 
                       pulse ${LoadingConfig.globalSpinner.animationDuration}s infinite ease-in-out;
          ">
        </div>
        ${message ? `<div style="color: #0a8e4e; font-size: 1.2rem; max-width: 80%; text-align: center;">${message}</div>` : ''}
      </div>
    `);
  } else {
    // Update message if provided
    if (message) {
      $('#globalSpinnerOverlay').html(`
        <div class="spinner-container" style="position: relative; margin-bottom: 20px">
          <!-- Existing spinner content -->
        </div>
        <div style="color: #0a8e4e; font-size: 1.2rem; max-width: 80%; text-align: center;">${message}</div>
      `);
    }
    $('#globalSpinnerOverlay').show();
  }
}

// Enhanced SweetAlert loading with custom styling
function showLoading(message = 'Processing...') {
  initLoadingAnimations();
  
  // Prevent scrolling and body shifts
  $('body').addClass('loading-active');
  
  return Swal.fire({
    title: message,
    allowOutsideClick: false,
    showConfirmButton: false,
    background: LoadingConfig.sweetAlert.background,
    color: LoadingConfig.sweetAlert.color,
    width: '400px',
    padding: '1.5em',
    showClass: {
      popup: 'swal2-noanimation',
      backdrop: 'swal2-noanimation'
    },
    willOpen: () => {
      Swal.showLoading();
      
      // Customize the spinner color
      const loader = Swal.getHtmlContainer().querySelector('.swal2-loader');
      if (loader) {
        loader.style.borderColor = `${LoadingConfig.sweetAlert.spinnerColor} transparent ${LoadingConfig.sweetAlert.spinnerColor} transparent`;
      }
      
      // Add the progress bar element
      const container = Swal.getPopup();
      container.style.overflow = 'hidden'; // Ensure no scrollbars
      container.style.position = 'relative'; // For absolute positioning of bar
      
      const progressBar = document.createElement('div');
      progressBar.id = 'swal-progress-bar';
      progressBar.style.position = 'absolute';
      progressBar.style.bottom = '0';
      progressBar.style.left = '0';
      progressBar.style.width = '0%';
      progressBar.style.height = '5px';
      progressBar.style.backgroundColor = '#0a8e4e';
      progressBar.style.transition = 'width 0.3s ease';
      progressBar.style.borderRadius = '0 0 4px 4px';
      container.appendChild(progressBar);
      
      // Animate the progress bar
      let width = 0;
      const interval = setInterval(() => {
        width = (width + 10) % 100;
        progressBar.style.width = `${width}%`;
      }, 300);
      
      // Store interval reference for cleanup
      container.dataset.progressInterval = interval;
    },
    didRender: () => {
      const title = Swal.getTitle();
      if (title) {
        title.style.animation = `pulse ${LoadingConfig.globalSpinner.animationDuration}s infinite ease-in-out`;
      }
    },
    willClose: () => {
      // Clean up the progress bar animation
      const container = Swal.getPopup();
      if (container && container.dataset.progressInterval) {
        clearInterval(container.dataset.progressInterval);
      }
      
      // Re-enable scrolling
      $('body').removeClass('loading-active');
    }
  });
}

// Close any loading indicator
function closeLoading() {
  // Close SweetAlert loading if open
  if (Swal.isVisible()) {
    Swal.close();
  }
  
  // Close global spinner if open
  $('#globalSpinnerOverlay').hide();
}

// Initialize when the script loads
initLoadingAnimations();