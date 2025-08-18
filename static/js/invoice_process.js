
// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Global variables
let lastExtractedData = null;
let dt; // DataTable instance
let pdfDoc = null;
let currentPage = 1;
let activeElement = null;
let jsPDF = window.jspdf;
let currentPreview = null; // High-quality preview instance
const token = localStorage.getItem('authToken');
let currentTemplate = 'default';
let retryCount = 0;
const MAX_RETRIES = 10;
const urlParams = new URLSearchParams(window.location.search);
const previewFilename = urlParams.get('file') || 'invoice.pdf'; // Use uploaded or default

// Invoice Templates
const invoiceTemplates = {
    default: {
        name: "Default invoice",
        description: "Basic Layout with essential fields",
        category: "Business",
        html: (data) => `
        <div class="invoice-paper-temp default-template">
            <!-- Header Section -->
            <div class="header-section">
                <div class="company-info">
                    <div class="company-name">${data.fromAddress.split('\n')[0] || 'Your Company'}</div>
                    <div class="company-address">${data.fromAddress.replace(/\n/g, '<br>') || 'Address'}</div>
                    <div class="company-gst">GSTIN: ${data.supplierGst || ''}</div>
                </div>
                <div class="invoice-meta">
                    <div class="invoice-title-row">
                        <span class="invoice-title">TAX INVOICE</span>
                    </div>
                    <div class="invoice-number-row">
                        <span class="invoice-number-label">Invoice No:</span>
                        <span class="invoice-number">${data.invoiceNumber || 'INV-001'}</span>
                    </div>
                    <div class="due-amount-row">
                        <span class="due-amount-label">Due Amount:</span>
                        <span class="due-amount">₹${(data.subtotal + data.taxAmount).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <!-- Client Section -->
            <div class="client-section">
                <div class="client-info">
                    <div class="bill-to-label">BILL TO:</div>
                    <div class="client-name">${data.toAddress.split('\n')[0] || 'Customer'}</div>
                    <div class="client-address">${data.toAddress.replace(/\n/g, '<br>') || 'Address'}</div>
                    <div class="client-gst">GSTIN: ${data.customerGst || ''}</div>
                </div>
                <div class="client-meta">
                    <div class="invoice-date-row">
                        <span class="invoice-date-label">Invoice Date:</span>
                        <span class="invoice-date">${data.invoiceDate || new Date().toLocaleDateString()}</span>
                    </div>
                    <div class="customer-gst-row">
                        <span class="customer-gst-label">Customer GSTIN:</span>
                        <span class="customer-gst">${data.customerGst || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <!-- Items Table -->
            <table class="items-table">
                <thead>
                    <tr>
                        <th class="item-no">#</th>
                        <th class="item-desc">Description</th>
                        <th class="item-qty">Qty</th>
                        <th class="item-rate">Rate</th>
                        <th class="item-tax">Tax %</th>
                        <th class="item-amount">Amount</th>
                    </tr>
                </thead>
                <tbody class="items-body">
                    ${generateItemsHtml(data.items)}
                </tbody>
            </table>

            <!-- Totals Section -->
            <div class="totals-section">
                <div class="notes-section">
                    <div class="notes-label">Notes</div>
                    <div class="notes-content">${data.taxDetails || ''}</div>
                </div>
                <div class="amounts-section">
                    <div class="subtotal-row">
                        <span>Subtotal:</span>
                        <span>₹${data.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="tax-row">
                        <span>Tax:</span>
                        <span>₹${data.taxAmount.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span>Total:</span>
                        <span>₹${(data.subtotal + data.taxAmount).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer-section">
                <div class="thank-you">Thank you for your business!</div>
                <div class="signature-section">
                    <div class="signature-line"></div>
                    <div class="signature-label">Authorized Signature</div>
                </div>
            </div>
        </div>
        `,
        styles: `
            @page {
                size: A4;
                margin: 0;
            }
            
            body {
                margin: 0;
                padding: 0;
                background-color: #f5f5f5;
                font-family: Arial, sans-serif;
            }
            
            .invoice-paper-temp {
                width: 210mm !important;
                min-height: 297mm !important;
                margin: 0 auto;
                padding: var(--inv-topMargin, 0.7in) var(--inv-sideMargin, 0.5in);
                background-color: white;
                box-sizing: border-box;
                color: var(--inv-textColor, #333333);
                font-family: Arial, sans-serif;
                page-break-inside: avoid;
            }

            /* Header Section */
            .header-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
            }

            .company-info {
                width: 60%;
            }

            .invoice-meta {
                width: 35%;
                text-align: right;
            }

            .company-name {
                font-weight: bold;
                font-size: 20px;
                margin-bottom: 8px;
                color: var(--inv-textColor, #333333);
            }

            .company-address {
                font-size: 14px;
                color: var(--inv-textColor, #333333);
                margin-bottom: 8px;
                line-height: 1.4;
                opacity: 0.8;
            }

            .company-gst {
                font-size: 14px;
                color: var(--inv-textColor, #333333);
                opacity: 0.8;
            }

            .invoice-title {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
                color: var(--inv-textColor, #333333);
            }

            .invoice-number-row, .due-amount-row {
                margin-bottom: 8px;
                font-size: 14px;
            }

            .invoice-number, .due-amount {
                font-weight: bold;
                color: var(--inv-accentColor, #2196F3);
            }

            /* Client Section */
            .client-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                border-top: 1px solid #eee;
                border-bottom: 1px solid #eee;
                padding: 15px 0;
            }

            .client-info {
                width: 60%;
            }

            .client-meta {
                width: 35%;
                text-align: right;
            }

            .bill-to-label {
                font-weight: bold;
                margin-bottom: 8px;
            }

            .client-name {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 8px;
            }

            .client-address {
                font-size: 14px;
                margin-bottom: 8px;
                line-height: 1.4;
                opacity: 0.8;
            }

            .client-gst {
                font-size: 14px;
                opacity: 0.8;
            }

            .invoice-date-row, .customer-gst-row {
                margin-bottom: 8px;
                font-size: 14px;
            }

            .invoice-date-label, .customer-gst-label {
                opacity: 0.8;
            }

            /* Items Table */
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
                font-size: 14px;
            }

            .items-table th {
                background-color: var(--inv-headerColor, #333333);
                color: white;
                text-align: left;
                padding: 10px;
                font-weight: normal;
            }

            .items-table td {
                border-bottom: 1px solid #ddd;
                padding: 10px;
                vertical-align: top;
            }

            .item-desc {
                color: var(--inv-textColor, #666666);
            }

            /* Totals Section */
            .totals-section {
                display: flex;
                margin-top: 20px;
                margin-bottom: 40px;
            }

            .notes-section {
                width: 60%;
                padding-right: 20px;
            }

            .notes-label {
                font-weight: bold;
                margin-bottom: 10px;
            }

            .notes-content {
                font-size: 14px;
                line-height: 1.4;
                opacity: 0.8;
            }

            .amounts-section {
                width: 40%;
                font-size: 14px;
            }

            .subtotal-row,
            .tax-row,
            .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
            }

            .total-row {
                font-weight: bold;
                font-size: 16px;
                border-top: 1px solid var(--inv-textColor, #333333);
                padding-top: 10px;
                margin-top: 10px;
            }

            .total-row span:last-child {
                color: var(--inv-accentColor, #2196F3);
            }

            /* Footer Section */
            .footer-section {
                margin-top: auto;
                padding-top: 30px;
                border-top: 1px solid #eee;
            }

            .thank-you {
                font-style: italic;
                text-align: center;
                margin-bottom: 30px;
                opacity: 0.8;
            }

            .signature-section {
                text-align: right;
            }

            .signature-line {
                display: inline-block;
                width: 200px;
                border-bottom: 1px solid var(--inv-textColor, #333333);
                margin-bottom: 5px;
            }

            .signature-label {
                font-size: 14px;
                opacity: 0.8;
            }

            @media print {
                body {
                    background: none;
                }
                
                .invoice-paper-temp {
                    box-shadow: none;
                    margin: 0;
                    width: auto;
                    height: auto;
                }
            }
        `
    },
    classic: {
        name: "Classic Invoice",
        description: "Elegant traditional layout with vintage styling",
        category: "Business",
        html: (data) => `
        <div class="invoice-paper-temp classic-template">
            <!-- Decorative Header -->
            <div class="decorative-header">
                <div class="company-logo-placeholder"></div>
                <div class="header-details">
                    <div class="invoice-title">TAX INVOICE</div>
                    <div class="invoice-meta">
                        <div class="invoice-number-row">
                            <span class="meta-label">Invoice No:</span>
                            <span class="invoice-number">${data.invoiceNumber || 'INV-001'}</span>
                        </div>
                        <div class="invoice-date-row">
                            <span class="meta-label">Date:</span>
                            <span class="invoice-date">${data.invoiceDate || new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Company and Client Sections -->
            <div class="main-details-section">
                <div class="company-info">
                    <div class="company-name">${data.fromAddress.split('\n')[0] || 'Your Company'}</div>
                    <div class="company-address">${data.fromAddress.replace(/\n/g, '<br>') || 'Address'}</div>
                    <div class="company-contact">
                        <span class="company-gst">GSTIN: ${data.supplierGst || ''}</span>
                    </div>
                </div>

                <div class="client-info">
                    <div class="section-title">BILL TO</div>
                    <div class="client-name">${data.toAddress.split('\n')[0] || 'Customer'}</div>
                    <div class="client-address">${data.toAddress.replace(/\n/g, '<br>') || 'Address'}</div>
                    <div class="client-contact">
                        <span class="client-gst">GSTIN: ${data.customerGst || ''}</span>
                    </div>
                </div>
            </div>

            <!-- Items Table -->
            <table class="items-table">
                <thead>
                    <tr>
                        <th class="item-no">SR</th>
                        <th class="item-desc">DESCRIPTION</th>
                        <th class="item-qty">QTY</th>
                        <th class="item-rate">RATE</th>
                        <th class="item-tax">TAX %</th>
                        <th class="item-amount">AMOUNT</th>
                    </tr>
                </thead>
                <tbody class="items-body">
                    ${generateItemsHtml(data.items)}
                </tbody>
            </table>

            <!-- Totals Section -->
            <div class="totals-section">
                <div class="notes-section">
                    <div class="section-title">TERMS & NOTES</div>
                    <div class="notes-content">${data.taxDetails || 'Payment due within 15 days. Thank you for your business.'}</div>
                </div>
                <div class="amounts-section">
                    <div class="subtotal-row">
                        <span class="amount-label">Subtotal:</span>
                        <span class="amount-value">₹${data.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="tax-row">
                        <span class="amount-label">Tax:</span>
                        <span class="amount-value">₹${data.taxAmount.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span class="amount-label">Total Amount:</span>
                        <span class="amount-value">₹${(data.subtotal + data.taxAmount).toFixed(2)}</span>
                    </div>
                    <div class="due-amount-row">
                        <span class="amount-label">Amount Due:</span>
                        <span class="amount-value">₹${(data.subtotal + data.taxAmount).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer-section">
                <div class="bank-details">
                    <div class="section-title">BANK DETAILS</div>
                    <div class="bank-info">
                        <div>Bank Name: Sample Bank</div>
                        <div>Account No: 1234567890</div>
                        <div>IFSC Code: SBIN0000123</div>
                    </div>
                </div>
                <div class="signature-section">
                    <div class="signature-line"></div>
                    <div class="signature-label">Authorized Signatory</div>
                </div>
            </div>
        </div>
        `,
        styles: `
            @page {
                size: A4;
                margin: 0;
            }
            
            body {
                margin: 0;
                padding: 0;
                background-color: #f9f9f9;
            }
            
            .invoice-paper-temp {
                width: 210mm !important;
                min-height: 297mm !important;
                margin: 0 auto;
                padding: var(--inv-topMargin, 15mm) var(--inv-sideMargin, 20mm);
                background-color: white;
                color: var(--inv-textColor, #333);
                font-family: 'Times New Roman', serif;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                position: relative;
            }

            /* Decorative Header */
            .decorative-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-bottom: 15px;
                margin-bottom: 20px;
                border-bottom: 2px solid var(--inv-headerColor, #8B4513);
                position: relative;
            }

            .decorative-header::after {
                content: '';
                position: absolute;
                bottom: -5px;
                left: 0;
                width: 100%;
                height: 1px;
                background-color: var(--inv-headerColor, #8B4513);
                opacity: 0.3;
            }

            .company-logo-placeholder {
                width: 80px;
                height: 80px;
                border: 1px dashed #ccc;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #999;
                font-size: 12px;
            }

            .header-details {
                text-align: right;
            }

            .invoice-title {
                font-size: 28px;
                font-weight: bold;
                color: var(--inv-headerColor, #8B4513);
                margin-bottom: 5px;
                letter-spacing: 1px;
            }

            .invoice-meta {
                font-size: 14px;
            }

            .invoice-number-row, .invoice-date-row {
                margin-bottom: 3px;
            }

            .meta-label {
                font-weight: bold;
                margin-right: 5px;
            }

            .invoice-number {
                color: var(--inv-accentColor, #8B4513);
                font-weight: bold;
            }

            /* Main Details Section */
            .main-details-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
            }

            .company-info, .client-info {
                width: 48%;
            }

            .section-title {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 10px;
                color: var(--inv-headerColor, #8B4513);
                border-bottom: 1px solid #eee;
                padding-bottom: 5px;
            }

            .company-name, .client-name {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 8px;
            }

            .company-address, .client-address {
                font-size: 14px;
                line-height: 1.5;
                margin-bottom: 8px;
            }

            .company-contact, .client-contact {
                font-size: 14px;
                font-style: italic;
            }

            /* Items Table */
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 25px 0;
                font-size: 14px;
            }

            .items-table th {
                background-color: var(--inv-headerColor, #8B4513);
                color: white;
                padding: 12px 10px;
                text-align: left;
                font-weight: normal;
                border: 1px solid #ddd;
            }

            .items-table td {
                padding: 10px;
                border: 1px solid #ddd;
            }

            .items-table tr:nth-child(even) {
                background-color: #f9f9f9;
            }

            /* Totals Section */
            .totals-section {
                display: flex;
                margin-top: 20px;
            }

            .notes-section {
                width: 60%;
                padding-right: 20px;
            }

            .notes-content {
                font-size: 14px;
                line-height: 1.6;
                padding: 10px;
                border: 1px solid #eee;
                min-height: 100px;
            }

            .amounts-section {
                width: 40%;
                font-size: 14px;
                border: 1px solid #eee;
                padding: 15px;
            }

            .subtotal-row, .tax-row, .total-row, .due-amount-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
            }

            .total-row, .due-amount-row {
                font-weight: bold;
                padding-top: 10px;
                border-top: 1px solid #ddd;
            }

            .total-row .amount-value, .due-amount-row .amount-value {
                color: var(--inv-accentColor, #8B4513);
                font-size: 16px;
            }

            /* Footer Section */
            .footer-section {
                display: flex;
                justify-content: space-between;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 2px solid var(--inv-headerColor, #8B4513);
            }

            .bank-details {
                width: 60%;
            }

            .bank-info {
                font-size: 14px;
                line-height: 1.6;
            }

            .signature-section {
                width: 30%;
                text-align: center;
            }

            .signature-line {
                display: inline-block;
                width: 200px;
                border-bottom: 1px solid var(--inv-textColor, #333);
                margin-bottom: 5px;
            }

            .signature-label {
                font-size: 14px;
                font-weight: bold;
            }

            @media print {
                body {
                    background: none;
                }
                
                .invoice-paper-temp {
                    box-shadow: none;
                    margin: 0;
                    width: auto;
                    height: auto;
                    padding: 15mm 20mm;
                }
            }
        `
    },
    modern: {
        name: "Modern Invoice",
        description: "Sleek contemporary design with clean typography",
        category: "Business",
        html: (data) => `
        <div class="invoice-paper-temp modern-template">
            <!-- Modern Header with Accent Bar -->
            <div class="header-accent-bar"></div>
            
            <div class="header-section">
                <div class="company-info">
                    <div class="company-logo-placeholder">
                        <span class="logo-initials">${data.fromAddress.split('\n')[0] ? data.fromAddress.split('\n')[0].charAt(0) : 'Y'}</span>
                    </div>
                    <div class="company-details">
                        <div class="company-name">${data.fromAddress.split('\n')[0] || 'Your Company'}</div>
                        <div class="company-address">${data.fromAddress.replace(/\n/g, '<br>') || 'Address'}</div>
                        <div class="company-contact">
                            <span class="company-gst">GSTIN: ${data.supplierGst || ''}</span>
                        </div>
                    </div>
                </div>
                
                <div class="invoice-meta">
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-meta-grid">
                        <div class="meta-label">Invoice #</div>
                        <div class="meta-value invoice-number">${data.invoiceNumber || 'INV-001'}</div>
                        
                        <div class="meta-label">Date Issued</div>
                        <div class="meta-value">${data.invoiceDate || new Date().toLocaleDateString()}</div>
                        
                        <div class="meta-label">Due Date</div>
                        <div class="meta-value">${data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
                        
                        <div class="meta-label">Amount Due</div>
                        <div class="meta-value due-amount">₹${(data.subtotal + data.taxAmount).toFixed(2)}</div>
                    </div>
                </div>
            </div>

            <!-- Client Section with Clean Layout -->
            <div class="client-section">
                <div class="client-info">
                    <div class="section-title with-icon">
                        <svg class="icon" viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                        </svg>
                        <span>CLIENT DETAILS</span>
                    </div>
                    <div class="client-name">${data.toAddress.split('\n')[0] || 'Customer'}</div>
                    <div class="client-address">${data.toAddress.replace(/\n/g, '<br>') || 'Address'}</div>
                    <div class="client-contact">
                        <span class="client-gst">GSTIN: ${data.customerGst || ''}</span>
                    </div>
                </div>
                
                <div class="payment-info">
                    <div class="section-title with-icon">
                        <svg class="icon" viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
                        </svg>
                        <span>PAYMENT METHOD</span>
                    </div>
                    <div class="payment-method">Bank Transfer</div>
                    <div class="payment-details">
                        <div>Account No: 1234 5678 9012</div>
                        <div>IFSC: ABCD0123456</div>
                    </div>
                </div>
            </div>

            <!-- Responsive Items Table -->
            <div class="table-container">
                <table class="items-table">
                    <thead>
                        <tr>
                            <th class="item-no">#</th>
                            <th class="item-desc">ITEM DESCRIPTION</th>
                            <th class="item-qty">QTY</th>
                            <th class="item-rate">RATE</th>
                            <th class="item-tax">TAX</th>
                            <th class="item-amount">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody class="items-body">
                        ${generateItemsHtml(data.items)}
                    </tbody>
                </table>
            </div>

            <!-- Summary Section -->
            <div class="summary-section">
                <div class="notes-section">
                    <div class="section-title">NOTES</div>
                    <div class="notes-content">${data.taxDetails || 'Payment due within 15 days. Late payments subject to 1.5% monthly interest.'}</div>
                </div>
                
                <div class="amounts-section">
                    <div class="amount-row subtotal-row">
                        <div class="amount-label">Subtotal</div>
                        <div class="amount-value">₹${data.subtotal.toFixed(2)}</div>
                    </div>
                    <div class="amount-row tax-row">
                        <div class="amount-label">Tax (${data.taxRate || 18}%)</div>
                        <div class="amount-value">₹${data.taxAmount.toFixed(2)}</div>
                    </div>
                    <div class="amount-row discount-row">
                        <div class="amount-label">Discount</div>
                        <div class="amount-value">-₹0.00</div>
                    </div>
                    <div class="amount-row total-row">
                        <div class="amount-label">Total Due</div>
                        <div class="amount-value">₹${(data.subtotal + data.taxAmount).toFixed(2)}</div>
                    </div>
                </div>
            </div>

            <!-- Modern Footer -->
            <div class="footer-section">
                <div class="thank-you-message">
                    <div class="thank-you">Thank you for your business!</div>
                    <div class="company-slogan">Quality products · Professional service</div>
                </div>
                <div class="signature-section">
                    <div class="signature-line"></div>
                    <div class="signature-label">Authorized Signature</div>
                </div>
            </div>
        </div>
        `,
        styles: `
            @page {
                size: A4;
                margin: 0;
            }
            
            body {
                margin: 0;
                padding: 0;
                background-color: #f8fafc;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }
            
            .invoice-paper-temp {
                width: 100%;
                max-width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                padding: 15mm 5mm;
                background-color: white;
                color: var(--inv-textColor, #334155);
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                position: relative;
                overflow: hidden;
                box-sizing: border-box;
            }

            /* Modern Header Styles */
            .header-accent-bar {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 6px;
                background-color: var(--inv-accentColor, #3B82F6);
            }

            .header-section {
                display: flex;
                flex-direction: column;
                gap: 20px;
                margin-bottom: 30px;
                padding: 20px 10px 0;
            }

            .company-info {
                display: flex;
                align-items: flex-start;
                gap: 15px;
            }

            .company-logo-placeholder {
                flex-shrink: 0;
                width: 50px;
                height: 50px;
                border-radius: 12px;
                background-color: var(--inv-accentColor, #3B82F6);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                font-weight: bold;
            }

            .company-name {
                font-size: 18px;
                font-weight: 700;
                color: var(--inv-textColor, #1E293B);
                margin-bottom: 6px;
            }

            .company-address {
                font-size: 13px;
                color: var(--inv-textColor, #64748B);
                line-height: 1.4;
                margin-bottom: 6px;
            }

            .company-contact {
                font-size: 12px;
                color: var(--inv-textColor, #64748B);
            }

            .invoice-meta {
                text-align: left;
            }

            .invoice-title {
                font-size: 24px;
                font-weight: 800;
                color: var(--inv-textColor, #1E293B);
                margin-bottom: 10px;
                letter-spacing: -0.5px;
            }

            .invoice-meta-grid {
                display: grid;
                grid-template-columns: max-content auto;
                gap: 8px 15px;
                text-align: right;
                align-items: center;
            }

            .meta-label {
                font-size: 13px;
                color: var(--inv-textColor, #64748B);
                font-weight: 500;
                white-space: nowrap; /* Prevent wrapping */
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .meta-value {
                font-size: 14px;
                font-weight: 600;
                color: var(--inv-textColor, #1E293B);
                white-space: nowrap; /* Prevent wrapping */
                text-align: left;
            }

            .invoice-number, .due-amount {
                color: var(--inv-accentColor, #3B82F6);
                font-weight: 700;
            }

            /* Client Section */
            .client-section {
                display: flex;
                flex-direction: column;
                gap: 20px;
                margin-bottom: 30px;
                padding: 20px;
                background-color: #F8FAFC;
                border-radius: 12px;
            }

            .section-title {
                font-size: 13px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--inv-accentColor, #3B82F6);
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .client-name {
                font-size: 15px;
                font-weight: 600;
                margin-bottom: 6px;
                color: var(--inv-textColor, #1E293B);
            }

            .client-address, .payment-method {
                font-size: 13px;
                color: var(--inv-textColor, #64748B);
                line-height: 1.4;
                margin-bottom: 6px;
            }

            .client-contact, .payment-details {
                font-size: 12px;
                color: var(--inv-textColor, #64748B);
            }

            .payment-details div {
                margin-bottom: 3px;
            }

            /* Responsive Items Table */
            .table-container {
                width: 100%;
                overflow-x: auto;
                margin: 20px 0;
                -webkit-overflow-scrolling: touch;
            }

            .items-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
                min-width: 600px;
            }

            .items-table th {
                background-color: var(--inv-headerColor, #1E293B);
                color: white;
                padding: 10px 12px;
                text-align: left;
                font-weight: 600;
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.5px;
            }

            .items-table td {
                padding: 12px;
                border-bottom: 1px solid #F1F5F9;
                color: var(--inv-textColor, #334155);
            }

            .items-table tr:last-child td {
                border-bottom: none;
            }

            /* Summary Section */
            .summary-section {
                display: flex;
                flex-direction: column;
                gap: 20px;
                margin-top: 20px;
            }

            .notes-section {
                width: 100%;
            }

            .notes-content {
                font-size: 13px;
                color: var(--inv-textColor, #64748B);
                line-height: 1.5;
            }

            .amounts-section {
                width: 100%;
                background-color: #F8FAFC;
                padding: 15px;
                border-radius: 12px;
            }

            .amount-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
            }

            .amount-label {
                font-size: 13px;
                color: var(--inv-textColor, #64748B);
            }

            .amount-value {
                font-size: 13px;
                font-weight: 600;
                color: var(--inv-textColor, #1E293B);
            }

            .total-row {
                padding-top: 10px;
                margin-top: 10px;
                border-top: 1px solid #E2E8F0;
            }

            .total-row .amount-label {
                font-weight: 700;
            }

            .total-row .amount-value {
                font-size: 15px;
                font-weight: 700;
                color: var(--inv-accentColor, #3B82F6);
            }

            /* Footer Section */
            .footer-section {
                display: flex;
                flex-direction: column;
                gap: 20px;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #F1F5F9;
            }

            .thank-you-message {
                width: 100%;
            }

            .thank-you {
                font-size: 14px;
                font-weight: 600;
                color: var(--inv-textColor, #1E293B);
                margin-bottom: 6px;
            }

            .company-slogan {
                font-size: 12px;
                color: var(--inv-textColor, #64748B);
                font-style: italic;
            }

            .signature-section {
                text-align: left;
            }

            .signature-line {
                display: inline-block;
                width: 150px;
                border-bottom: 1px solid #CBD5E1;
                margin-bottom: 6px;
            }

            .signature-label {
                font-size: 12px;
                color: var(--inv-textColor, #64748B);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            /* Media Queries for Larger Screens */
            @media (min-width: 768px) {
                .invoice-paper-temp {
                    padding: 15mm 20mm;
                }
                
                .header-section {
                    flex-direction: row;
                    justify-content: space-between;
                    padding-top: 20px;
                }
                
                .invoice-meta {
                    text-align: right;
                }
                
                .invoice-meta-grid {
                    text-align: right;
                }
                
                .client-section {
                    flex-direction: row;
                    justify-content: space-between; /* Add space between client and payment info */
                    gap: 30px;
                }

                .client-info {
                    flex: 1;
                    min-width: 0; /* Allow text truncation */
                }
                .payment-info {
                    flex: 1;
                    min-width: 0; /* Allow text truncation */
                    text-align: right; /* Align payment info to right */
                }
                
                .summary-section {
                    flex-direction: row;
                }
                
                .notes-section {
                    width: 60%;
                    padding-right: 30px;
                }
                
                .amounts-section {
                    width: 40%;
                }
                
                .footer-section {
                    flex-direction: row;
                    justify-content: space-between;
                    align-items: flex-end;
                }
                
                .thank-you-message {
                    max-width: 60%;
                }
                
                .signature-section {
                    text-align: center;
                }
            }

            @media print {
                body {
                    background: none;
                }
                
                .invoice-paper-temp {
                    box-shadow: none;
                    margin: 0;
                    width: auto;
                    height: auto;
                    padding: 15mm 20mm;
                }
                
                .table-container {
                    overflow-x: visible;
                }
            }
            /* Ensure client info text doesn't wrap */
            .client-name,
            .client-address,
            .client-contact,
            .payment-method,
            .payment-details div {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        `
    },
    minimal: {
        name: "Minimal Invoice",
        description: "Ultra-clean layout with essential elements only",
        category: "Minimal",
        html: (data) => `
        <div class="invoice-paper-temp minimal-template">
            <!-- Ultra-minimal Header -->
            <div class="header-section">
                <div class="company-name">${data.fromAddress.split('\n')[0] || 'Your Company'}</div>
                <div class="invoice-meta">
                    <div class="invoice-number">#${data.invoiceNumber || 'INV-001'}</div>
                    <div class="invoice-date">${data.invoiceDate || new Date().toLocaleDateString()}</div>
                </div>
            </div>

            <!-- Simplified Client Section -->
            <div class="client-section">
                <div class="client-info">
                    <div class="client-name">${data.toAddress.split('\n')[0] || 'Customer'}</div>
                    <div class="client-address">${data.toAddress.replace(/\n/g, '<br>') || 'Address'}</div>
                </div>
                <div class="invoice-details">
                    <div class="due-date">Due: ${data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
                    <div class="total-amount">₹${(data.subtotal + data.taxAmount).toFixed(2)}</div>
                </div>
            </div>

            <!-- Essential Items Table -->
            <table class="items-table">
                <thead>
                    <tr>
                        <th class="item-desc">Description</th>
                        <th class="item-qty">Qty</th>
                        <th class="item-amount">Amount</th>
                    </tr>
                </thead>
                <tbody class="items-body">
                    ${generateItemsHtml(data.items)}
                </tbody>
            </table>

            <!-- Minimal Totals Section -->
            <div class="totals-section">
                <div class="amounts-section">
                    <div class="amount-row">
                        <span>Subtotal</span>
                        <span>₹${data.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="amount-row">
                        <span>Tax</span>
                        <span>₹${data.taxAmount.toFixed(2)}</span>
                    </div>
                    <div class="amount-row total-row">
                        <span>Total</span>
                        <span>₹${(data.subtotal + data.taxAmount).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <!-- Barebones Footer -->
            <div class="footer-section">
                <div class="legal-info">
                    <div>GSTIN: ${data.supplierGst || 'Not Provided'}</div>
                    <div>${data.taxDetails || 'Payment due upon receipt'}</div>
                </div>
            </div>
        </div>
        `,
        styles: `
            @page {
                size: A4;
                margin: 0;
            }
            
            body {
                margin: 0;
                padding: 0;
                background-color: white;
            }
            
            .invoice-paper-temp {
                width: 210mm !important;
                min-height: 297mm !important;
                margin: 0 auto;
                padding: var(--inv-topMargin, 25mm) var(--inv-sideMargin, 25mm);
                background-color: white;
                color: var(--inv-textColor, #222);
                font-family: 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.5;
            }

            /* Header Section */
            .header-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                padding-bottom: 15px;
                border-bottom: 1px solid #eee;
            }

            .company-name {
                font-size: 24px;
                font-weight: 300;
                letter-spacing: -0.5px;
            }

            .invoice-meta {
                text-align: right;
            }

            .invoice-number {
                font-size: 16px;
                margin-bottom: 3px;
                color: var(--inv-accentColor, #222);
            }

            .invoice-date {
                font-size: 14px;
                color: #777;
            }

            /* Client Section */
            .client-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 40px;
            }

            .client-name {
                font-size: 18px;
                font-weight: 500;
                margin-bottom: 5px;
            }

            .client-address {
                font-size: 14px;
                color: #777;
                line-height: 1.6;
            }

            .invoice-details {
                text-align: right;
            }

            .due-date {
                font-size: 14px;
                color: #777;
                margin-bottom: 5px;
            }

            .total-amount {
                font-size: 20px;
                font-weight: 500;
                color: var(--inv-accentColor, #222);
            }

            /* Items Table */
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 0 0 30px 0;
                font-size: 14px;
            }

            .items-table th {
                text-align: left;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
                font-weight: 500;
                color: #777;
            }

            .items-table td {
                padding: 12px 0;
                border-bottom: 1px solid #eee;
            }

            .items-table tr:last-child td {
                border-bottom: none;
            }

            /* Totals Section */
            .totals-section {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #eee;
            }

            .amounts-section {
                width: 200px;
                margin-left: auto;
            }

            .amount-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 14px;
            }

            .total-row {
                font-weight: 500;
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid #eee;
                font-size: 16px;
            }

            .total-row span:last-child {
                color: var(--inv-accentColor, #222);
            }

            /* Footer Section */
            .footer-section {
                margin-top: 60px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 12px;
                color: #777;
                text-align: center;
            }

            .legal-info div {
                margin-bottom: 5px;
            }

            @media print {
                body {
                    background: none;
                }
                
                .invoice-paper-temp {
                    box-shadow: none;
                    margin: 0;
                    width: auto;
                    height: auto;
                    padding: 25mm;
                }
            }
        `
    },
professional: {
    name: "Professional Invoice",
    description: "Corporate design with premium styling",
    category: "Business",
    html: (data) => `
    <div class="invoice-paper-temp professional-template">
        <!-- Watermark Background -->
        <div class="header-watermark">${data.fromAddress?.split('\n')[0] || 'Your Company'}</div>
        
        <!-- Header Section with Improved Structure -->
        <div class="header-section">
            <div class="company-info-block">
                <div class="company-branding">
                    <div class="company-logo-placeholder"></div>
                    <div class="company-text">
                        <div class="company-name">${data.fromAddress?.split('\n')[0] || 'Your Company'}</div>
                        <div class="company-tagline">Professional Services</div>
                    </div>
                </div>
                <div class="company-details">
                    <div class="company-address">${(data.fromAddress || 'Corporate Headquarters').replace(/\n/g, '<br>')}</div>
                    <div class="company-contact">
                        <div class="company-gst">GSTIN: ${data.supplierGst || 'GSTINXXXXXX'}</div>
                        <div class="company-phone">+91 XXXXX XXXXX</div>
                    </div>
                </div>
            </div>

            <div class="invoice-meta-block">
                <div class="invoice-title-block">
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-status">ORIGINAL</div>
                </div>
                <div class="invoice-meta-details">
                    <div class="meta-row">
                        <span class="meta-label">Invoice #:</span>
                        <span class="meta-value invoice-number">${data.invoiceNumber || 'INV-001'}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Date:</span>
                        <span class="meta-value">${data.invoiceDate || new Date().toLocaleDateString()}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Due Date:</span>
                        <span class="meta-value">${data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Terms:</span>
                        <span class="meta-value">Net 30</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Client Section with Improved Layout -->
        <div class="client-section">
            <div class="client-info-block">
                <div class="section-title">BILL TO</div>
                <div class="client-details">
                    <div class="client-name">${data.toAddress?.split('\n')[0] || 'Customer Name'}</div>
                    <div class="client-address">${(data.toAddress || 'Customer Address').replace(/\n/g, '<br>')}</div>
                    <div class="client-tax">GSTIN: ${data.customerGst || 'GSTINXXXXXX'}</div>
                </div>
            </div>
            
            <div class="project-info-block">
                <div class="section-title">PROJECT</div>
                <div class="project-details">
                    <div class="project-name">${data.projectName || 'General Services'}</div>
                    <div class="project-reference">PO Number: ${data.poNumber || 'Not Provided'}</div>
                </div>
            </div>
        </div>

        <!-- Items Table with Better Responsive Structure -->
        <div class="table-container">
            <table class="items-table">
                <thead>
                    <tr>
                        <th class="item-no">NO.</th>
                        <th class="item-desc">DESCRIPTION</th>
                        <th class="item-qty">QTY</th>
                        <th class="item-rate">UNIT PRICE</th>
                        <th class="item-tax">TAX %</th>
                        <th class="item-amount">AMOUNT</th>
                    </tr>
                </thead>
                <tbody class="items-body">
                    ${generateItemsHtml(data.items)}
                </tbody>
            </table>
        </div>

        <!-- Summary Section -->
        <div class="summary-section">
            <div class="notes-block">
                <div class="section-title">TERMS & NOTES</div>
                <div class="notes-content">${data.taxDetails || '1. Payment due within 30 days<br>2. Late fee of 1.5% monthly interest applies<br>3. Make checks payable to company name'}</div>
            </div>
            
            <div class="amounts-block">
                <div class="amount-row subtotal-row">
                    <span class="amount-label">Subtotal:</span>
                    <span class="amount-value">₹${data.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="amount-row tax-row">
                    <span class="amount-label">Tax (${data.taxRate || 18}%):</span>
                    <span class="amount-value">₹${data.taxAmount?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="amount-row total-row">
                    <span class="amount-label">TOTAL DUE:</span>
                    <span class="amount-value">₹${(data.subtotal + data.taxAmount)?.toFixed(2) || '0.00'}</span>
                </div>
            </div>
        </div>

        <!-- Footer Section -->
        <div class="footer-section">
            <div class="bank-info-block">
                <div class="section-title">BANK INFORMATION</div>
                <div class="bank-details">
                    <div>Bank Name: Corporate Banking</div>
                    <div>Account No: XXXX-XXXX-XXXX</div>
                    <div>IFSC Code: XXXX0123456</div>
                </div>
            </div>
            <div class="signature-block">
                <div class="signature-area">
                    <div class="signature-line"></div>
                    <div class="signature-label">Authorized Signatory</div>
                </div>
                <div class="company-stamp">COMPANY STAMP</div>
            </div>
        </div>
    </div>
    `,
    styles: `
        @page {
            size: A4;
            margin: 0;
        }
        
        body {
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
            font-family: 'Calibri', 'Arial', sans-serif;
        }
        
        .invoice-paper-temp {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 20mm 25mm;
            background-color: white;
            color: #333;
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
        }

        /* Watermark Effect */
        .header-watermark {
            position: absolute;
            top: 30mm;
            right: 20mm;
            font-size: 80px;
            font-weight: bold;
            color: rgba(0,0,0,0.03);
            z-index: 0;
            transform: rotate(-15deg);
            white-space: nowrap;
        }

        /* Header Section - Fixed Structure */
        .header-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e1e1e1;
            flex-wrap: wrap;
            gap: 20px;
        }

        .company-info-block {
            flex: 1;
            min-width: 250px;
        }

        .invoice-meta-block {
            flex: 1;
            min-width: 250px;
            text-align: right;
        }

        .company-branding {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 10px;
        }

        .company-logo-placeholder {
            width: 50px;
            height: 50px;
            background-color: #2c5aa0;
            border-radius: 4px;
            flex-shrink: 0;
        }

        .company-text {
            flex-grow: 1;
        }

        .company-name {
            font-size: 22px;
            font-weight: 600;
            color: #222;
            margin-bottom: 2px;
            line-height: 1.2;
        }

        .company-tagline {
            font-size: 14px;
            color: #666;
            font-weight: 300;
        }

        .company-address {
            font-size: 13px;
            color: #666;
            line-height: 1.5;
            margin-bottom: 5px;
        }

        .company-contact {
            font-size: 13px;
            color: #666;
        }

        .invoice-title-block {
            margin-bottom: 15px;
        }

        .invoice-title {
            font-size: 28px;
            font-weight: 300;
            color: #222;
            display: inline-block;
            margin-right: 10px;
            line-height: 1;
        }

        .invoice-status {
            font-size: 12px;
            color: white;
            background-color: #2c5aa0;
            padding: 2px 10px;
            border-radius: 10px;
            display: inline-block;
            vertical-align: middle;
        }

        .invoice-meta-details {
            display: inline-block;
            text-align: right;
        }

        .meta-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 5px;
        }

        .meta-label {
            font-size: 13px;
            color: #666;
            font-weight: 300;
            margin-right: 10px;
            min-width: 80px;
            text-align: right;
        }

        .meta-value {
            font-size: 13px;
            font-weight: 600;
            color: #222;
            min-width: 100px;
            text-align: left;
        }

        .invoice-number {
            color: #2c5aa0;
        }

        /* Client Section - Improved Layout */
        .client-section {
            display: flex;
            flex-wrap: wrap;
            gap: 30px;
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f8fafc;
            border-radius: 4px;
        }

        .client-info-block, .project-info-block {
            flex: 1;
            min-width: 250px;
        }

        .section-title {
            font-size: 14px;
            font-weight: 600;
            color: #2c5aa0;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .client-name, .project-name {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 5px;
            color: #222;
        }

        .client-address {
            font-size: 13px;
            color: #666;
            line-height: 1.5;
            margin-bottom: 5px;
        }

        .client-tax, .project-reference {
            font-size: 13px;
            color: #666;
        }

        /* Items Table - Fixed Structure */
        .table-container {
            width: 100%;
            overflow-x: auto;
            margin: 25px 0;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            table-layout: fixed;
        }

        .items-table th {
            background-color: #2c5aa0;
            color: white;
            padding: 12px 10px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
        }

        .items-table td {
            padding: 12px 10px;
            border-bottom: 1px solid #f1f1f1;
            color: #444;
            word-break: break-word;
        }

        .items-table tr:last-child td {
            border-bottom: 2px solid #e1e1e1;
        }

        /* Column Widths */
        .item-no { width: 5%; }
        .item-desc { width: 35%; }
        .item-qty { width: 10%; }
        .item-rate { width: 15%; }
        .item-tax { width: 10%; }
        .item-amount { width: 15%; text-align: right; }

        /* Summary Section */
        .summary-section {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-top: 30px;
        }

        .notes-block {
            flex: 2;
            min-width: 300px;
        }

        .amounts-block {
            flex: 1;
            min-width: 250px;
        }

        .notes-content {
            font-size: 13px;
            color: #666;
            line-height: 1.6;
            padding: 15px;
            background-color: #f8fafc;
            border-radius: 4px;
        }

        .amount-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 13px;
        }

        .amount-label {
            color: #666;
        }

        .amount-value {
            font-weight: 600;
            color: #222;
        }

        .total-row {
            padding-top: 10px;
            margin-top: 10px;
            border-top: 1px solid #e1e1e1;
            font-weight: 600;
        }

        .total-row .amount-value {
            font-size: 15px;
            color: #2c5aa0;
            font-weight: 700;
        }

        /* Footer Section */
        .footer-section {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            gap: 20px;
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid #e1e1e1;
        }

        .bank-info-block {
            flex: 2;
            min-width: 300px;
        }

        .signature-block {
            flex: 1;
            min-width: 200px;
        }

        .bank-details {
            font-size: 13px;
            color: #666;
            line-height: 1.6;
            margin-top: 10px;
        }

        .signature-area {
            margin-bottom: 20px;
            text-align: center;
        }

        .signature-line {
            display: inline-block;
            width: 200px;
            border-bottom: 1px solid #ccc;
            margin-bottom: 5px;
        }

        .signature-label {
            font-size: 13px;
            color: #666;
            text-transform: uppercase;
        }

        .company-stamp {
            font-size: 12px;
            color: #666;
            border: 1px dashed #ccc;
            padding: 15px 10px;
            display: inline-block;
            text-align: center;
        }

        @media print {
            body {
                background: none;
            }
            
            .invoice-paper-temp {
                box-shadow: none;
                margin: 0;
                width: auto;
                height: auto;
                padding: 20mm 25mm;
            }
            
            .header-section, .client-section, .summary-section, .footer-section {
                break-inside: avoid;
            }
            
            .items-table {
                page-break-inside: avoid;
            }
        }
    `
}
};


// High-quality preview system for invoices
class HighQualityPreview {
  constructor(container, element) {
    this.container = container; // The wrapper div element (e.g., #previewWrapper)
    this.element = element; // The image or canvas element to pan/zoom

    this.scale = 1;
    this.minScale = 0.1;
    this.maxScale = 10;
    this.translateX = 0;
    this.translateY = 0;
    this.isDragging = false;

    this.startX = 0;
    this.startY = 0;

    this.activePointers = new Map();

    this.element.style.transformOrigin = '0 0';
    this.element.style.cursor = 'grab';

    this._boundPointerDown = this.onPointerDown.bind(this);
    this._boundPointerMove = this.onPointerMove.bind(this);
    this._boundPointerUp = this.onPointerUp.bind(this);
    this._boundWheel = this.onWheel.bind(this);

    this.initEvents();
  }

  initEvents() {
    this.element.addEventListener('pointerdown', this._boundPointerDown);
    window.addEventListener('pointermove', this._boundPointerMove);
    window.addEventListener('pointerup', this._boundPointerUp);
    window.addEventListener('pointercancel', this._boundPointerUp);
    this.container.addEventListener('wheel', this._boundWheel, { passive: false });
  }

  dispose() {
    this.element.removeEventListener('pointerdown', this._boundPointerDown);
    window.removeEventListener('pointermove', this._boundPointerMove);
    window.removeEventListener('pointerup', this._boundPointerUp);
    window.removeEventListener('pointercancel', this._boundPointerUp);
    this.container.removeEventListener('wheel', this._boundWheel);
  }

  onPointerDown(ev) {
    ev.preventDefault();
    this.activePointers.set(ev.pointerId, ev);

    if (this.activePointers.size === 1) {
      this.isDragging = true;
      this.startX = ev.clientX - this.translateX;
      this.startY = ev.clientY - this.translateY;
      this.element.style.cursor = 'grabbing';
    }
  }

  onPointerMove(ev) {
    if (!this.isDragging) return;
    if (!this.activePointers.has(ev.pointerId)) return;
    
    ev.preventDefault();

    this.activePointers.set(ev.pointerId, ev);

    if (this.activePointers.size === 1) {
      const pointer = ev;
      this.translateX = pointer.clientX - this.startX;
      this.translateY = pointer.clientY - this.startY;
      this.applyTransform();
    }
  }

  onPointerUp(ev) {
    if (this.activePointers.has(ev.pointerId)) {
      this.activePointers.delete(ev.pointerId);
    }
    if (this.activePointers.size === 0) {
      this.isDragging = false;
      this.element.style.cursor = 'grab';
    }
  }

  onWheel(ev) {
    ev.preventDefault();

    const wheel = ev.deltaY;
    const zoomFactor = 1.1;
    let newScale = this.scale;

    if (wheel < 0) {
      newScale *= zoomFactor;
    } else {
      newScale /= zoomFactor;
    }

    newScale = Math.min(this.maxScale, Math.max(this.minScale, newScale));

    const rect = this.element.getBoundingClientRect();
    const offsetX = ev.clientX - rect.left;
    const offsetY = ev.clientY - rect.top;

    this.translateX -= (offsetX / this.scale) * (newScale - this.scale);
    this.translateY -= (offsetY / this.scale) * (newScale - this.scale);

    this.scale = newScale;
    this.applyTransform();
  }

  applyTransform() {
    this.element.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }

  fitToScreen() {
    this.translateX = 0;
    this.translateY = 0;

    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    let elementWidth, elementHeight;

    if (this.element.tagName.toLowerCase() === 'img') {
      elementWidth = this.element.naturalWidth;
      elementHeight = this.element.naturalHeight;
    } else if (this.element.tagName.toLowerCase() === 'canvas') {
      elementWidth = this.element.width;
      elementHeight = this.element.height;
    } else {
      elementWidth = this.element.offsetWidth;
      elementHeight = this.element.offsetHeight;
    }

    if (elementWidth === 0 || elementHeight === 0) {
      this.scale = 1;
    } else {
      const scaleX = containerWidth / elementWidth;
      const scaleY = containerHeight / elementHeight;
      this.scale = Math.min(scaleX, scaleY, 1);
    }

    this.translateX = (containerWidth - elementWidth * this.scale) / 2;
    this.translateY = (containerHeight - elementHeight * this.scale) / 2;

    this.applyTransform();
  }

  // For images, after src is set and loaded
  initImagePreview() {
    if (this.element.tagName.toLowerCase() !== 'img') {
      console.warn('HighQualityPreview: initImagePreview called on non-image element');
      return;
    }
    if (!this.element.complete) {
      this.element.onload = () => {
        this.fitToScreen();
      };
    } else {
      this.fitToScreen();
    }
  }

  // For PDF canvas previews, you may want to call this after drawing the page on canvas
  initPdfPreview() {
    if (this.element.tagName.toLowerCase() !== 'canvas') {
      console.warn('HighQualityPreview: initPdfPreview called on non-canvas element');
      return;
    }
    this.fitToScreen();
  }
}



// Make essential functions globally available
window.displayFilePreview = displayFilePreview;
window.processFile = processFile;
window.showToast = showToast;

// DELAY APPEARANCE OF SPINNER (only if load is >350ms)
let spinnerTimeout = setTimeout(function() {
  document.getElementById('InvoiceeditorNavglobalSpinnerOverlay').style.display = 'flex';
}, 350); // Change 350ms to whatever feels "slow" for your app

// Main Initialization
window.addEventListener('load', function() {

    // HIDE SPINNER WHEN PAGE LOADS
  clearTimeout(spinnerTimeout); // Cancel spinner if not already shown
  document.getElementById('InvoiceeditorNavglobalSpinnerOverlay').style.display = 'none';

  // ... your initialization code
  initializeApplication();
  setupPreviewControls();
  initializeItemHandlers();
  setupPreviewListeners();
});


function initializeApplication() {
    // Initialize jsPDF correctly
    window.jsPDF = window.jspdf.jsPDF;
    
    // Setup DataTable
    dt = $('#recentInvoiceTable').DataTable({
        paging: false,
        searching: false,
        info: false
    });
     
    // Handle incoming file parameters from URI
    handleUrlParameters();

    // Initialize with editor hidden
    $('#extractedSection').show();
    
    // Set default values
    $('#invoiceNumber').val('INV-' + new Date().getTime());
    $('#invoiceDate').val(new Date().toLocaleDateString());
    $('#--inv-headerColor').val('#333333');
    $('#--inv-textColor').val('#333333');
    $('#--inv-accentColor').val('#2196F3');

    // Initialize event handlers
    $('#uploadForm').on('submit', handleFormSubmit);
    $('#saveBtn').on('click', handleSaveInvoice);
    $('#addItemBtn').on('click', handleAddItem);
    
    // Initialize template selection
    $('#templateSelect').change(function () {
        currentTemplate = $(this).val();
        renderInvoicePreviewFromForm();
        const paper = document.getElementById('invoice-paper-temp');
        if (paper) {
            paper.className = `invoice-paper-temp ${currentTemplate}-template`;
        }
    });


    // Initialize download buttons
    $('#downloadPdfBtn').on('click', function(e) {
        e.preventDefault();
        downloadAsPDFWithDialog();
    });

    $('#downloadImageBtn').on('click', function(e) {
        e.preventDefault();
        downloadAsImageWithDialog();
    });


    // Window resize handler
    window.addEventListener('resize', function() {
        if (currentPreview) {
            currentPreview.handleResize();
        }
    });

    // Initialize preview controls
    setupPreviewControls();
    
    // Initialize item handlers
    initializeItemHandlers();
    
    // Setup preview listeners
    setupPreviewListeners();
}

// Enhanced PDF preview function with high quality
async function fetchPDFPreview(filename) {
  const pdfViewer = document.getElementById('pdfViewer');
  const wrapper = document.getElementById('previewWrapper');

  try {
    if (currentPreview) {
      currentPreview.dispose();
      currentPreview = null;
    }

    const response = await fetch(`/api/v1/get-file?filename=${encodeURIComponent(filename)}`);
    if (!response.ok) throw new Error('Failed to load PDF');

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const pdf = await pdfjsLib.getDocument(objectUrl).promise;
    const page = await pdf.getPage(1);

    // Draw the first page on canvas
    const viewport = page.getViewport({ scale: 1.5 });
    pdfViewer.width = viewport.width;
    pdfViewer.height = viewport.height;

    const renderContext = {
      canvasContext: pdfViewer.getContext('2d'),
      viewport: viewport,
    };
    await page.render(renderContext).promise;

    pdfViewer.style.display = 'block';
    document.getElementById('previewImg').style.display = 'none';

    currentPreview = new HighQualityPreview(wrapper, pdfViewer);
    currentPreview.initPdfPreview();
    
    showToast("PDF loaded successfully");
  } catch (error) {
    console.error("PDF preview error:", error);
    showToast("Failed to load PDF preview", false);
  }
}

// Enhanced image preview function with high quality
async function fetchImagePreview(filename) {
  const previewImg = document.getElementById('previewImg');
  const wrapper = document.getElementById('previewWrapper');

  try {
    if (currentPreview) {
      currentPreview.dispose();
      currentPreview = null;
    }

    const response = await fetch(`/api/v1/get-file?filename=${encodeURIComponent(filename)}`);
    if (!response.ok) throw new Error('Failed to load image');

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    previewImg.src = objectUrl;
    previewImg.style.display = 'block';
    document.getElementById('pdfViewer').style.display = 'none';

    currentPreview = new HighQualityPreview(wrapper, previewImg);
    currentPreview.initImagePreview();

    showToast("Image loaded successfully");
  } catch (error) {
    console.error("Image preview error:", error);
    showToast("Failed to load image preview", false);
  }
}

// Display file preview with high quality support
function displayFilePreview(filename) {
    if (!filename) {
        showToast("No file specified for preview", false);
        return;
    }
    
    const fileType = filename.split('.').pop().toLowerCase();
    const previewImg = document.getElementById('previewImg');
    const pdfViewer = document.getElementById('pdfViewer');

    // Hide both initially
    previewImg.style.display = 'none';
    pdfViewer.style.display = 'none';
    
    // Clear previous transforms
    previewImg.style.transform = 'none';
    pdfViewer.style.transform = 'none';

    if (fileType === 'pdf') {
        fetchPDFPreview(filename);
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'].includes(fileType)) {
        fetchImagePreview(filename);
    } else {
        showToast("Unsupported file type for preview", false);
    }
}

function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const filename = urlParams.get('file');
    const originalFilename = urlParams.get('original') || filename;
    const mode = urlParams.get('mode') || 'text';
    
    if (filename) {
        // Display the original filename
        $('#currentFilename').text(originalFilename || filename);
        $('#modeSelect').val(mode);
        
        // Display the file preview
        displayFilePreview(filename);
    } else {
        showToast("No file specified for processing", false);
    }
}

// File Processing Functions
function processFile(filename, mode) {
    showGlobalSpinner();
    
    // Disable form during processing
    $('#uploadForm').find('button, input, select').prop('disabled', true);
    
    const formData = new FormData();
    formData.append('filename', filename);
    formData.append('mode', mode);

    fetch('/api/v1/upload-invoice', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(response.statusText || 'Server returned an error');
        }
        return response.json();
    })
    .then(data => {
        showToast("Invoice processed successfully");
        renderExtractedInvoice(data);
        renderInvoicePreview(data);
    })
    .catch(error => {
        console.error("Processing error:", error);
        showToast(error.message || 'File processing failed', false);
    })
    .finally(() => {
        hideGlobalSpinner();
        $('#uploadForm').find('button, input, select').prop('disabled', false);
    });
}

// Event Handlers
function handleFormSubmit(e) {
    e.preventDefault();
    const filename = new URLSearchParams(window.location.search).get('file');
    const mode = $('#modeSelect').val();
    
    if (!filename) {
        showToast("No file to process", false);
        return;
    }
    
    processFile(filename, mode);
}

function renderExtractedInvoice(result) {
    lastExtractedData = result;
    const invData = result.invoice_data || {};
    const items = result.items || [];
    
    // Populate basic invoice fields
    $('#invoiceNumber').val(invData.invoice_number || '');
    $('#invoiceDate').val(invData.invoice_date || '');
    $('#fromAddress').val(invData.from_address || '');
    $('#toAddress').val(invData.to_address || '');
    $('#supplierGst').val(invData.gst_number || '');
    $('#totalQuantity').val(invData.total_quantity || '');
    $('#total').val(invData.total || '');
    $('#taxDetails').val(invData.taxes || '');
    
    // Render items
    const itemsTableBody = $('#itemsTableBody');
    itemsTableBody.empty();
    
    let subtotal = 0;
    let taxAmount = 0;
    
    items.forEach(item => {
        const amount = parseFloat(item.amount) || 0;
        const taxRate = parseFloat(item.gst || 0);
        subtotal += amount / (1 + (taxRate / 100));
        taxAmount += amount - (amount / (1 + (taxRate / 100)));
        
        itemsTableBody.append(createItemRow(item));
    });
    
    // Calculate totals
    updateTotals(subtotal, taxAmount);
    $('#extractedSection').show();
    
    // Initialize event handlers
    initializeItemHandlers();
}

function createItemRow(item) {
    const amount = parseFloat(item.amount) || 0;
    const taxRate = parseFloat(item.gst) || 0;
    const qty = parseFloat(item.quantity) || 1;
    const rate = amount / (1 + (taxRate / 100)) / qty;
    
    return `
    <tr data-id="${item.item_id || ''}">
        <td><input type="text" class="form-control form-control-sm item-desc" value="${item.description || ''}" data-field="description"></td>
        <td><input type="number" class="form-control form-control-sm qty" value="${qty}" data-field="quantity" min="0" step="0.01"></td>
        <td><input type="number" class="form-control form-control-sm rate" value="${rate.toFixed(2)}" data-field="price_per_unit" min="0" step="0.01"></td>
        <td><input type="number" class="form-control form-control-sm tax" value="${taxRate}" data-field="gst" min="0" max="100" step="0.01"></td>
        <td><input type="number" class="form-control form-control-sm amount" value="${amount.toFixed(2)}" data-field="amount" readonly></td>
        <td class="text-center"><button type="button" class="remove-item-btn" style=" color: red ; border-color: red;  background-color:red 0.4;">×</button></td>
    </tr>`;
}

function initializeItemHandlers() {
    // Add item button
    $('#addItemBtn').off('click').on('click', handleAddItem);
    
    // Remove item button
    $('#itemsTableBody').on('click', '.remove-item-btn', function() {
        $(this).closest('tr').remove();
        calculateInvoiceTotals();
        renderInvoicePreviewFromForm();
    });
    
    // Live updates for item description and other fields
    $('#itemsTableBody').on('input', '.item-desc, .qty, .rate, .tax', function() {
        const row = $(this).closest('tr');
        if ($(this).hasClass('item-desc')) {
            // Immediate preview update for description changes
            renderInvoicePreviewFromForm();
        } else {
            calculateRowTotal(row);
            calculateInvoiceTotals();
            renderInvoicePreviewFromForm();
        }
    });
}

function handleAddItem() {
    $('#itemsTableBody').append(`
    <tr>
        <td><input type="text" class="form-control form-control-sm item-desc" data-field="description" placeholder="Item description"></td>
        <td><input type="number" class="form-control form-control-sm qty" data-field="quantity" value="1" min="0" step="0.01"></td>
        <td><input type="number" class="form-control form-control-sm rate" data-field="price_per_unit" value="0.00" min="0" step="0.01"></td>
        <td><input type="number" class="form-control form-control-sm tax" data-field="gst" value="18" min="0" max="100" step="0.01"></td>
        <td><input type="number" class="form-control form-control-sm amount" data-field="amount" value="0.00" readonly></td>
        <td class="text-center"><button type="button" class="btn btn-link remove-item-btn">×</button></td>
    </tr>
    `);
    calculateInvoiceTotals();
    renderInvoicePreviewFromForm();
}

function calculateRowTotal(row) {
    const qty = parseFloat(row.find('.qty').val()) || 0;
    const rate = parseFloat(row.find('.rate').val()) || 0;
    const taxRate = parseFloat(row.find('.tax').val()) || 0;
    
    const subtotal = qty * rate;
    const total = subtotal * (1 + (taxRate / 100));
    
    row.find('.amount').val(total.toFixed(2));
}

function calculateInvoiceTotals() {
    let subtotal = 0;
    let taxAmount = 0;
    
    $('#itemsTableBody tr').each(function() {
        const amount = parseFloat($(this).find('.amount').val()) || 0;
        const taxRate = parseFloat($(this).find('.tax').val()) || 0;
        
        subtotal += amount / (1 + (taxRate / 100));
        taxAmount += amount - (amount / (1 + (taxRate / 100)));
    });
    
    updateTotals(subtotal, taxAmount);
}

function updateTotals(subtotal, taxAmount) {
    $('#subtotal').val(subtotal.toFixed(2));
    $('#taxAmount').val(taxAmount.toFixed(2));
    $('#total').val((subtotal + taxAmount).toFixed(2));
    $('#taxDetails').val(`IGST: ${taxAmount.toFixed(2)}, CGST: 0.00, SGST: 0.00`);
    
    // Update total quantity
    let totalQty = 0;
    $('#itemsTableBody .qty').each(function() {
        totalQty += parseFloat($(this).val()) || 0;
    });
    $('#totalQuantity').val(totalQty.toFixed(2));
}

function renderInvoicePreview(data, selectedTemplate) {
    const templateKey = selectedTemplate || currentTemplate || 'default';
    const template = invoiceTemplates[templateKey] || invoiceTemplates.default;

    const wrapper = document.getElementById('invoice-scale-wrapper');
    if (!wrapper) return;

    const templateData = {
        fromAddress: $('#fromAddress').val() || '',
        toAddress: $('#toAddress').val() || '',
        invoiceNumber: $('#invoiceNumber').val() || 'INV-001',
        invoiceDate: $('#invoiceDate').val() || new Date().toLocaleDateString(),
        supplierGst: $('#supplierGst').val() || '',
        customerGst: $('#customerGst').val() || '',
        taxDetails: $('#taxDetails').val() || '',
        subtotal: parseFloat($('#subtotal').val()) || 0,
        taxAmount: parseFloat($('#taxAmount').val()) || 0,
        items: getCurrentItems()
    };

    wrapper.innerHTML = template.html(templateData);

    // Apply styles
    $('#dynamic-template-styles').remove();
    $('head').append(`<style id="dynamic-template-styles">${template.styles}</style>`);

    // Now scale the wrapper instead of scaling only the paper
    setTimeout(() => {
        const scale = calculateOptimalScale(wrapper.querySelector('.invoice-paper-temp'));
        wrapper.style.transform = `scale(${scale})`;
    }, 50);
}




function getCurrentItems() {
    const items = [];
    $('#itemsTableBody tr').each(function() {
        const row = $(this);
        items.push({
            description: row.find('.item-desc').val() || '',
            quantity: parseFloat(row.find('.qty').val()) || 0,
            price_per_unit: parseFloat(row.find('.rate').val()) || 0,
            gst: parseFloat(row.find('.tax').val()) || 0,
            amount: parseFloat(row.find('.amount').val()) || 0
        });
    });
    return items;
}


function generateItemsHtml(items) {
    let html = '';
    items.forEach((item, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.description || 'Item'}</td>
                <td>${item.quantity || '1'}</td>
                <td>${(parseFloat(item.price_per_unit) || 0).toFixed(2)}</td>
                <td>${item.gst || '0'}%</td>
                <td>${(parseFloat(item.amount) || 0).toFixed(2)}</td>
            </tr>
        `;
    });
    return html || '<tr><td colspan="6" class="text-center">No items found</td></tr>';
}


function calculateOptimalScale(paperElement) {
    const container = document.getElementById('invoice-preview-container');
    if (!container || !paperElement) return 1;

    const paperRect = paperElement.getBoundingClientRect();
    const availableWidth = container.clientWidth * 0.95; // padding
    const availableHeight = container.clientHeight * 0.95;

    const widthScale = availableWidth / paperRect.width;
    const heightScale = availableHeight / paperRect.height;

    return Math.min(widthScale, heightScale);
}


function validateTemplate(templateKey) {
    const requiredFields = ['html', 'styles', 'name'];
    const template = invoiceTemplates[templateKey];
    
    if (!template) {
        console.error(`Template ${templateKey} not found`);
        return false;
    }
    
    for (const field of requiredFields) {
        if (!template[field]) {
            console.error(`Template ${templateKey} missing required field: ${field}`);
            return false;
        }
    }
    
    return true;
}

// Render preview from form data
function renderInvoicePreviewFromForm() {
    const items = [];
    let totalQty = 0;
    
    $('#itemsTableBody tr').each(function() {
        const row = $(this);
        const qty = parseFloat(row.find('.qty').val()) || 0;
        totalQty += qty;
        
        items.push({
            description: row.find('.item-desc').val() || 'Item',
            quantity: qty.toFixed(2),
            price_per_unit: row.find('.rate').val() || '0',
            gst: row.find('.tax').val() || '0',
            amount: row.find('.amount').val() || '0'
        });
    });
    
    $('#totalQuantity').val(totalQty.toFixed(2));
    
    renderInvoicePreview({
        invoice_data: {
            invoice_number: $('#invoiceNumber').val(),
            invoice_date: $('#invoiceDate').val(),
            from_address: $('#fromAddress').val(),
            to_address: $('#toAddress').val(),
            gst_number: $('#supplierGst').val(),
            customer_gst: $('#customerGst').val(),
            total_quantity: totalQty.toFixed(2),
            total: $('#total').val(),
            taxes: $('#taxDetails').val()
        },
        items: items
    });
    
    updatePreviewColors();
}

// Set up event listeners for form changes to update preview
function setupPreviewListeners() {
    $('#invoiceForm input, #invoiceForm textarea').on('input', function() {
        renderInvoicePreviewFromForm();
    });
}

function formatDate(inputDate) {
    if (!inputDate) return ''; // Return empty string for null/undefined
    
    // Try parsing as ISO date first (e.g., "2023-11-15")
    if (/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
        return inputDate;
    }
    
    // Common month misspellings mapping
    const monthCorrections = {
        'Nowember': 'November',
        'Janurary': 'January',
        'Feburary': 'February',
        'Febrary': 'February',
        'Febraury': 'February',
        'Febuary': 'February',
        'Marc': 'March',
        'Apri': 'April',
        'Jun': 'June',
        'Jul': 'July',
        'Auguest': 'August',
        'Septmber': 'September',
        'Septmeber': 'September',
        'Octber': 'October',
        'Octobor': 'October',
        'Decemeber': 'December',
        'Decemebr': 'December'
    };
    
    // Try to correct common misspellings
    let correctedDate = inputDate;
    for (const [wrong, correct] of Object.entries(monthCorrections)) {
        if (correctedDate.includes(wrong)) {
            correctedDate = correctedDate.replace(wrong, correct);
            break;
        }
    }
    
    // Try parsing with Date object
    try {
        const dateObj = new Date(correctedDate);
        
        // Check if date is valid
        if (!isNaN(dateObj.getTime())) {
            return dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
        }
    } catch (e) {
        console.warn("Date parsing error:", e);
    }
    
    // Try parsing common formats manually
    const formats = [
        // DD/MM/YYYY or MM/DD/YYYY
        /(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/,
        // Month DD, YYYY (e.g., November 15, 2023)
        /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/,
        // DD Month YYYY (e.g., 15 November 2023)
        /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/
    ];
    
    for (const format of formats) {
        const match = correctedDate.match(format);
        if (match) {
            try {
                let day, month, year;
                
                if (match[1].length > 2) {
                    // Month is first (e.g., November 15, 2023)
                    month = match[1];
                    day = match[2];
                    year = match[3];
                } else if (match[2].length > 2) {
                    // Month is second (e.g., 15 November 2023)
                    day = match[1];
                    month = match[2];
                    year = match[3];
                } else {
                    // Numeric format (e.g., 11/15/2023)
                    // This is ambiguous - could be MM/DD or DD/MM
                    // We'll assume DD/MM/YYYY for international format
                    day = match[1];
                    month = match[2];
                    year = match[3];
                }
                
                // Convert month name to number if needed
                if (isNaN(month)) {
                    const monthIndex = new Date(`${month} 1, 2000`).getMonth();
                    if (!isNaN(monthIndex)) {
                        month = monthIndex + 1;
                    } else {
                        continue; // Try next format
                    }
                }
                
                // Pad with zeros if needed
                month = month.toString().padStart(2, '0');
                day = day.toString().padStart(2, '0');
                
                // Create ISO date string
                return `${year}-${month}-${day}`;
            } catch (e) {
                console.warn("Date format parsing error:", e);
                continue;
            }
        }
    }
    
    // If all parsing attempts fail, return the original input (or empty string)
    console.warn(`Could not parse date: ${inputDate}`);
    return inputDate.trim() || ''; // Return original or empty if input was empty
}

function handleSaveInvoice() {
    showDatatableSpinner();
    const updatedInvoice = {
        invoice_data: {},
        items: []
    };
    const styling = {
        paperSize: $('#paperSizeSelect').val(),
        headerColor: $('#--inv-headerColor').val(),
        textColor: $('#--inv-textColor').val(),
        accentColor: $('#--inv-accentColor').val(),
        topMargin: $('#topMargin').val()
    };

    // Collect basic invoice data
    $('#invoiceForm input, #invoiceForm textarea').each(function() {
        const field = $(this).data('field');
        if (field) {
            updatedInvoice.invoice_data[field] = $(this).val();
        }
    });

    const rawDate = $('#invoiceDate').val();
    try {
        updatedInvoice.invoice_data.invoice_date = formatDate(rawDate);
    } catch (e) {
        console.error("Date formatting failed:", e);
        updatedInvoice.invoice_data.invoice_date = rawDate; // Fallback to raw value
    }
    
    updatedInvoice.invoice_data.subtotal = $('#subtotal').val();
    updatedInvoice.invoice_data.tax_amount = $('#taxAmount').val();
    updatedInvoice.styling = styling;

    // Collect items data
    $('#itemsTableBody tr').each(function() {
        const row = $(this);
        const item = {};
        row.find('input').each(function() {
            const field = $(this).data('field');
            if (field) {
                item[field] = $(this).val();
            }
        });
        if (Object.keys(item).length > 0) {
            updatedInvoice.items.push(item);
        }
        updatedInvoice.items.forEach(item => {
            item.quantity = parseFloat(item.quantity).toFixed(2);
            item.price_per_unit = parseFloat(item.price_per_unit).toFixed(2);
            item.gst = parseFloat(item.gst).toFixed(2);
            item.amount = parseFloat(item.amount).toFixed(2);
            item.original_item_id = item.item_id || null;
        });
    });

    // Hide previous error
    $('#errorField').addClass('d-none').text('');

    console.log("Data being sent to backend:", updatedInvoice);

    $.ajax({
        url: '/api/v1/invoices/save-correction',
        type: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        contentType: 'application/json',
        data: JSON.stringify(updatedInvoice),
        success: function(response) {
            showToast("Invoice corrections saved successfully.");
            $('#saveBtn').html('<i class="fas fa-check-circle"></i> Saved').prop('disabled', true);
            $('#errorField').addClass('d-none').text('');
        },
        error: function(xhr) {
            let errorMsg = "Failed to save invoice corrections.";
            if (xhr.responseJSON && xhr.responseJSON.detail) {
                errorMsg = xhr.responseJSON.detail;
            } else if (xhr.responseText) {
                try {
                    const resp = JSON.parse(xhr.responseText);
                    if (resp.detail) errorMsg = resp.detail;
                } catch (e) {}
            }
            $('#errorField').removeClass('d-none').text(errorMsg);
            setTimeout(() => {
                $('#errorField').addClass('d-none').text('');
            }, 3000);
            showToast(errorMsg, false);
        },
        complete: hideDatatableSpinner
    });
}


function updateLastExtractedData(updatedData) {
    if (!lastExtractedData) return;
    
    // Update invoice data
    if (updatedData.invoice_data) {
        lastExtractedData.invoice_data = {...lastExtractedData.invoice_data, ...updatedData.invoice_data};
    }
    
    // Update items
    if (updatedData.items) {
        lastExtractedData.items = updatedData.items;
    }
}

// UI Functions
function showToast(message, isSuccess = true, duration = 2000) {
    const toastEl = $('#toast');
    toastEl.removeClass('text-bg-success text-bg-danger')
           .addClass(isSuccess ? 'text-bg-success' : 'text-bg-danger')
           .find('.toast-body').text(message);

    const toast = new bootstrap.Toast(toastEl[0], {
        delay: duration,  // duration in ms (e.g. 3000 = 3 seconds)
        autohide: true
    });
    toast.show();
}


// Utility Functions
function resizePreviewArea() {
    const wrapper = document.getElementById('previewWrapper');
    if (!wrapper) return;
    
    if (pdfDoc && document.getElementById('pdfViewer').style.display !== 'none') {
        renderPdfPage(currentPage, pdfScale);
    }
}

// Preview Customization Functions
function setupPreviewControls() {
    // // Paper size change
    // $('#paperSizeSelect').change(function() {
    //         const paperSize = $(this).val().toLowerCase();
    //         const paper = $('#invoice-paper');
            
    //         // Remove all paper size classes first
    //         paper.removeClass('a4 letter a5');
            
    //         // Add the selected class
    //         paper.addClass(paperSize);
            
    //         // Update dimensions based on selected size
    //         switch(paperSize) {
    //             case 'a4':
    //                 paper.css({
    //                     'width': '8.27in',
    //                     'min-height': '11.69in'
    //                 });
    //                 break;
    //             case 'letter':
    //                 paper.css({
    //                     'width': '8.5in',
    //                     'min-height': '11in'
    //                 });
    //                 break;
    //             case 'a5':
    //                 paper.css({
    //                     'width': '5.83in',
    //                     'min-height': '8.27in'
    //                 });
    //                 break;
    //         }
            
    //         // Re-render with new dimensions
    //         renderInvoicePreviewFromForm();
            
    //         // Adjust preview scaling
    //         setTimeout(() => {
    //             const scale = calculateOptimalScale(paper[0]);
    //             paper.css('transform', `scale(${scale})`);
    //         }, 100);
    //     });
    
    // Color changes
    $('#--inv-headerColor, #--inv-textColor, #--inv-accentColor').change(function() {
        updatePreviewColors();
    });
    
    // Margin changes
    $('#topMargin').change(function() {
        $('#invoice-paper').css('padding-top', $(this).val() + 'in');
    });
}

// Content Overflow Prevention
function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function adjustContentForPaperSize() {
    const paperSize = $('#paperSizeSelect').val().toLowerCase();
    let maxDescLength = 100;
    
    switch(paperSize) {
        case 'a5':
            maxDescLength = 60;
            break;
        case 'letter':
            maxDescLength = 100;
            break;
        case 'a4':
        default:
            maxDescLength = 120;
    }
    
    $('.item-desc').each(function() {
        const text = $(this).text();
        $(this).text(truncateText(text, maxDescLength));
    });
    
    // Adjust address line breaks
    $('.address-text').each(function() {
        const text = $(this).text();
        const lines = text.split('\n');
        let output = '';
        
        lines.forEach(line => {
            if (line.length > maxDescLength) {
                output += truncateText(line, maxDescLength) + '\n';
            } else {
                output += line + '\n';
            }
        });
        
        $(this).text(output.trim());
    });
}

function updatePreviewColors() {
    document.documentElement.style.setProperty('--inv-header-color', $('#--inv-headerColor').val());
    document.documentElement.style.setProperty('--inv-text-color', $('#--inv-textColor').val());
    document.documentElement.style.setProperty('--inv-accent-color', $('#--inv-accentColor').val());
    document.documentElement.style.setProperty('--inv-top-margin', $('#topMargin').val() + 'in');
}

// PDF download function with native save dialog in PyWebView
function downloadAsPDFWithDialog() {
    showToast("Generating PDF...");
    
    const templateKey = currentTemplate || 'default';
    const template = invoiceTemplates[templateKey] || invoiceTemplates.default;
    const templateData = getCurrentFormData();
    const fullHtml = template.html(templateData);

    const hiddenContainer = document.createElement('div');
    hiddenContainer.style.position = 'fixed';
    hiddenContainer.style.left = '-9999px';
    hiddenContainer.innerHTML = fullHtml;
    document.body.appendChild(hiddenContainer);

    const paperEl = hiddenContainer.querySelector('.invoice-paper-temp');
    if (paperEl) {
        paperEl.style.width = '210mm';
        paperEl.style.minHeight = '297mm';
        paperEl.style.background = '#fff';
    }

    html2canvas(hiddenContainer, { scale: 3, useCORS: true, backgroundColor: '#fff' })
        .then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new window.jspdf.jsPDF();
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            const suggestedPdfName = previewFilename.toLowerCase().endsWith('.pdf') ? previewFilename : previewFilename.replace(/\.[^/.]+$/, '') + '.pdf';

            // Call Python save dialog via PyWebView js_api
            window.pywebview.api.save_file_dialog(pdf.output('datauristring'), suggestedPdfName)
                .then(resp => {
                    if (resp.status === "success") {
                        showToast("PDF saved to " + resp.path);
                    } else if (resp.status === "cancelled") {
                        showToast("Save cancelled", false);
                    } else {
                        showToast("Error: " + resp.message, false);
                    }
                });

            document.body.removeChild(hiddenContainer);
            showToast("PDF generated successfully");
        })
        .catch(err => {
            console.error("PDF generation error:", err);
            showToast("Failed to generate PDF", false);
        });
}



function getCurrentFormData() {
    const data = {
        fromAddress: $('#fromAddress').val() || '',
        toAddress: $('#toAddress').val() || '',
        invoiceNumber: $('#invoiceNumber').val() || 'INV-001',
        invoiceDate: $('#invoiceDate').val() || new Date().toLocaleDateString(),
        supplierGst: $('#supplierGst').val() || '',
        customerGst: $('#customerGst').val() || '',
        taxDetails: $('#taxDetails').val() || '',
        subtotal: 0,
        taxAmount: 0,
        items: []
    };
    
    // Calculate totals and get items
    $('#itemsTableBody tr').each(function() {
        const row = $(this);
        const qty = parseFloat(row.find('.qty').val()) || 0;
        const rate = parseFloat(row.find('.rate').val()) || 0;
        const taxRate = parseFloat(row.find('.tax').val()) || 0;
        const amount = parseFloat(row.find('.amount').val()) || 0;
        
        data.items.push({
            description: row.find('.item-desc').val() || 'Item',
            quantity: qty,
            price_per_unit: rate,
            gst: taxRate,
            amount: amount
        });
        
        data.subtotal += amount / (1 + (taxRate / 100));
        data.taxAmount += amount - (amount / (1 + (taxRate / 100)));
    });
    
    return data;
}


// Image download function with native save dialog in PyWebView
function downloadAsImageWithDialog() {
    showToast("Generating image...");

    const paperEl = document.querySelector('#invoice-preview-container .invoice-paper-temp');
    if (!paperEl) {
        showToast("No invoice to export", false);
        return;
    }

    const clone = paperEl.cloneNode(true);
    clone.style.transform = 'none';
    clone.style.width = '210mm';
    clone.style.minHeight = '297mm';
    clone.style.background = '#fff';

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.appendChild(clone);
    document.body.appendChild(tempContainer);

    html2canvas(clone, { scale: 3, backgroundColor: '#fff', useCORS: true })
        .then(canvas => {
            const suggestedImageName = previewFilename.replace(/\.[^/.]+$/, '') + '.png';

            const imgBase64 = canvas.toDataURL('image/png');

            window.pywebview.api.save_file_dialog(imgBase64, suggestedImageName)
                .then(resp => {
                    if (resp.status === "success") {
                        showToast("Image saved to " + resp.path);
                    } else if (resp.status === "cancelled") {
                        showToast("Save cancelled", false);
                    } else {
                        showToast("Error: " + resp.message, false);
                    }
                });

            document.body.removeChild(tempContainer);
            showToast("Image generated successfully");
        })
        .catch(err => {
            console.error("Image generation error:", err);
            document.body.removeChild(tempContainer);
            showToast("Failed to generate image", false);
        });
}


(function() {
  const container = document.getElementById('invoice-preview-container');
  const wrapper = document.getElementById('invoice-scale-wrapper');

  if (!container || !wrapper) return;

  let scale = 1;                  // Current zoom scale
  let panX = 0;                  // Current horizontal pan offset
  let panY = 0;                  // Current vertical pan offset

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  // Apply the transform with scale and pan offsets
  function updateTransform() {
    wrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }

  // Zoom with mouse wheel
  container.addEventListener('wheel', (event) => {
    event.preventDefault();

    // Zoom delta, with sensitivity adjustment
    const zoomSensitivity = 0.001;
    const delta = -event.deltaY * zoomSensitivity;
    let newScale = scale + delta;

    // Clamp scale to reasonable zoom levels
    newScale = Math.min(Math.max(newScale, 0.5), 3);

    // Get mouse position relative to the wrapper
    const rect = wrapper.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    // Calculate pan adjustment to zoom at pointer
    panX -= (offsetX / scale) * (newScale - scale);
    panY -= (offsetY / scale) * (newScale - scale);

    scale = newScale;

    updateTransform();
  });

  // Start panning on mouse down
  container.addEventListener('mousedown', (event) => {
    isDragging = true;
    dragStartX = event.clientX - panX;
    dragStartY = event.clientY - panY;
    wrapper.style.transition = 'none'; // disable transition while dragging
    event.preventDefault();
  });

  // Panning mouse move
  window.addEventListener('mousemove', (event) => {
    if (!isDragging) return;
    panX = event.clientX - dragStartX;
    panY = event.clientY - dragStartY;
    updateTransform();
  });

  // End panning on mouse up or leaving window
  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    wrapper.style.transition = 'transform 0.1s ease-out'; // re-enable transition
  });
  window.addEventListener('mouseleave', () => {
    if (!isDragging) return;
    isDragging = false;
    wrapper.style.transition = 'transform 0.1s ease-out';
  });

})();


function showGlobalSpinner() {
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
                justify-content: center;
                align-items: center;
                backdrop-filter: blur(2px);
            ">
                <div class="spinner-container" style="position: relative;">
                    <!-- Ripple Effect (Optional) -->
                    <div class="icon-ripple" style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 80px;
                        height: 80px;
                        border-radius: 50%;
                        background: rgba(10, 142, 78, 0.3);
                        animation: ripple 1.5s infinite ease-out;
                    "></div>
                    
                    <!-- Your Custom PNG Icon -->
                    <img src="static/logos/invoice1.png" alt="Loading" style="
                        width: 48px;
                        height: 48px;
                        color:  #0a8e4e;
                        animation: spin 1.5s infinite linear, pulse 1.5s infinite ease-in-out;
                    ">
                </div>
            </div>
        `);

        // Add CSS animations
        $('head').append(`
            <style>
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
            </style>
        `);
    } else {
        $('#globalSpinnerOverlay').show();
    }
}
function hideGlobalSpinner() {
    $('#globalSpinnerOverlay').hide();
}

function showDatatableSpinner() {
    $('#datatableSpinnerOverlay').show();
}

function hideDatatableSpinner() {
    $('#datatableSpinnerOverlay').hide();
}

