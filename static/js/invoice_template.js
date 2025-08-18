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

            <!-- Minimalist Items Table -->
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
            }
            
            .invoice-paper-temp {
                width: 210mm !important;
                min-height: 297mm !important;
                margin: 0 auto;
                padding: var(--inv-topMargin, 15mm) var(--inv-sideMargin, 20mm);
                background-color: white;
                color: var(--inv-textColor, #334155);
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                position: relative;
                overflow: hidden;
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
                justify-content: space-between;
                margin-bottom: 40px;
                padding-top: 20px;
            }

            .company-info {
                display: flex;
                align-items: center;
                gap: 20px;
            }

            .company-logo-placeholder {
                width: 60px;
                height: 60px;
                border-radius: 12px;
                background-color: var(--inv-accentColor, #3B82F6);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-weight: bold;
            }

            .company-name {
                font-size: 22px;
                font-weight: 700;
                color: var(--inv-textColor, #1E293B);
                margin-bottom: 6px;
            }

            .company-address {
                font-size: 14px;
                color: var(--inv-textColor, #64748B);
                line-height: 1.5;
                margin-bottom: 6px;
            }

            .company-contact {
                font-size: 13px;
                color: var(--inv-textColor, #64748B);
            }

            .invoice-meta {
                text-align: right;
            }

            .invoice-title {
                font-size: 28px;
                font-weight: 800;
                color: var(--inv-textColor, #1E293B);
                margin-bottom: 15px;
                letter-spacing: -0.5px;
            }

            .invoice-meta-grid {
                display: grid;
                grid-template-columns: auto auto;
                gap: 8px 15px;
                text-align: right;
            }

            .meta-label {
                font-size: 13px;
                color: var(--inv-textColor, #64748B);
                font-weight: 500;
            }

            .meta-value {
                font-size: 14px;
                font-weight: 600;
                color: var(--inv-textColor, #1E293B);
            }

            .invoice-number, .due-amount {
                color: var(--inv-accentColor, #3B82F6);
                font-weight: 700;
            }

            /* Client Section */
            .client-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 40px;
                padding: 25px;
                background-color: #F8FAFC;
                border-radius: 12px;
            }

            .section-title {
                font-size: 14px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--inv-accentColor, #3B82F6);
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .client-name {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 8px;
                color: var(--inv-textColor, #1E293B);
            }

            .client-address, .payment-method {
                font-size: 14px;
                color: var(--inv-textColor, #64748B);
                line-height: 1.5;
                margin-bottom: 8px;
            }

            .client-contact, .payment-details {
                font-size: 13px;
                color: var(--inv-textColor, #64748B);
            }

            .payment-details div {
                margin-bottom: 4px;
            }

            /* Items Table */
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 30px 0;
                font-size: 14px;
            }

            .items-table th {
                background-color: var(--inv-headerColor, #1E293B);
                color: white;
                padding: 12px 16px;
                text-align: left;
                font-weight: 600;
                text-transform: uppercase;
                font-size: 12px;
                letter-spacing: 0.5px;
            }

            .items-table td {
                padding: 14px 16px;
                border-bottom: 1px solid #F1F5F9;
                color: var(--inv-textColor, #334155);
            }

            .items-table tr:last-child td {
                border-bottom: none;
            }

            /* Summary Section */
            .summary-section {
                display: flex;
                margin-top: 30px;
            }

            .notes-section {
                width: 60%;
                padding-right: 30px;
            }

            .notes-content {
                font-size: 14px;
                color: var(--inv-textColor, #64748B);
                line-height: 1.6;
            }

            .amounts-section {
                width: 40%;
                background-color: #F8FAFC;
                padding: 20px;
                border-radius: 12px;
            }

            .amount-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 12px;
            }

            .amount-label {
                font-size: 14px;
                color: var(--inv-textColor, #64748B);
            }

            .amount-value {
                font-size: 14px;
                font-weight: 600;
                color: var(--inv-textColor, #1E293B);
            }

            .total-row {
                padding-top: 12px;
                margin-top: 12px;
                border-top: 1px solid #E2E8F0;
            }

            .total-row .amount-label {
                font-weight: 700;
            }

            .total-row .amount-value {
                font-size: 16px;
                font-weight: 700;
                color: var(--inv-accentColor, #3B82F6);
            }

            /* Footer Section */
            .footer-section {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                margin-top: 60px;
                padding-top: 30px;
                border-top: 1px solid #F1F5F9;
            }

            .thank-you-message {
                max-width: 60%;
            }

            .thank-you {
                font-size: 15px;
                font-weight: 600;
                color: var(--inv-textColor, #1E293B);
                margin-bottom: 6px;
            }

            .company-slogan {
                font-size: 13px;
                color: var(--inv-textColor, #64748B);
                font-style: italic;
            }

            .signature-section {
                text-align: center;
            }

            .signature-line {
                display: inline-block;
                width: 180px;
                border-bottom: 1px solid #CBD5E1;
                margin-bottom: 6px;
            }

            .signature-label {
                font-size: 13px;
                color: var(--inv-textColor, #64748B);
                text-transform: uppercase;
                letter-spacing: 0.5px;
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
            <!-- Premium Header with Watermark Effect -->
            <div class="header-watermark">${data.fromAddress.split('\n')[0] || 'Your Company'}</div>
            
            <div class="header-section">
                <div class="company-info">
                    <div class="company-branding">
                        <div class="company-logo-placeholder"></div>
                        <div class="company-details">
                            <div class="company-name">${data.fromAddress.split('\n')[0] || 'Your Company'}</div>
                            <div class="company-tagline">Professional Services</div>
                        </div>
                    </div>
                    <div class="company-address">${data.fromAddress.replace(/\n/g, '<br>') || 'Corporate Headquarters'}</div>
                    <div class="company-contact">
                        <div class="company-gst">GSTIN: ${data.supplierGst || 'GSTINXXXXXX'}</div>
                        <div class="company-phone">+91 XXXXX XXXXX</div>
                    </div>
                </div>
                
                <div class="invoice-meta">
                    <div class="invoice-title-section">
                        <div class="invoice-title">INVOICE</div>
                        <div class="invoice-status">ORIGINAL</div>
                    </div>
                    <div class="invoice-meta-grid">
                        <div class="meta-row">
                            <span class="meta-label">Invoice #</span>
                            <span class="meta-value invoice-number">${data.invoiceNumber || 'INV-001'}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Date</span>
                            <span class="meta-value">${data.invoiceDate || new Date().toLocaleDateString()}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Due Date</span>
                            <span class="meta-value">${data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Terms</span>
                            <span class="meta-value">Net 30</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Client Section with Professional Layout -->
            <div class="client-section">
                <div class="client-info">
                    <div class="section-title">BILL TO</div>
                    <div class="client-name">${data.toAddress.split('\n')[0] || 'Customer Name'}</div>
                    <div class="client-address">${data.toAddress.replace(/\n/g, '<br>') || 'Customer Address'}</div>
                    <div class="client-contact">
                        <div class="client-gst">GSTIN: ${data.customerGst || 'GSTINXXXXXX'}</div>
                    </div>
                </div>
                
                <div class="project-info">
                    <div class="section-title">PROJECT</div>
                    <div class="project-name">${data.projectName || 'General Services'}</div>
                    <div class="project-id">PO Number: ${data.poNumber || 'Not Provided'}</div>
                </div>
            </div>

            <!-- Professional Items Table -->
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

            <!-- Summary Section -->
            <div class="summary-section">
                <div class="notes-section">
                    <div class="section-title">TERMS & NOTES</div>
                    <div class="notes-content">${data.taxDetails || '1. Payment due within 30 days of invoice date<br>2. Late payments subject to 1.5% monthly interest<br>3. Make checks payable to company name'}</div>
                </div>
                
                <div class="amounts-section">
                    <div class="amount-row subtotal-row">
                        <span class="amount-label">Subtotal:</span>
                        <span class="amount-value">₹${data.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="amount-row tax-row">
                        <span class="amount-label">Tax (${data.taxRate || 18}%):</span>
                        <span class="amount-value">₹${data.taxAmount.toFixed(2)}</span>
                    </div>
                    <div class="amount-row discount-row">
                        <span class="amount-label">Discount:</span>
                        <span class="amount-value">-₹0.00</span>
                    </div>
                    <div class="amount-row total-row">
                        <span class="amount-label">TOTAL DUE:</span>
                        <span class="amount-value">₹${(data.subtotal + data.taxAmount).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <!-- Corporate Footer -->
            <div class="footer-section">
                <div class="bank-info">
                    <div class="section-title">BANK INFORMATION</div>
                    <div class="bank-details">
                        <div>Bank Name: Corporate Banking</div>
                        <div>Account No: XXXX-XXXX-XXXX</div>
                        <div>IFSC Code: XXXX0123456</div>
                    </div>
                </div>
                <div class="signature-section">
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
            }
            
            .invoice-paper-temp {
                width: 210mm !important;
                min-height: 297mm !important;
                margin: 0 auto;
                padding: var(--inv-topMargin, 20mm) var(--inv-sideMargin, 25mm);
                background-color: white;
                color: var(--inv-textColor, #333333);
                font-family: 'Calibri', 'Arial', sans-serif;
                position: relative;
                overflow: hidden;
                box-shadow: 0 0 20px rgba(0,0,0,0.05);
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

            /* Header Section */
            .header-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid #e1e1e1;
                position: relative;
                z-index: 1;
            }

            .company-branding {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 15px;
            }

            .company-logo-placeholder {
                width: 50px;
                height: 50px;
                background-color: var(--inv-accentColor, #2c5aa0);
                border-radius: 4px;
            }

            .company-name {
                font-size: 24px;
                font-weight: 600;
                color: var(--inv-textColor, #222);
                margin-bottom: 2px;
            }

            .company-tagline {
                font-size: 14px;
                color: var(--inv-textColor, #666);
                font-weight: 300;
            }

            .company-address {
                font-size: 13px;
                color: var(--inv-textColor, #666);
                line-height: 1.5;
                margin-bottom: 10px;
            }

            .company-contact {
                font-size: 13px;
                color: var(--inv-textColor, #666);
            }

            .invoice-title-section {
                text-align: right;
                margin-bottom: 15px;
            }

            .invoice-title {
                font-size: 32px;
                font-weight: 300;
                color: var(--inv-textColor, #222);
                margin-bottom: 5px;
                letter-spacing: 1px;
            }

            .invoice-status {
                font-size: 12px;
                color: white;
                background-color: var(--inv-accentColor, #2c5aa0);
                padding: 2px 10px;
                border-radius: 10px;
                display: inline-block;
            }

            .invoice-meta-grid {
                display: grid;
                grid-template-columns: auto auto;
                gap: 8px 15px;
                text-align: right;
            }

            .meta-row {
                display: flex;
                justify-content: space-between;
                min-width: 200px;
            }

            .meta-label {
                font-size: 13px;
                color: var(--inv-textColor, #666);
                font-weight: 300;
            }

            .meta-value {
                font-size: 13px;
                font-weight: 600;
                color: var(--inv-textColor, #222);
            }

            .invoice-number {
                color: var(--inv-accentColor, #2c5aa0);
            }

            /* Client Section */
            .client-section {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 30px;
                padding: 20px;
                background-color: #f8fafc;
                border-radius: 4px;
            }

            .section-title {
                font-size: 14px;
                font-weight: 600;
                color: var(--inv-accentColor, #2c5aa0);
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .client-name, .project-name {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 5px;
                color: var(--inv-textColor, #222);
            }

            .client-address {
                font-size: 13px;
                color: var(--inv-textColor, #666);
                line-height: 1.5;
                margin-bottom: 5px;
            }

            .client-contact, .project-id {
                font-size: 13px;
                color: var(--inv-textColor, #666);
            }

            /* Items Table */
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 25px 0;
                font-size: 13px;
            }

            .items-table th {
                background-color: var(--inv-headerColor, #2c5aa0);
                color: white;
                padding: 12px 15px;
                text-align: left;
                font-weight: 600;
                text-transform: uppercase;
                font-size: 12px;
                letter-spacing: 0.5px;
            }

            .items-table td {
                padding: 12px 15px;
                border-bottom: 1px solid #f1f1f1;
                color: var(--inv-textColor, #444);
            }

            .items-table tr:last-child td {
                border-bottom: 2px solid #e1e1e1;
            }

            /* Summary Section */
            .summary-section {
                display: flex;
                margin-top: 30px;
            }

            .notes-section {
                width: 60%;
                padding-right: 30px;
            }

            .notes-content {
                font-size: 13px;
                color: var(--inv-textColor, #666);
                line-height: 1.6;
                padding: 15px;
                background-color: #f8fafc;
                border-radius: 4px;
            }

            .amounts-section {
                width: 40%;
                padding-left: 20px;
            }

            .amount-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                font-size: 13px;
            }

            .amount-label {
                color: var(--inv-textColor, #666);
            }

            .amount-value {
                font-weight: 600;
                color: var(--inv-textColor, #222);
            }

            .total-row {
                padding-top: 10px;
                margin-top: 10px;
                border-top: 1px solid #e1e1e1;
                font-weight: 600;
            }

            .total-row .amount-value {
                font-size: 15px;
                color: var(--inv-accentColor, #2c5aa0);
                font-weight: 700;
            }

            /* Footer Section */
            .footer-section {
                display: flex;
                justify-content: space-between;
                margin-top: 40px;
                padding-top: 30px;
                border-top: 1px solid #e1e1e1;
            }

            .bank-info {
                width: 60%;
            }

            .bank-details {
                font-size: 13px;
                color: var(--inv-textColor, #666);
                line-height: 1.6;
                margin-top: 10px;
            }

            .signature-section {
                width: 30%;
                text-align: center;
            }

            .signature-area {
                margin-bottom: 20px;
            }

            .signature-line {
                display: inline-block;
                width: 200px;
                border-bottom: 1px solid #ccc;
                margin-bottom: 5px;
            }

            .signature-label {
                font-size: 13px;
                color: var(--inv-textColor, #666);
                text-transform: uppercase;
            }

            .company-stamp {
                font-size: 12px;
                color: var(--inv-textColor, #666);
                border: 1px dashed #ccc;
                padding: 15px 10px;
                display: inline-block;
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
            }
        `
    }
};


let selectedTemplate = null;

// Helper function to generate items HTML
window.generateItemsHtml = function(items) {
    let html = '';
    (items || []).forEach((item, index) => {
        html += `
            <tr class="item-row">
                <td class="item-no">${index + 1}</td>
                <td class="item-desc">${item.description || 'Item'}</td>
                <td class="item-qty">${item.quantity || '1'}</td>
                <td class="item-rate">${(parseFloat(item.price_per_unit) || 0).toFixed(2)}</td>
                <td class="item-tax">${item.gst || '0'}%</td>
                <td class="item-amount">${(parseFloat(item.amount) || 0).toFixed(2)}</td>
            </tr>
        `;
    });
    return html || '<tr><td colspan="6" class="text-center">No items found</td></tr>';
};

function generateItemsHtml(items) {
    return items.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.description || ''}</td>
            <td>${item.quantity || 0}</td>
            <td>${item.rate || 0}</td>
            <td>${item.taxRate || 0}%</td>
            <td>${(item.quantity * item.rate * (1 + (item.taxRate || 0)/100)).toFixed(2)}</td>
        </tr>
    `).join('');
}

// Function to render template preview with custom data
function renderTemplatePreview(templateKey, data = null) {
    const template = invoiceTemplates[templateKey];
    if (!template) return document.createElement('div');
    
    // Use provided data or get default preview data
    const templateData = data || getPreviewData();
    
    // Create a temporary div to hold the template
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = template.html(templateData);
    
    // Apply the template-specific styles
    const style = document.createElement('style');
    style.textContent = template.styles;
    tempDiv.appendChild(style);
    
    return tempDiv;
}

// Initialize template selection
document.addEventListener('DOMContentLoaded', function() {
    // Load template selection when choose-template tab is shown
    document.querySelector('.sidebar-menu li[onclick*="choose-template"]')?.addEventListener('click', function() {
        loadTemplateSelection();
    });
});

function loadTemplateSelection() {
    const templateSection = document.getElementById('choose-template');
    if (!templateSection) return;
    
    templateSection.innerHTML = `
        <div class="card">
            <div class="content-header">
                <h2>Choose Template</h2>
                <div class="template-controls">
                    <select id="template-filter" class="filter-select">
                        <option value="all">All Categories</option>
                        <option value="Business">Business</option>
                        <option value="Minimal">Minimal</option>
                    </select>
                    <button class="upload-btn" id="use-template-btn" style="display:none;">
                        <i class="fas fa-check"></i> Use Selected Template
                    </button>
                </div>
            </div>
            <div class="template-grid-container">
                <div class="template-grid" id="templateGrid"></div>
            </div>
        </div>
    `;

    // Load templates into the grid
    const templateGrid = document.getElementById('templateGrid');
    Object.keys(invoiceTemplates).forEach(templateKey => {
        const template = invoiceTemplates[templateKey];
        const previewData = getPreviewData();
        
        const templateCard = document.createElement('div');
        templateCard.className = 'template-card';
        templateCard.dataset.template = templateKey;
        templateCard.dataset.category = template.category;
        templateCard.innerHTML = `
            <div class="template-preview-container">
                <div class="template-preview">
                    ${template.html(previewData)}
                </div>
            </div>
            <div class="template-info">
                <span class="template-category">${template.category}</span>
                <h3 class="template-name">${template.name}</h3>
                <p class="template-description">${template.description}</p>
                <button class="select-template-btn" data-template="${templateKey}">
                    Select Template
                </button>
            </div>
        `;
        templateGrid.appendChild(templateCard);
    });
    
    // Set up event listeners
    setupTemplateSelectionEvents();
}
// Set up all event listeners for template selection
function setupTemplateSelectionEvents() {
    // Filter functionality
    document.getElementById('template-filter')?.addEventListener('change', function() {
        const filterValue = this.value;
        document.querySelectorAll('.template-card').forEach(card => {
            card.style.display = (filterValue === 'all' || card.dataset.category === filterValue) ? 'flex' : 'none';
        });
    });
    
    // Template selection
    document.querySelectorAll('.select-template-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const templateKey = this.dataset.template;
            selectTemplate(templateKey);
        });
    });
    
    // Use template button
    document.getElementById('use-template-btn')?.addEventListener('click', function() {
        if (selectedTemplate) {
            applyTemplate(selectedTemplate);
        }
    });
}

// Handle template selection
function selectTemplate(templateKey) {
    selectedTemplate = templateKey;
    
    // Update UI selection
    document.querySelectorAll('.template-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.template === templateKey);
    });
    
    // Show "Use Template" button
    const useBtn = document.getElementById('use-template-btn');
    if (useBtn) {
        useBtn.style.display = 'block';
    }
    
    // Show the preview
    showTemplatePreview(templateKey);
}

// Show template preview in modal
function showTemplatePreview(templateKey) {
    const template = invoiceTemplates[templateKey];
    if (!template) return;
    
    const previewContainer = document.getElementById('templatePreviewContainer');
    if (!previewContainer) return;
    
    // Clear previous content
    previewContainer.innerHTML = '';
    
    // Create preview with current form data
    const previewData = getCurrentFormData();
    const preview = renderTemplatePreview(templateKey, previewData);
    
    // Create wrapper for scaling
    const wrapper = document.createElement('div');
    wrapper.className = 'template-preview-wrapper';
    
    // Create scaled container
    const scaledContainer = document.createElement('div');
    scaledContainer.className = 'template-preview-scaled';
    scaledContainer.appendChild(preview);
    wrapper.appendChild(scaledContainer);
    previewContainer.appendChild(wrapper);
    // Remove any small grid-preview scaling
    scaledContainer.querySelectorAll('.template-preview').forEach(el => {
        el.style.transform = 'none';
    });

    // Function to calculate and apply optimal scale
    const calculateAndApplyScale = () => {
        const container = previewContainer;
        const scaledContainer = container.querySelector('.template-preview-scaled');
        const invoicePaper = scaledContainer.querySelector('.invoice-paper-temp');

        if (!container || !invoicePaper) return;

        // Natural size from CSS
        const paperWidth = invoicePaper.offsetWidth;
        const paperHeight = invoicePaper.offsetHeight;

        // Available space
        const availableWidth = container.clientWidth - 40;
        const availableHeight = container.clientHeight - 40;

        // Calculate scale so the whole invoice fits, maintaining aspect ratio
        const widthScale = availableWidth / paperWidth;
        const heightScale = availableHeight / paperHeight;
        const scale = Math.min(widthScale, heightScale);

        scaledContainer.style.transform = `scale(${scale})`;
        scaledContainer.style.position = 'absolute';
        scaledContainer.style.left = '50%';
        scaledContainer.style.top = '50%';
        scaledContainer.style.transform = `translate(-50%, -50%) scale(${scale})`;

        // Remove scrolls from inner containers
        container.style.overflow = 'visible';
        scaledContainer.style.overflow = 'visible';
    };

    
    // Calculate scale when the image loads and on window resize
    const onLoadAndResize = () => setTimeout(calculateAndApplyScale, 50);
    window.addEventListener('resize', onLoadAndResize);
    onLoadAndResize();
    
    // Set up event listeners
    window.addEventListener('resize', onLoadAndResize);
    
    // Initial calculation
    onLoadAndResize();
    
    // Show the modal
    const modal = document.getElementById('templatePreviewModal');
    modal.style.display = 'block';
    
    // Clean up event listeners when modal closes
    const cleanUp = () => {
        window.removeEventListener('resize', onLoadAndResize);
    };
    
    // Close handlers
    const closeModal = () => {
        cleanUp();
        modal.style.display = 'none';
    };
    
    // Update existing close handlers to include cleanup
    document.querySelector('.preview-modal-close').onclick = closeModal;
    document.getElementById('closePreviewBtn').onclick = closeModal;
}

// Helper function to get preview data
function getPreviewData() {
    return {
        fromAddress: 'Your Company\n123 Business Rd\nCity, State 10001',
        toAddress: 'Customer Name\n456 Client Ave\nTown, State 20002',
        invoiceNumber: 'INV-2023-001',
        invoiceDate: new Date().toLocaleDateString(),
        supplierGst: '22AAAAA0000A1Z5',
        customerGst: '33BBBBB0000B2Z6',
        taxDetails: 'Payment due within 15 days',
        subtotal: 1250.00,
        taxAmount: 225.00,
        items: [
            { description: 'Web Design', quantity: 10, price_per_unit: 100, gst: 18, amount: 1180 },
            { description: 'Domain', quantity: 1, price_per_unit: 70, gst: 18, amount: 82.60 }
        ]
    };
}

// Apply the selected template
function applyTemplate(templateKey) {
    const template = invoiceTemplates[templateKey];
    if (!template) return;

    // Save to localStorage
    localStorage.setItem('selectedInvoiceTemplate', templateKey);
    
    Swal.fire({
        title: 'Template Selected!',
        text: `"${template.name}" template has been applied.`,
        icon: 'success'
    });
    
    // Update the editor view
    updateEditorWithTemplate(templateKey);
}

function generateAndShowInvoice(templateKey) {
    selectTemplate(templateKey);
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

function updateEditorWithTemplate(templateKey) {
    // This function would update the editor UI to reflect the selected template
    // For example, you might want to show a preview or apply template-specific styles
    
    const template = invoiceTemplates[templateKey];
    if (!template) return;

    // Update the preview section
    const previewContainer = document.getElementById('invoice-preview-container');
    if (previewContainer) {
        previewContainer.innerHTML = '';
        const preview = renderTemplatePreview(templateKey);
        previewContainer.appendChild(preview);
    }

    // You might also want to update the form to match the template style
    console.log(`Template "${template.name}" applied to editor`);
}


// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initPreviewModal();
    
    // Handle template selection when clicking the menu item
    document.querySelector('.sidebar-menu li[onclick*="choose-template"]')?.addEventListener('click', function() {
        loadTemplateSelection();
    });
});


//CSS for the preview modal
const previewModalCSS = `
.preview-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.7);
    z-index: 1000;
    overflow: hidden;
}

.preview-modal-content {
    background: white;
    margin: 20px auto;
    padding: 20px;
    width: 90%;
    max-width: 900px;
    height: calc(100vh - 100px);
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.5);
    position: relative;
    display: flex;
    flex-direction: column;
}

.preview-modal-close {
    position: absolute;
    top: 15px;
    right: 15px;
    font-size: 24px;
    cursor: pointer;
    color: #555;
    z-index: 2;
}

.preview-modal-actions {
    text-align: center;
    margin-top: 15px;
    flex-shrink: 0;
}

.preview-modal-actions button {
    padding: 8px 16px;
    margin: 0 10px;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.preview-container {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #f9f9f9;
    position: relative;
}

.template-preview-wrapper {
    max-width: 100%;
    max-height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.preview-container,
.template-preview-wrapper {
    overflow: visible;
}

.template-preview-scaled {
    transform-origin: center center;
    box-shadow: 0 0 8px rgba(0,0,0,0.1);
    background: white;
}
`;

// Add this HTML structure for the modal
const previewModalHTML = `
<div class="preview-modal" id="templatePreviewModal">
    <div class="preview-modal-content">
        <span class="preview-modal-close">&times;</span>
        <h2>Template Preview</h2>
        <div class="preview-container" id="templatePreviewContainer"></div>
        <div class="preview-modal-actions">
            <button id="printTemplateBtn">Print</button>
            <button id="useThisTemplateBtn">Use This Template</button>
            <button id="closePreviewBtn">Close</button>
        </div>
    </div>
</div>
`;

// Initialize the preview modal
function initPreviewModal() {
    // Only add the modal if it doesn't exist
    if (!document.getElementById('templatePreviewModal')) {
        // Add CSS
        const style = document.createElement('style');
        style.textContent = previewModalCSS;
        document.head.appendChild(style);
        
        // Add HTML
        document.body.insertAdjacentHTML('beforeend', `
            <div class="preview-modal" id="templatePreviewModal">
                <div class="preview-modal-content">
                    <span class="preview-modal-close">&times;</span>
                    <h2>Template Preview</h2>
                    <div class="preview-container" id="templatePreviewContainer"></div>
                    <div class="preview-modal-actions">
                        <button id="printTemplateBtn">Print</button>
                        <button id="useThisTemplateBtn">Use This Template</button>
                        <button id="closePreviewBtn">Close</button>
                    </div>
                </div>
            </div>
        `);
        
        // Set up modal event listeners
        const modal = document.getElementById('templatePreviewModal');
        const closeModal = () => {
            modal.style.display = 'none';
        };
        
        document.querySelector('.preview-modal-close').addEventListener('click', closeModal);
        document.getElementById('closePreviewBtn').addEventListener('click', closeModal);
        document.getElementById('printTemplateBtn').addEventListener('click', printTemplate);
        document.getElementById('useThisTemplateBtn').addEventListener('click', () => {
            if (selectedTemplate) {
                applyTemplate(selectedTemplate);
                closeModal();
            }
        });
        
        // Close when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
}

// Print the current template
function printTemplate() {
    if (!selectedTemplate) return;
    
    const template = invoiceTemplates[selectedTemplate];
    const previewData = getCurrentFormData();
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Invoice</title>
            <style>
                body { margin: 0; padding: 0; }
                ${template.styles}
                @page { size: A4; margin: 0; }
            </style>
        </head>
        <body>
            ${template.html(previewData)}
            <script>
                window.onload = function() { 
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 300);
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function initTemplateSelection() {
    const templateGrid = document.getElementById('templateGrid');
    if (!templateGrid || templateGrid.children.length > 0) return;
    
    // Load templates
    Object.keys(invoiceTemplates).forEach(templateKey => {
        const template = invoiceTemplates[templateKey];
        const previewData = getPreviewData();
        
        const templateCard = document.createElement('div');
        templateCard.className = 'template-card';
        templateCard.dataset.template = templateKey;
        templateCard.dataset.category = template.category;
        templateCard.innerHTML = `
            <div class="template-preview-container">
                <div class="template-preview">
                    ${template.html(previewData)}
                </div>
            </div>
            <div class="template-info">
                <span class="template-category">${template.category}</span>
                <h3 class="template-name">${template.name}</h3>
                <p class="template-description">${template.description}</p>
                <button class="select-template-btn" data-template="${templateKey}">
                    Select Template
                </button>
            </div>
        `;
        templateGrid.appendChild(templateCard);
    });
    
    // Add event listeners
    document.getElementById('template-filter')?.addEventListener('change', filterTemplates);
    document.querySelectorAll('.select-template-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectTemplate(e.target.dataset.template);
        });
    });
    
    document.getElementById('use-template-btn')?.addEventListener('click', useSelectedTemplate);
}

function filterTemplates() {
    const filterValue = this.value;
    document.querySelectorAll('.template-card').forEach(card => {
        card.style.display = (filterValue === 'all' || card.dataset.category === filterValue) ? 'flex' : 'none';
    });
}

function useSelectedTemplate() {
    if (selectedTemplate) {
        applyTemplate(selectedTemplate);
    }
}