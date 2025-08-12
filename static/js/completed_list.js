import { showSuccess, showError, showLoading, confirmDelete } from '/static/js/notifications.js';

let currentPage = 1;
const itemsPerPage = 10;
const token = localStorage.getItem('authToken');


document.addEventListener('DOMContentLoaded', function() {
    // Check if we're already on the completed list page
    if (document.getElementById('completed-list').style.display === 'block') {
        loadCompletedInvoices();
    }
});


// Make sure this function is globally available
window.loadCompletedInvoices = loadCompletedInvoices;


function loadCompletedInvoices() {
    const tableBody = document.getElementById('completed-invoices-body');
    tableBody.innerHTML = '<tr><td colspan="7" class="loading-text">Loading invoices...</td></tr>';
    
    fetch(`/api/v1/invoices/completed?page=${currentPage}&per_page=${itemsPerPage}`)
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.detail || `HTTP error! status: ${response.status}`);
                });
            }
            return response.json().then(data => {
                // Get pagination info from headers
                const total = parseInt(response.headers.get('X-Total-Count')) || 0;
                const totalPages = parseInt(response.headers.get('X-Total-Pages')) || 1;
                return { data, total, totalPages };
            });
        })
        .then(({ data, total, totalPages }) => { 
            renderCompletedInvoices(data, total, totalPages);
        })
        .catch(error => {
            console.error('Error:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="error-text">
                        Failed to load invoices: ${error.message}
                        <button onclick="loadCompletedInvoices()">Retry</button>
                    </td>
                </tr>
            `;
        });
}

function renderCompletedInvoices(invoices, total = 0, totalPages = 1) {
    const tableBody = document.getElementById('completed-invoices-body');
    tableBody.innerHTML = '';

    // Update pagination controls
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prev-page').disabled = currentPage <= 1;
    document.getElementById('next-page').disabled = currentPage >= totalPages;

    if (invoices.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">No invoices found</td></tr>';
        return;
    }

    invoices.forEach(invoice => {
        try {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            
            const vendorName = invoice.from_address?.split('\n')[0] || invoice.vendor_name || 'Unknown Vendor';
            const clientName = invoice.to_address?.split('\n')[0] || '';
            
            row.innerHTML = `
                <td>${invoice.date}</td>
                <td>${invoice.invoice_number}</td>
                <td>
                    <div class="vendor-info">
                        <strong>${vendorName}</strong>
                    </div>
                </td>
                <td>
                    <div class="vendor-info">
                        <strong>${clientName}</strong>
                    </div>
                </td>
                <td>${invoice.item_count || 0}</td>
                <td>₹${invoice.tax_amount.toFixed(2)}</td>
                <td>₹${invoice.total_amount.toFixed(2)}</td>
                <td class="action-buttons">
                    <button class="btn-download" data-invoice="${invoice.invoice_number}">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn-edit" data-invoice="${invoice.invoice_number}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" data-invoice="${invoice.invoice_number}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        } catch (error) {
            console.error('Error rendering invoice row:', error);
            showError('Error displaying some invoice data');
        }
    });
}


document.getElementById('completed-invoices-body').addEventListener('click', function(e) {
    // Handle button clicks
    const btn = e.target.closest('.action-buttons button, .action-buttons i');
    if (btn) {
        e.preventDefault();
        e.stopPropagation();
        
        const button = btn.tagName === 'I' ? btn.parentElement : btn;
        const invoiceNumber = button.dataset.invoice;
        
        if (button.classList.contains('btn-download')) {
            downloadInvoice(e, invoiceNumber);
        } else if (button.classList.contains('btn-edit')) {
            editInvoice(e, invoiceNumber);
        } else if (button.classList.contains('btn-delete')) {
            deleteInvoice(e, invoiceNumber);
        }
        return;
    }
    
    // Handle row clicks (only if not clicking on a button)
    const row = e.target.closest('tr');
    if (row) {
        const invoiceNumber = row.querySelector('.btn-download')?.dataset.invoice;
        if (invoiceNumber) {
            redirectToInvoiceDetail(invoiceNumber);
        }
    }
});

// Event listener for all action buttons
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.action-buttons button');
    if (!btn) return;
    
    e.stopPropagation();
    const invoiceNumber = btn.dataset.invoice;
    
    if (btn.classList.contains('btn-download')) {
        downloadInvoice(e, invoiceNumber);
    } else if (btn.classList.contains('btn-edit')) {
        editInvoice(e, invoiceNumber);
    } else if (btn.classList.contains('btn-delete')) {
        deleteInvoice(e, invoiceNumber);
    }
});

// event listeners for pagination
document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadCompletedInvoices();
    }
});

document.getElementById('next-page').addEventListener('click', () => {
    currentPage++;
    loadCompletedInvoices();
});

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
}

function redirectToInvoiceDetail(invoiceNumber) {
    window.location.href = `/invoice-detail/${invoiceNumber}`;
}

async function downloadInvoice(event, invoiceNumber) {
    event.preventDefault();
    event.stopPropagation();
    showLoading('Preparing download...');
    
    try {
        if (!window.jspdf || !window.html2canvas) {
            throw new Error('Required libraries not loaded');
        }
        
        const { jsPDF } = window.jspdf;
        
        // Debug logs
        console.log('Original invoiceNumber:', invoiceNumber);
        const encodedInvoiceNumber = encodeURIComponent(invoiceNumber);
        console.log('Encoded invoiceNumber:', encodedInvoiceNumber);

        // Using query parameter approach
        const requestUrl = `/api/v1/invoices/corrections/latest?invoice_number=${encodedInvoiceNumber}`;
        console.log('Request URL:', requestUrl);

        const correctionResponse = await fetch(requestUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Response status:', correctionResponse.status);
        
        if (!correctionResponse.ok) {
            const errorText = await correctionResponse.text();
            console.error('Error response:', errorText);
            throw new Error(errorText);
        }

        const correction = await correctionResponse.json();
        console.log('Correction data:', correction);
        
        // Fetch items
        const itemsResponse = await fetch(`/api/v1/corrections/${correction.CorrectionID}/items`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!itemsResponse.ok) throw new Error(await itemsResponse.text());
        const items = await itemsResponse.json();

        // Create temporary container
        const tempPaper = document.createElement('div');
        tempPaper.id = 'temp-invoice-paper';
        
        // Apply paper size class based on stored preference or default
        const paperSize = correction.TemplateStyle?.paperSize || 'a4';
        tempPaper.className = `invoice-paper ${paperSize}`;
        
        tempPaper.style.position = 'absolute';
        tempPaper.style.left = '-9999px';
        document.body.appendChild(tempPaper);
        
        // Prepare data
        const invoiceData = {
            invoice_data: {
                invoice_number: correction.OriginalInvoiceNo,
                invoice_date: correction.InvoiceDate,
                from_address: correction.FromAddress,
                to_address: correction.ToAddress,
                gst_number: correction.SupplierGST,
                customer_gst: correction.CustomerGST,
                total_quantity: correction.TotalQuantity,
                total: correction.Total,
                taxes: correction.Taxes,
                subtotal: correction.Subtotal,
                tax_amount: correction.TaxAmount
            },
            items: items,
            styling: correction.TemplateStyle || {}
        };
        
        // Render the invoice
        renderInvoicePreview(invoiceData, tempPaper);
        
        // Wait for rendering to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get actual paper dimensions in pixels at 96 DPI
        let width, height;
        if (paperSize === 'a4') {
            width = 8.27 * 96;  // A4 width in pixels at 96 DPI
            height = 11.69 * 96; // A4 height in pixels at 96 DPI
        } else {
            width = 8.5 * 96;   // Letter width in pixels
            height = 11 * 96;    // Letter height in pixels
        }
        
        // Generate PDF with proper dimensions
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: paperSize
        });
        
        // Use html2canvas with proper scaling
        await html2canvas(tempPaper, {
            scale: 2, // Higher scale for better quality
            width: width,
            height: height,
            logging: false,
            useCORS: true,
            allowTaint: true,
            scrollX: 0,
            scrollY: 0,
            windowWidth: width,
            windowHeight: height
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            
            // Calculate dimensions in mm (jsPDF uses mm by default)
            const imgWidth = paperSize === 'a4' ? 210 : 216; // A4=210mm, Letter=216mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`${invoiceNumber.replace(/\//g, '-')}.pdf`);
        });
        
        // Clean up
        document.body.removeChild(tempPaper);
        showSuccess('Invoice downloaded successfully!');
    } catch (error) {
        console.error('Download error:', error);
        showError(error.message || 'Failed to download invoice');
        
        const tempPaper = document.getElementById('temp-invoice-paper');
        if (tempPaper) document.body.removeChild(tempPaper);
    }
}

// Helper function to render the invoice preview (similar to the one in invoice_process.js)
function renderInvoicePreview(data, paperElement) {

    // Debug incoming data
    console.log("Invoice Data:", data.invoice_data);
    console.log("Items Data:", data.items);
    console.log("Styling Data:", data.styling);

    const invData = data.invoice_data || {};
    const items = data.items || [];
    const styling = data.styling || {};
    
    // Apply default styling with dynamic overrides
    const defaultStyles = {
        paperSize: 'a4',
        headerColor: '#333333',
        textColor: '#333333',
        accentColor: '#3498db',
        topMargin: '0.7in',
        fontFamily: 'Arial, sans-serif'
    };
    
    const styles = { 
        ...defaultStyles, 
        ...styling,
        // Ensure topMargin has proper units
        topMargin: styling.topMargin && !styling.topMargin.includes('in') 
            ? `${styling.topMargin}in` 
            : (styling.topMargin || defaultStyles.topMargin)
    };

    // Safely get values with defaults
    const fromAddress = invData.from_address || '';
    const toAddress = invData.to_address || '';
    const invoiceNumber = invData.invoice_number || 'INV-001';
    const total = invData.total || '0.00';
    const invoiceDate = invData.invoice_date || new Date().toLocaleDateString();
    const supplierGst = invData.gst_number || '';
    const customerGst = invData.customer_gst || '';
    const taxDetails = invData.taxes || '';

    // Calculate totals from items if not provided
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.Amount) || 0), 0);
    const taxAmount = items.reduce((sum, item) => {
        const rate = parseFloat(item.Tax) || 0;
        const amount = parseFloat(item.Amount) || 0;
        return sum + (amount - (amount / (1 + (rate / 100))));
    }, 0);

    // Generate items HTML
    let itemsHtml = '';
    if (items.length === 0) {
        itemsHtml = '<tr><td colspan="8" class="no-items">No items found</td></tr>';
    } else {
        items.forEach((item, index) => {
            const amount = parseFloat(item.Amount) || 0;
            const rate = parseFloat(item.Rate) || 0;
            const quantity = parseFloat(item.Quantity) || 1;
            const tax = amount - (rate * quantity);
            
            itemsHtml += `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        ${item.Description || 'Item'}<br>
                        <span class="item-desc">${item.HSN || ''}</span>
                    </td>
                    <td>
                        ${quantity}<br>
                        <span class="item-desc">Nos</span>
                    </td>
                    <td>${rate.toFixed(2)}</td>
                    <td>0.00</td>
                    <td>${item.Tax || '0'}%</td>
                    <td>${tax.toFixed(2)}</td>
                    <td>${amount.toFixed(2)}</td>
                </tr>
            `;
        });
    }
    
    // Generate the invoice HTML (exact match to invoice_process.js)
    const invoiceHtml = `
        <div class="header">
            <div class="company-info">
                <div class="company-name">${fromAddress.split('\n')[0] || 'Your Company'}</div>
                <div>${fromAddress.replace(/\n/g, '<br>') || 'Address'}</div>
            </div>
            <div class="invoice-title">
                <div class="invoice-type">TAX INVOICE</div>
                <div class="invoice-number"># ${invoiceNumber}</div>
                <div class="balance-due">
                    <div class="balance-label">Balance Due</div>
                    <div class="balance-amount">₹${total}</div>
                </div>
            </div>
        </div>

        <div class="address-section">
            <div class="bill-to">
                <div class="address-label">Bill To</div>
                <div>
                    <span class="customer-name">${toAddress.split('\n')[0] || 'Customer'}</span><br>
                    ${toAddress.replace(/\n/g, '<br>') || 'Address'}
                </div>
                <div class="customer-gstin">
                    GSTIN: ${customerGst}
                </div>
            </div>
            <div class="invoice-details">
                <table>
                    <tr>
                        <td>Invoice Date:</td>
                        <td class="text-right">${invoiceDate}</td>
                    </tr>
                    <tr>
                        <td>GSTIN:</td>
                        <td class="text-right">${supplierGst}</td>
                    </tr>
                </table>
            </div>
        </div>

        <table class="items-table">
            <colgroup>
                <col style="width:5%">   <!-- # -->
                <col style="width:35%">  <!-- Description -->
                <col style="width:10%">  <!-- Qty -->
                <col style="width:10%">  <!-- Rate -->
                <col style="width:10%">  <!-- Discount -->
                <col style="width:10%">  <!-- Tax % -->
                <col style="width:10%">  <!-- Tax -->
                <col style="width:10%">  <!-- Amount -->
            </colgroup>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Item & Description</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Discount</th>
                    <th>Tax %</th>
                    <th>Tax</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div class="totals-container">
            <div class="notes-section">
                <div class="terms-label">Notes</div>
                <div>${taxDetails}</div>
            </div>
            <div class="totals-section">
                <table class="totals-table">
                    <tr>
                        <td class="total-label">Sub Total</td>
                        <td class="total-value">₹${subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td class="total-label">Tax Amount</td>
                        <td class="total-value">₹${taxAmount.toFixed(2)}</td>
                    </tr>
                    <tr class="balance-row">
                        <td class="total-label"><b>Total</b></td>
                        <td class="total-value"><b>₹${(subtotal + taxAmount).toFixed(2)}</b></td>
                    </tr>
                </table>
            </div>
        </div>

        <div class="signature-section">
            <div class="terms-label">Authorized Signature</div>
            <div class="signature-line"></div>
        </div>

        <div class="footer">
            <div class="text-center">Thank you for your business!</div>
        </div>
    `;
    
    // Set the HTML content
    paperElement.innerHTML = invoiceHtml;
    
    // Create and apply styles (exact match to invoice_process.js)
    const style = document.createElement('style');
    style.textContent = `
        .invoice-paper {
            font-family: ${styles.fontFamily};
            width: ${styles.paperSize === 'a4' ? '210mm' : '216mm'};
            min-height: ${styles.paperSize === 'a4' ? '297mm' : '279mm'};
            margin: 0 auto;
            padding: ${styles.topMargin};
            background: white;
            color: ${styles.textColor};
            overflow: visible !important;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            border-bottom: 2px solid ${styles.accentColor};
            padding-bottom: 15px;
        }
        
        .company-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 5px;
        }
        
        .invoice-type {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
            color: ${styles.headerColor};
        }
        
        .balance-amount {
            color: ${styles.accentColor};
        }
        
        .address-section {
            display: flex;
            margin-bottom: 30px;
        }
        
        .bill-to {
            width: 60%;
        }
        
        .invoice-details {
            width: 40%;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        .items-table th {
            background-color: ${styles.headerColor};
            color: white;
            text-align: left;
        }
        
        .items-table td {
            border-bottom: 1px solid #ddd;
        }
        
        .item-desc {
            color: #666;
            font-size: 10px;
        }
        
        .totals-container {
            display: flex;
            margin-bottom: 20px;
        }
        
        .notes-section {
            width: 50%;
        }
        
        .totals-section {
            width: 50%;
        }
        
        .totals-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .totals-table td {
            padding: 5px 10px;
        }
        
        .total-label {
            text-align: right;
            padding-right: 10px;
        }
        
        .total-value {
            text-align: right;
            width: 100px;
        }
        
        .balance-row {
            border-top: 2px solid ${styles.accentColor};
        }
        
        .signature-line {
            width: 200px;
            border-top: 1px solid ${styles.textColor};
            margin-top: 30px;
        }
        
        .footer {
            margin-top: 50px;
            border-top: 1px solid #ddd;
            padding-top: 10px;
            font-size: 10px;
            color: ${styles.accentColor};
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .no-items {
            text-align: center;
            padding: 20px;
            color: red;
            font-weight: bold;
        }
    `;
    
    paperElement.appendChild(style);
}

function editInvoice(event, invoiceNumber) {
    event.stopPropagation();
    // Store current page in session storage so we can return to it
    sessionStorage.setItem('lastInvoicePage', currentPage);
    window.location.href = `/edit-invoice/${invoiceNumber}`;
}

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're returning from edit
    const lastPage = sessionStorage.getItem('lastInvoicePage');
    if (lastPage) {
        currentPage = parseInt(lastPage);
        sessionStorage.removeItem('lastInvoicePage');
    }
    
    if (document.getElementById('completed-list').style.display === 'block') {
        loadCompletedInvoices();
    }
});


async function deleteInvoice(event, invoiceNumber) {
    event.preventDefault();
    event.stopPropagation();
    
    confirmDelete(async () => {
        showLoading('Deleting invoice...');
        
        try {
            console.log('Original invoiceNumber:', invoiceNumber);
            const encodedInvoiceNumber = encodeURIComponent(invoiceNumber);
            console.log('Encoded invoiceNumber:', encodedInvoiceNumber);
            const response = await fetch(`/api/v1/invoices/corrections/delete?invoice_number=${encodedInvoiceNumber}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete invoice');
            }
            
            const result = await response.json();
            showSuccess(result.message);
            
            // Refresh the invoice list
            loadCompletedInvoices();
            
        } catch (error) {
            showError(error.message);
            console.error('Delete error:', error);
        }
    });
}

document.addEventListener('click', function(e) {
    const btn = e.target.closest('.action-buttons button');
    if (!btn) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const invoiceNumber = btn.dataset.invoice;
    
    if (btn.classList.contains('btn-download')) {
        downloadInvoice(e, invoiceNumber);
    } else if (btn.classList.contains('btn-delete')) {
        deleteInvoice(e, invoiceNumber);
    }
});

function setLoadingState(isLoading) {
    const tableBody = document.getElementById('completed-invoices-body');
    if (isLoading) {
        tableBody.innerHTML = '<tr><td colspan="7" class="loading-text">Loading invoices...</td></tr>';
    }
    document.querySelectorAll('.pagination-controls button').forEach(btn => {
        btn.disabled = isLoading;
    });
}

