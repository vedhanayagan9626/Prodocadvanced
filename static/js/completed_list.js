import { showSuccess, showError, showLoading, confirmDelete } from '/static/js/notifications.js';

let currentPage = 1;
const itemsPerPage = 10;
const token = localStorage.getItem('authToken');
let currentBillType = 'regular'; // 'regular' or 'advanced'

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're already on the completed list page
    if (document.getElementById('completed-list').style.display === 'block') {
        loadBills();
    }
    
    // Add event listener for bill type selection
    const billTypeSelect = document.getElementById('bill-type-select');
    if (billTypeSelect) {
        billTypeSelect.value = 'regular'; // Set default value
        currentBillType = 'regular';      // Ensure variable matches
        billTypeSelect.addEventListener('change', function() {
            currentBillType = this.value;
            currentPage = 1; // Reset to first page
            loadBills();
        });
        loadBills(); // Trigger initial load for default value
    }

    
    // Add event listener for Excel download button
    const downloadExcelBtn = document.getElementById('download-excel-btn');
    if (downloadExcelBtn) {
        downloadExcelBtn.addEventListener('click', downloadAdvancedBillsExcel);
    }
});

// Make sure this function is globally available
window.loadBills = loadBills;

function toggleBillTables() {
    const regularTable = document.getElementById('regular-bills-table');
    const advancedTable = document.getElementById('advanced-bills-table');
    const downloadExcelBtn = document.getElementById('download-excel-btn');
    
    if (currentBillType === 'regular') {
        if (regularTable) regularTable.style.display = 'table';
        if (advancedTable) advancedTable.style.display = 'none';
        if (downloadExcelBtn) downloadExcelBtn.style.display = 'none';
    } else {
        if (regularTable) regularTable.style.display = 'none';
        if (advancedTable) advancedTable.style.display = 'table';
        if (downloadExcelBtn) downloadExcelBtn.style.display = 'inline-flex';
    }
}

function loadBills() {
    toggleBillTables(); // Add this line
    
    if (currentBillType === 'regular') {
        loadRegularBills();
    } else {
        loadAdvancedBills();
    }
}

function loadRegularBills() {
    const tableBody = document.getElementById('regular-invoices-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="8" class="loading-text">Loading regular bills...</td></tr>';
    
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
            renderRegularBills(data, total, totalPages);
        })
        .catch(error => {
            console.error('Error:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="error-text">
                        Failed to load regular bills: ${error.message}
                        <button onclick="loadRegularBills()">Retry</button>
                    </td>
                </tr>
            `;
        });
}

function loadAdvancedBills() {
    const tableBody = document.getElementById('advanced-invoices-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="10" class="loading-text">Loading advanced bills...</td></tr>';
    
    fetch(`/api/v1/advanced-invoices?page=${currentPage}&per_page=${itemsPerPage}`)
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
            renderAdvancedBills(data, total, totalPages);
        })
        .catch(error => {
            console.error('Error:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="error-text">
                        Failed to load advanced bills: ${error.message}
                        <button onclick="loadAdvancedBills()">Retry</button>
                    </td>
                </tr>
            `;
        });
}

function renderRegularBills(invoices, total = 0, totalPages = 1) {
    const tableBody = document.getElementById('regular-invoices-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';

    // Update pagination controls
    updatePaginationControls(total, totalPages);

    if (invoices.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8">No regular bills found</td></tr>';
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
                    <button class="btn-download" data-invoice="${invoice.invoice_number}" data-type="regular">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn-delete" data-invoice="${invoice.invoice_number}" data-type="regular">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        } catch (error) {
            console.error('Error rendering regular bill row:', error);
            showError('Error displaying some bill data');
        }
    });
}

function renderAdvancedBills(invoices, total = 0, totalPages = 1) {
    const tableBody = document.getElementById('advanced-invoices-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';

    // Update pagination controls
    updatePaginationControls(total, totalPages);

    if (invoices.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10">No advanced bills found</td></tr>';
        return;
    }

    invoices.forEach(invoice => {
        try {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            
            row.innerHTML = `
                <td>${invoice.BillDate || 'N/A'}</td>
                <td>${invoice.BillNumber || 'N/A'}</td>
                <td>${invoice.VendorName || 'N/A'}</td>
                <td>${invoice.CustomerName || 'N/A'}</td>
                <td>${invoice.Items ? invoice.Items.length : 0}</td>
                <td>₹${invoice.SubTotal ? parseFloat(invoice.SubTotal).toFixed(2) : '0.00'}</td>
                <td>₹${invoice.TaxAmount ? parseFloat(invoice.TaxAmount).toFixed(2) : '0.00'}</td>
                <td>₹${invoice.Total ? parseFloat(invoice.Total).toFixed(2) : '0.00'}</td>
                <td><span class="status-badge ${invoice.Status || 'DRAFT'}">${invoice.Status || 'DRAFT'}</span></td>
                <td class="action-buttons">

                    <button class="btn-download" data-id="${invoice.InvoiceID}" data-type="advanced">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn-delete" data-id="${invoice.InvoiceID}" data-type="advanced">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        } catch (error) {
            console.error('Error rendering advanced bill row:', error);
            showError('Error displaying some bill data');
        }
    });
}

function updatePaginationControls(total = 0, totalPages = 1) {
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

// Event listeners for pagination
document.getElementById('prev-page')?.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadBills();
    }
});

document.getElementById('next-page')?.addEventListener('click', () => {
    currentPage++;
    loadBills();
});

// Event listener for all action buttons
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.action-buttons button, .action-buttons i');
    if (!btn) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const button = btn.tagName === 'I' ? btn.parentElement : btn;
    const id = button.dataset.invoice || button.dataset.id;
    const type = button.dataset.type || 'regular';
    
    if (button.classList.contains('btn-view')) {
        viewBill(id, type);
    } else if (button.classList.contains('btn-edit')) {
        editBill(id, type);
    } else if (button.classList.contains('btn-download')) {
        downloadBill(e, id, type);
    } else if (button.classList.contains('btn-delete')) {
        deleteBill(e, id, type);
    }
});

function viewBill(id, type) {
    if (type === 'advanced') {
        window.open(`/invoice-editor-advanced?invoice_id=${id}`, '_blank');
    } else {
        window.open(`/invoice-details?invoice_no=${id}`, '_blank');
    }
}

function editBill(id, type) {
    if (type === 'advanced') {
        window.open(`/invoice-editor-advanced?invoice_id=${id}&mode=edit`, '_blank');
    } else {
        // Regular bills might not have edit functionality
        showError('Edit functionality not available for regular bills');
    }
}

async function downloadBill(event, id, type) {
    event.preventDefault();
    event.stopPropagation();

    if (type === 'regular') {
        downloadRegularInvoice(id);
    } else {
        downloadAdvancedInvoice(id);
    }
}

async function downloadRegularInvoice(invoiceNumber) {
    showLoading('Preparing download...');

    try {
        if (!window.jspdf || !window.html2canvas) {
            throw new Error('Required libraries not loaded');
        }

        const { jsPDF } = window.jspdf;

        const encodedInvoiceNumber = encodeURIComponent(invoiceNumber);

        // Fetch invoice correction data
        const correctionResponse = await fetch(`/api/v1/invoices/corrections/latest?invoice_number=${encodedInvoiceNumber}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!correctionResponse.ok) {
            const errorText = await correctionResponse.text();
            throw new Error(errorText);
        }

        const correction = await correctionResponse.json();

        // Fetch invoice items
        const itemsResponse = await fetch(`/api/v1/corrections/${correction.CorrectionID}/items`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!itemsResponse.ok) {
            throw new Error(await itemsResponse.text());
        }

        const items = await itemsResponse.json();

        // Create a temporary container and render the invoice preview
        const tempPaper = document.createElement('div');
        tempPaper.id = 'temp-invoice-paper';

        // Apply paper size class based on correction.TemplateStyle or default to 'a4'
        const paperSize = correction.TemplateStyle?.paperSize || 'a4';
        tempPaper.className = `invoice-paper ${paperSize}`;

        tempPaper.style.position = 'absolute';
        tempPaper.style.left = '-9999px';
        document.body.appendChild(tempPaper);

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

        renderInvoicePreview(invoiceData, tempPaper);

        // Wait briefly to allow rendering
        await new Promise(resolve => setTimeout(resolve, 500));

        // Calculate dimensions for canvas at 96 DPI
        let width, height;
        if (paperSize === 'a4') {
            width = 8.27 * 96;  // A4 width in px
            height = 11.69 * 96; // A4 height in px
        } else {
            width = 8.5 * 96;   // Letter width in px
            height = 11 * 96;    // Letter height in px
        }

        // Use html2canvas to generate image of invoice
        const canvas = await html2canvas(tempPaper, {
            scale: 2,
            width: width,
            height: height,
            logging: false,
            useCORS: true,
            allowTaint: true,
            scrollX: 0,
            scrollY: 0,
            windowWidth: width,
            windowHeight: height
        });

        const imgData = canvas.toDataURL('image/png');

        // Create jsPDF instance with paper size
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: paperSize
        });

        // Calculate image dimensions in mm (jsPDF default)
        const imgWidth = paperSize === 'a4' ? 210 : 216;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        // Convert PDF to base64 data URI string for sending to backend
        const pdfBase64 = pdf.output('datauristring');

        // Suggest filename for saving, sanitize invoice number, add .pdf extension
        const suggestedFilename = `${invoiceNumber.replace(/\//g, '-')}.pdf`;

        // Call PyWebView native save dialog to allow user to pick location and filename
        const saveResponse = await window.pywebview.api.save_file_dialog(pdfBase64, suggestedFilename);

        if (saveResponse.status === "success") {
            showSuccess(`Invoice saved successfully: ${saveResponse.path}`);
        } else if (saveResponse.status === "cancelled") {
            showError("Save cancelled by user");
        } else {
            showError(`Error saving file: ${saveResponse.message || 'Unknown error'}`);
        }

        // Clean up temporary DOM
        document.body.removeChild(tempPaper);

    } catch (error) {
        console.error('Download error:', error);
        showError(error.message || 'Failed to download invoice');

        // Remove temp element if exists
        const tempPaper = document.getElementById('temp-invoice-paper');
        if (tempPaper) document.body.removeChild(tempPaper);
    }
}

async function downloadAdvancedInvoice(id) {
    showLoading('Preparing advanced invoice download...');
    
    try {
        const response = await fetch(`/api/v1/advanced-invoices/${id}/download`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to download advanced invoice');
        }
        
        // Get the Excel file as blob
        const blob = await response.blob();
        
        // Convert blob to base64
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
        });
        reader.readAsDataURL(blob);
        
        const base64Data = await base64Promise;
        
        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `advanced_invoice_${id}.xlsx`;
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }
        
        // Call PyWebView native save dialog
        const saveResponse = await window.pywebview.api.save_file_dialog(base64Data, filename);
        
        if (saveResponse.status === "success") {
            showSuccess(`Advanced invoice saved successfully: ${saveResponse.path}`);
        } else if (saveResponse.status === "cancelled") {
            showError("Save cancelled by user");
        } else {
            showError(`Error saving file: ${saveResponse.message || 'Unknown error'}`);
        }
        
    } catch (error) {
        console.error('Error downloading advanced invoice:', error);
        showError(error.message || 'Failed to download advanced invoice');
    }
}

async function downloadAdvancedBillsExcel() {
    showLoading('Preparing Excel export...');
    
    try {
        const response = await fetch('/api/v1/advanced-invoices/export/excel', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to export advanced bills to Excel');
        }
        
        // Get the zip file as blob
        const blob = await response.blob();
        
        // Convert blob to base64
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
        });
        reader.readAsDataURL(blob);
        
        const base64Data = await base64Promise;
        
        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'advanced_invoices_export.zip';
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }
        
        // Call PyWebView native save dialog
        const saveResponse = await window.pywebview.api.save_file_dialog(base64Data, filename);
        
        if (saveResponse.status === "success") {
            showSuccess(`Advanced bills exported successfully: ${saveResponse.path}`);
        } else if (saveResponse.status === "cancelled") {
            showError("Export cancelled by user");
        } else {
            showError(`Error exporting: ${saveResponse.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showError(error.message || 'Failed to export');
    }
}

async function deleteBill(event, id, type) {
    event.preventDefault();
    event.stopPropagation();
    
    confirmDelete(async () => {
        showLoading('Deleting bill...');
        
        try {
            let response;
            if (type === 'regular') {
                const encodedInvoiceNumber = encodeURIComponent(id);
                response = await fetch(`/api/v1/invoices/corrections/delete?invoice_number=${encodedInvoiceNumber}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
            } else {
                response = await fetch(`/api/v1/advanced-invoices/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
            }
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete bill');
            }
            
            const result = await response.json();
            showSuccess(result.message);
            
            // Refresh the bill list
            loadBills();
            
        } catch (error) {
            showError(error.message);
            console.error('Delete error:', error);
        }
    });
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

// function editInvoice(event, invoiceNumber) {
//     event.stopPropagation();
//     // Store current page in session storage so we can return to it
//     sessionStorage.setItem('lastInvoicePage', currentPage);
//     window.location.href = `/edit-invoice/${invoiceNumber}`;
// }

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

// Set loading state
function setLoadingState(isLoading) {
    const tableBody = currentBillType === 'regular' 
        ? document.getElementById('regular-invoices-body')
        : document.getElementById('advanced-invoices-body');
    
    if (isLoading && tableBody) {
        tableBody.innerHTML = '<tr><td colspan="10" class="loading-text">Loading bills...</td></tr>';
    }
    
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (prevBtn) prevBtn.disabled = isLoading;
    if (nextBtn) nextBtn.disabled = isLoading;
}

// Make sure to update the DOMContentLoaded event listener to handle both bill types
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're returning from edit
    const lastPage = sessionStorage.getItem('lastInvoicePage');
    if (lastPage) {
        currentPage = parseInt(lastPage);
        sessionStorage.removeItem('lastInvoicePage');
    }
    
    if (document.getElementById('completed-list').style.display === 'block') {
        loadBills();
    }
});