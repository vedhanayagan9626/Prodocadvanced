document.addEventListener('DOMContentLoaded', function() {
    // Initialize the completed list when the page loads
    if (document.getElementById('completed-list').style.display !== 'none') {
        loadCompletedInvoices();
    }
});

function loadCompletedInvoices() {
    fetch('/api/v1/invoices/completed')
        .then(response => response.json())
        .then(data => {
            renderCompletedInvoices(data);
        })
        .catch(error => {
            console.error('Error loading completed invoices:', error);
        });
}

function renderCompletedInvoices(invoices) {
    const tableBody = document.getElementById('completed-invoices-body');
    tableBody.innerHTML = '';

    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.onclick = () => redirectToInvoiceDetail(invoice.invoice_number);
        row.style.cursor = 'pointer';
        
        // Extract vendor name from from_address (first line)
        const vendorName = invoice.from_address.split('\n')[0] || 'Unknown Vendor';
        
        row.innerHTML = `
            <td>${formatDate(invoice.invoice_date)}</td>
            <td>${invoice.invoice_number}</td>
            <td>
                <div class="vendor-info">
                    <strong>${vendorName}</strong>
                    <small>${invoice.to_address.split('\n')[0] || ''}</small>
                </div>
            </td>
            <td>${invoice.items.length}</td>
            <td>₹${invoice.tax_amount.toFixed(2)}</td>
            <td>₹${invoice.total.toFixed(2)}</td>
            <td class="action-buttons">
                <button class="btn-download" onclick="downloadInvoice(event, '${invoice.invoice_number}')">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn-edit" onclick="editInvoice(event, '${invoice.invoice_number}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" onclick="deleteInvoice(event, '${invoice.invoice_number}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
}

function redirectToInvoiceDetail(invoiceNumber) {
    window.location.href = `/invoice-detail/${invoiceNumber}`;
}

function downloadInvoice(event, invoiceNumber) {
    event.stopPropagation();
    // Implement download functionality
    console.log('Download invoice:', invoiceNumber);
}

function editInvoice(event, invoiceNumber) {
    event.stopPropagation();
    // Implement edit functionality
    console.log('Edit invoice:', invoiceNumber);
}

function deleteInvoice(event, invoiceNumber) {
    event.stopPropagation();
    // Implement delete functionality with confirmation
    if (confirm(`Are you sure you want to delete invoice ${invoiceNumber}?`)) {
        console.log('Delete invoice:', invoiceNumber);
    }
}

// Prevent row click when clicking on action buttons
document.addEventListener('click', function(e) {
    if (e.target.closest('.action-buttons button')) {
        e.stopPropagation();
    }
});