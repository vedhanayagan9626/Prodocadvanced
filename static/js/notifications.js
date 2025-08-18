const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 1000,
    timerProgressBar: true,
    backdrop: 'transparent',
    animation: true,
    grow: 'row', // Expands horizontally
    didOpen: (toast) => {
        toast.style.transition = 'all 0.3s ease';
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

// Success notification (now with bounce-in and fade-out)
function showSuccess(message) {
    Toast.fire({
        icon: 'success',
        title: message,
        background: '#f8f9fa',
        color: '#202124',
        showClass: {
            popup: 'animate__animated animate__bounceInRight animate__faster'
        },
        hideClass: {
            popup: 'animate__animated animate__fadeOutRight animate__faster'
        }
    });
}

// Error notification (shake effect for urgency)
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        confirmButtonColor: '#4285f4',
        background: '#f8f9fa',
        color: '#202124',
        showClass: {
            popup: 'animate__animated animate__shakeX animate__faster'
        }
    });
}

// Confirmation dialog (gentle pulse on open)
function confirmDelete(callback) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#4285f4',
        cancelButtonColor: '#dc3545',
        confirmButtonText: 'Yes, delete it!',
        background: '#f8f9fa',
        color: '#202124',
        showClass: {
            popup: 'animate__animated animate__pulse animate__faster'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            callback();
        }
    });
}

// Loading indicator (pulse + subtle gradient shimmer)
function showLoading(message = 'Processing...') {
    Swal.fire({
        title: message,
        allowOutsideClick: false,
        showConfirmButton: false,
        background: `
            linear-gradient(
                90deg,
                #f8f9fa 0%,
                #f8f9fa 50%,
                #e9ecef 50%,
                #e9ecef 100%
            )
        `,
        backgroundSize: '200% 100%',
        color: '#202124',
        willOpen: () => {
            Swal.showLoading();
            const popup = Swal.getPopup();
            popup.style.animation = 'shimmer 1.5s infinite linear';
        },
        didClose: () => {
            const popup = Swal.getPopup();
            popup.style.animation = 'none';
        }
    });
}

// Close any open notification
function closeNotification() {
    Swal.close();
}

// Add CSS animations to the head
document.head.insertAdjacentHTML('beforeend', `
    <style>
        @keyframes shimmer {
            0% { background-position: 100% 0; }
            100% { background-position: -100% 0; }
        }
    </style>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">
`);

export { showSuccess, showError, confirmDelete, showLoading, closeNotification };