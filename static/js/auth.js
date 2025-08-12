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
        const response = await fetch('/api/v1/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }
    } catch (error) {
        throw error;
    }
}

// --- loginUser ---
async function loginUser(credentials) {
    try {
        const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials)
        });

        if (response.ok) {
            const result = await response.json();
            // Set token as cookie for backend to read
            document.cookie = `token=${result.access_token}; path=/;`;
            // Also store in localStorage for API calls
            localStorage.setItem('authToken', result.access_token);
            localStorage.setItem('userRole', result.role || '');
            Swal.fire({
                title: 'Success!',
                text: 'Login successful',
                icon: 'success',
                timer: 1000,
                showConfirmButton: false
            }).then(() => {
                window.location.href = '/';
            });
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }
    } catch (error) {
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