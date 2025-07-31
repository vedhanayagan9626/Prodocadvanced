// Notification configuration
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 1000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
})

// Success notification
function showSuccess(message) {
    Toast.fire({
        icon: 'success',
        title: message,
        background: '#f8f9fa',
        color: '#202124'
    })
}

// Error notification
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        confirmButtonColor: '#4285f4',
        background: '#f8f9fa',
        color: '#202124'
    })
}

// Confirmation dialog
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
        color: '#202124'
    }).then((result) => {
        if (result.isConfirmed) {
            callback()
        }
    })
}

// Loading indicator
function showLoading(message = 'Processing...') {
    Swal.fire({
        title: message,
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
            Swal.showLoading()
        },
        background: '#f8f9fa',
        color: '#202124'
    })
}

// Close any open notification
function closeNotification() {
    Swal.close()
}

export { showSuccess, showError, confirmDelete, showLoading, closeNotification }