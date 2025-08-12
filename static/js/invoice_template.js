const invoiceTemplates = {
    default: {
        name: "Default invoice",
        description: "Basic Layout with essential fields",
        category: "Business",
        html: (data) => `
        <div class="invoice-paper default-template">
            <!-- Header Section -->
            <div class="header-section">
                <div class="company-info">
                    <div class="company-name">${data.fromAddress.split('\n')[0] || 'Your Company'}</div>
                    <div class="company-address">${data.fromAddress.replace(/\n/g, '<br>') || 'Address'}</div>
                    <div class="company-gst">GSTIN: ${data.supplierGst || ''}</div>
                </div>
                <div class="invoice-meta">
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-number">#${data.invoiceNumber || 'INV-001'}</div>
                    <div class="invoice-date">${data.invoiceDate || new Date().toLocaleDateString()}</div>
                </div>
            </div>

            <!-- Client Section -->
            <div class="client-section">
                <div class="bill-to-label">BILL TO:</div>
                <div class="client-info">
                    <div class="client-name">${data.toAddress.split('\n')[0] || 'Customer'}</div>
                    <div class="client-address">${data.toAddress.replace(/\n/g, '<br>') || 'Address'}</div>
                    <div class="client-gst">GSTIN: ${data.customerGst || ''}</div>
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
                        <span>${data.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="tax-row">
                        <span>Tax:</span>
                        <span>${data.taxAmount.toFixed(2)}</span>
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
            
            .invoice-paper {
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                background: white;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                position: relative;
                display: flex;
                flex-direction: column;
                padding: 20mm;
                box-sizing: border-box;
            }
            
            .default-template {
                font-family: Arial, sans-serif;
                background-color: white;
                box-sizing: border-box;
                overflow: hidden;
                page-break-inside: avoid;
            }
            
            .default-template .header-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
            }
            
            .default-template .company-info {
                width: 50%;
            }
            
            .default-template .invoice-title {
                width: 50%;
                text-align: right;
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            
            .default-template .company-name {
                font-weight: bold;
                font-size: 18px;
                margin-bottom: 5px;
            }
            
            .default-template .company-address {
                font-size: 14px;
                color: #555;
                margin-bottom: 5px;
                line-height: 1.4;
            }
            
            .default-template .company-gst {
                font-size: 14px;
                color: #555;
            }
            
            .default-template .invoice-number {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 5px;
            }
            
            .default-template .invoice-date {
                font-size: 14px;
                color: #555;
            }
            
            .default-template .client-section {
                display: flex;
                margin-bottom: 30px;
                border-top: 1px solid #eee;
                border-bottom: 1px solid #eee;
                padding: 15px 0;
            }
            
            .default-template .bill-to-label {
                font-weight: bold;
                margin-right: 20px;
                width: 80px;
            }
            
            .default-template .client-info {
                flex: 1;
            }
            
            .default-template .client-name {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 5px;
            }
            
            .default-template .client-address {
                font-size: 14px;
                color: #555;
                margin-bottom: 5px;
                line-height: 1.4;
            }
            
            .default-template .client-gst {
                font-size: 14px;
                color: #555;
            }
            
            .default-template .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
                font-size: 14px;
            }
            
            .default-template .items-table th {
                background-color: #333;
                color: white;
                text-align: left;
                padding: 10px;
                font-weight: normal;
            }
            
            .default-template .items-table td {
                border-bottom: 1px solid #ddd;
                padding: 10px;
                vertical-align: top;
            }
            
            .default-template .item-desc {
                color: #666;
            }
            
            .default-template .totals-section {
                display: flex;
                margin-top: 20px;
                margin-bottom: 40px;
            }
            
            .default-template .notes-section {
                width: 60%;
                padding-right: 20px;
            }
            
            .default-template .notes-label {
                font-weight: bold;
                margin-bottom: 10px;
            }
            
            .default-template .notes-content {
                font-size: 14px;
                color: #555;
                line-height: 1.4;
            }
            
            .default-template .amounts-section {
                width: 40%;
                font-size: 14px;
            }
            
            .default-template .subtotal-row,
            .default-template .tax-row,
            .default-template .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            
            .default-template .total-row {
                font-weight: bold;
                font-size: 16px;
                border-top: 1px solid #333;
                padding-top: 10px;
                margin-top: 10px;
            }
            
            .default-template .footer-section {
                margin-top: auto;
                padding-top: 30px;
                border-top: 1px solid #eee;
            }
            
            .default-template .thank-you {
                font-style: italic;
                color: #555;
                margin-bottom: 30px;
                text-align: center;
            }
            
            .default-template .signature-section {
                text-align: right;
            }
            
            .default-template .signature-line {
                display: inline-block;
                width: 200px;
                border-bottom: 1px solid #333;
                margin-bottom: 5px;
            }
            
            .default-template .signature-label {
                font-size: 14px;
                color: #555;
            }
            
            @media print {
                body {
                    background: none;
                }
                
                .invoice-paper {
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
        description: "Traditional layout with clear sections",
        category: "Business",
        html: (data) => `
        <div class="invoice-paper classic-template">
            <div class="header-section">
                <div class="company-info">
                    <div class="company-name">${data.fromAddress.split('\n')[0] || 'Your Company'}</div>
                    <div class="company-address">${data.fromAddress.replace(/\n/g, '<br>') || 'Address'}</div>
                    <div class="company-gst">GSTIN: ${data.supplierGst || ''}</div>
                </div>
                <div class="invoice-meta">
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-number">#${data.invoiceNumber || 'INV-001'}</div>
                    <div class="invoice-date">${data.invoiceDate || new Date().toLocaleDateString()}</div>
                </div>
            </div>

            <div class="client-section">
                <div class="bill-to-label">BILL TO:</div>
                <div class="client-info">
                    <div class="client-name">${data.toAddress.split('\n')[0] || 'Customer'}</div>
                    <div class="client-address">${data.toAddress.replace(/\n/g, '<br>') || 'Address'}</div>
                    <div class="client-gst">GSTIN: ${data.customerGst || ''}</div>
                </div>
            </div>

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

            <div class="totals-section">
                <div class="notes-section">
                    <div class="notes-label">Notes</div>
                    <div class="notes-content">${data.taxDetails || ''}</div>
                </div>
                <div class="amounts-section">
                    <div class="subtotal-row">
                        <span>Subtotal:</span>
                        <span>${data.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="tax-row">
                        <span>Tax:</span>
                        <span>${data.taxAmount.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span>Total:</span>
                        <span>₹${(data.subtotal + data.taxAmount).toFixed(2)}</span>
                    </div>
                </div>
            </div>

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
            .classic-template {
                font-family: 'Times New Roman', serif;
                color: #333;
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                background: white;
                padding: 20mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
            }
            
            .classic-template .header-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
            }
            
            .classic-template .company-name {
                font-size: 22px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            
            .classic-template .company-address {
                font-size: 14px;
                line-height: 1.4;
                margin-bottom: 5px;
            }
            
            .classic-template .company-gst {
                font-size: 14px;
                font-style: italic;
            }
            
            .classic-template .invoice-title {
                font-size: 28px;
                font-weight: bold;
                text-align: right;
                margin-bottom: 10px;
            }
            
            .classic-template .invoice-number {
                font-size: 16px;
                text-align: right;
                margin-bottom: 5px;
            }
            
            .classic-template .invoice-date {
                font-size: 14px;
                text-align: right;
            }
            
            .classic-template .client-section {
                display: flex;
                margin: 25px 0;
                padding: 15px 0;
                border-top: 1px solid #ddd;
                border-bottom: 1px solid #ddd;
            }
            
            .classic-template .bill-to-label {
                font-weight: bold;
                margin-right: 20px;
                width: 80px;
                font-size: 16px;
            }
            
            .classic-template .client-name {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 5px;
            }
            
            .classic-template .client-address {
                font-size: 14px;
                line-height: 1.4;
                margin-bottom: 5px;
            }
            
            .classic-template .client-gst {
                font-size: 14px;
                font-style: italic;
            }
            
            .classic-template .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 14px;
            }
            
            .classic-template .items-table th {
                background-color: #f2f2f2;
                padding: 10px;
                text-align: left;
                border: 1px solid #ddd;
                font-weight: bold;
            }
            
            .classic-template .items-table td {
                padding: 10px;
                border: 1px solid #ddd;
            }
            
            .classic-template .totals-section {
                display: flex;
                margin-top: 20px;
            }
            
            .classic-template .notes-section {
                width: 60%;
                padding-right: 20px;
            }
            
            .classic-template .notes-label {
                font-weight: bold;
                margin-bottom: 10px;
                font-size: 16px;
            }
            
            .classic-template .notes-content {
                font-size: 14px;
                line-height: 1.4;
            }
            
            .classic-template .amounts-section {
                width: 40%;
                font-size: 14px;
            }
            
            .classic-template .subtotal-row,
            .classic-template .tax-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            
            .classic-template .total-row {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                font-size: 16px;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #333;
            }
            
            .classic-template .footer-section {
                margin-top: auto;
                padding-top: 30px;
                border-top: 1px solid #ddd;
            }
            
            .classic-template .thank-you {
                font-style: italic;
                text-align: center;
                margin-bottom: 30px;
                font-size: 14px;
            }
            
            .classic-template .signature-section {
                text-align: right;
            }
            
            .classic-template .signature-line {
                display: inline-block;
                width: 200px;
                border-bottom: 1px solid #333;
                margin-bottom: 5px;
            }
            
            .classic-template .signature-label {
                font-size: 14px;
            }
            
            @media print {
                .classic-template {
                    box-shadow: none;
                    margin: 0;
                    width: auto;
                    height: auto;
                }
            }
        `
    },
    modern: {
        name: "Modern Invoice",
        description: "Clean design with accent colors",
        category: "Business",
        html: (data) => `
        <div class="invoice-paper modern-template">
            <div class="header-section">
                <div class="company-info">
                    <div class="company-name">${data.fromAddress.split('\n')[0] || 'Your Company'}</div>
                    <div class="company-address">${data.fromAddress.replace(/\n/g, '<br>') || 'Address'}</div>
                    <div class="company-gst">GSTIN: ${data.supplierGst || ''}</div>
                </div>
                <div class="invoice-meta">
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-number">#${data.invoiceNumber || 'INV-001'}</div>
                    <div class="invoice-date">${data.invoiceDate || new Date().toLocaleDateString()}</div>
                </div>
            </div>

            <div class="client-section">
                <div class="bill-to-label">BILL TO:</div>
                <div class="client-info">
                    <div class="client-name">${data.toAddress.split('\n')[0] || 'Customer'}</div>
                    <div class="client-address">${data.toAddress.replace(/\n/g, '<br>') || 'Address'}</div>
                    <div class="client-gst">GSTIN: ${data.customerGst || ''}</div>
                </div>
            </div>

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

            <div class="totals-section">
                <div class="notes-section">
                    <div class="notes-label">Notes</div>
                    <div class="notes-content">${data.taxDetails || ''}</div>
                </div>
                <div class="amounts-section">
                    <div class="subtotal-row">
                        <span>Subtotal:</span>
                        <span>${data.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="tax-row">
                        <span>Tax:</span>
                        <span>${data.taxAmount.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span>Total:</span>
                        <span>₹${(data.subtotal + data.taxAmount).toFixed(2)}</span>
                    </div>
                </div>
            </div>

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
            .modern-template {
                font-family: 'Helvetica Neue', Arial, sans-serif;
                color: #333;
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                background: white;
                padding: 20mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
            }
            
            .modern-template .header-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 40px;
            }
            
            .modern-template .company-name {
                font-size: 22px;
                color: #2196F3;
                margin: 0 0 10px 0;
                font-weight: bold;
            }
            
            .modern-template .company-address {
                color: #666;
                margin-bottom: 5px;
                line-height: 1.4;
                font-size: 14px;
            }
            
            .modern-template .company-gst {
                font-size: 13px;
                color: #888;
            }
            
            .modern-template .invoice-title {
                font-size: 28px;
                font-weight: bold;
                color: #2196F3;
                margin-bottom: 10px;
                text-align: right;
            }
            
            .modern-template .invoice-number {
                font-size: 16px;
                margin-bottom: 5px;
                text-align: right;
            }
            
            .modern-template .invoice-date {
                font-size: 14px;
                color: #888;
                text-align: right;
            }
            
            .modern-template .client-section {
                display: flex;
                margin-bottom: 30px;
                padding: 15px 0;
                border-top: 1px solid #eee;
                border-bottom: 1px solid #eee;
            }
            
            .modern-template .bill-to-label {
                font-size: 16px;
                color: #2196F3;
                margin-right: 20px;
                width: 80px;
                text-transform: uppercase;
                font-weight: bold;
            }
            
            .modern-template .client-name {
                font-weight: bold;
                margin-bottom: 5px;
                font-size: 16px;
            }
            
            .modern-template .client-address {
                color: #666;
                margin-bottom: 5px;
                line-height: 1.4;
                font-size: 14px;
            }
            
            .modern-template .client-gst {
                font-size: 14px;
                color: #888;
            }
            
            .modern-template .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 30px 0;
            }
            
            .modern-template .items-table th {
                background-color: #2196F3;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: normal;
                text-transform: uppercase;
                font-size: 12px;
            }
            
            .modern-template .items-table td {
                padding: 10px;
                border-bottom: 1px solid #eee;
                font-size: 14px;
            }
            
            .modern-template .totals-section {
                display: flex;
                margin-top: 20px;
            }
            
            .modern-template .notes-section {
                width: 60%;
                padding-right: 20px;
            }
            
            .modern-template .notes-label {
                color: #2196F3;
                margin-bottom: 10px;
                font-size: 16px;
                font-weight: bold;
            }
            
            .modern-template .notes-content {
                color: #666;
                font-size: 14px;
                line-height: 1.4;
            }
            
            .modern-template .amounts-section {
                width: 40%;
                font-size: 14px;
            }
            
            .modern-template .subtotal-row,
            .modern-template .tax-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            
            .modern-template .total-row {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                font-size: 16px;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #2196F3;
            }
            
            .modern-template .footer-section {
                margin-top: auto;
                padding-top: 30px;
                border-top: 1px solid #eee;
            }
            
            .modern-template .thank-you {
                font-style: italic;
                color: #888;
                text-align: center;
                margin-bottom: 30px;
                font-size: 14px;
            }
            
            .modern-template .signature-section {
                text-align: right;
            }
            
            .modern-template .signature-line {
                display: inline-block;
                width: 200px;
                border-bottom: 1px solid #333;
                margin-bottom: 5px;
            }
            
            .modern-template .signature-label {
                font-size: 14px;
                color: #666;
            }
            
            @media print {
                .modern-template {
                    box-shadow: none;
                    margin: 0;
                    width: auto;
                    height: auto;
                }
            }
        `
    },
    minimal: {
        name: "Minimal Invoice",
        description: "Simple and clean layout",
        category: "Minimal",
        html: (data) => `
        <div class="invoice-paper minimal-template">
            <div class="header-section">
                <div class="company-info">
                    <div class="company-name">${data.fromAddress.split('\n')[0] || 'Your Company'}</div>
                    <div class="company-address">${data.fromAddress.replace(/\n/g, '<br>') || 'Address'}</div>
                    <div class="company-gst">GSTIN: ${data.supplierGst || ''}</div>
                </div>
                <div class="invoice-meta">
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-number">#${data.invoiceNumber || 'INV-001'}</div>
                    <div class="invoice-date">${data.invoiceDate || new Date().toLocaleDateString()}</div>
                </div>
            </div>

            <div class="client-section">
                <div class="bill-to-label">BILL TO:</div>
                <div class="client-info">
                    <div class="client-name">${data.toAddress.split('\n')[0] || 'Customer'}</div>
                    <div class="client-address">${data.toAddress.replace(/\n/g, '<br>') || 'Address'}</div>
                    <div class="client-gst">GSTIN: ${data.customerGst || ''}</div>
                </div>
            </div>

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

            <div class="totals-section">
                <div class="notes-section">
                    <div class="notes-label">Notes</div>
                    <div class="notes-content">${data.taxDetails || ''}</div>
                </div>
                <div class="amounts-section">
                    <div class="subtotal-row">
                        <span>Subtotal:</span>
                        <span>${data.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="tax-row">
                        <span>Tax:</span>
                        <span>${data.taxAmount.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span>Total:</span>
                        <span>₹${(data.subtotal + data.taxAmount).toFixed(2)}</span>
                    </div>
                </div>
            </div>

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
            .minimal-template {
                font-family: 'Arial', sans-serif;
                color: #333;
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                background: white;
                padding: 20mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
            }
            
            .minimal-template .header-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
            }
            
            .minimal-template .company-name {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .minimal-template .company-address {
                color: #666;
                margin-bottom: 5px;
                line-height: 1.4;
                font-size: 14px;
            }
            
            .minimal-template .company-gst {
                font-size: 12px;
                color: #999;
            }
            
            .minimal-template .invoice-title {
                font-size: 24px;
                margin: 0 0 5px 0;
                text-align: right;
                font-weight: normal;
            }
            
            .minimal-template .invoice-number {
                text-align: right;
                margin-bottom: 3px;
                font-size: 14px;
            }
            
            .minimal-template .invoice-date {
                text-align: right;
                color: #666;
                font-size: 14px;
            }
            
            .minimal-template .client-section {
                display: flex;
                margin: 20px 0;
                padding: 15px 0;
                border-top: 1px solid #eee;
                border-bottom: 1px solid #eee;
            }
            
            .minimal-template .bill-to-label {
                font-size: 16px;
                margin-bottom: 10px;
                color: #666;
                margin-right: 20px;
                width: 80px;
            }
            
            .minimal-template .client-name {
                font-weight: bold;
                margin-bottom: 5px;
                font-size: 16px;
            }
            
            .minimal-template .client-address {
                color: #666;
                margin-bottom: 5px;
                line-height: 1.4;
                font-size: 14px;
            }
            
            .minimal-template .client-gst {
                font-size: 12px;
                color: #999;
            }
            
            .minimal-template .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 14px;
            }
            
            .minimal-template .items-table th {
                text-align: left;
                padding: 10px;
                border-bottom: 1px solid #eee;
                font-weight: normal;
                color: #666;
            }
            
            .minimal-template .items-table td {
                padding: 10px;
                border-bottom: 1px solid #eee;
            }
            
            .minimal-template .totals-section {
                display: flex;
                margin-top: 20px;
            }
            
            .minimal-template .notes-section {
                width: 60%;
                padding-right: 20px;
            }
            
            .minimal-template .notes-label {
                font-weight: bold;
                margin-bottom: 10px;
                font-size: 16px;
            }
            
            .minimal-template .notes-content {
                color: #666;
                font-size: 14px;
                line-height: 1.4;
            }
            
            .minimal-template .amounts-section {
                width: 40%;
                font-size: 14px;
            }
            
            .minimal-template .subtotal-row,
            .minimal-template .tax-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            
            .minimal-template .total-row {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                font-size: 16px;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #333;
            }
            
            .minimal-template .footer-section {
                margin-top: auto;
                padding-top: 30px;
                border-top: 1px solid #eee;
            }
            
            .minimal-template .thank-you {
                font-style: italic;
                text-align: center;
                margin-bottom: 30px;
                color: #666;
                font-size: 14px;
            }
            
            .minimal-template .signature-section {
                text-align: right;
            }
            
            .minimal-template .signature-line {
                display: inline-block;
                width: 200px;
                border-bottom: 1px solid #333;
                margin-bottom: 5px;
            }
            
            .minimal-template .signature-label {
                font-size: 14px;
                color: #666;
            }
            
            @media print {
                .minimal-template {
                    box-shadow: none;
                    margin: 0;
                    width: auto;
                    height: auto;
                }
            }
        `
    },
    professional: {
        name: "Professional Invoice",
        description: "Corporate style with elegant typography",
        category: "Business",
        html: (data) => `
        <div class="invoice-paper professional-template">
            <div class="header-section">
                <div class="company-info">
                    <div class="company-name">${data.fromAddress.split('\n')[0] || 'Your Company'}</div>
                    <div class="company-address">${data.fromAddress.replace(/\n/g, '<br>') || 'Address'}</div>
                    <div class="company-gst">GSTIN: ${data.supplierGst || ''}</div>
                </div>
                <div class="invoice-meta">
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-number">#${data.invoiceNumber || 'INV-001'}</div>
                    <div class="invoice-date">${data.invoiceDate || new Date().toLocaleDateString()}</div>
                </div>
            </div>

            <div class="client-section">
                <div class="bill-to-label">BILL TO:</div>
                <div class="client-info">
                    <div class="client-name">${data.toAddress.split('\n')[0] || 'Customer'}</div>
                    <div class="client-address">${data.toAddress.replace(/\n/g, '<br>') || 'Address'}</div>
                    <div class="client-gst">GSTIN: ${data.customerGst || ''}</div>
                </div>
            </div>

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

            <div class="totals-section">
                <div class="notes-section">
                    <div class="notes-label">Notes</div>
                    <div class="notes-content">${data.taxDetails || ''}</div>
                </div>
                <div class="amounts-section">
                    <div class="subtotal-row">
                        <span>Subtotal:</span>
                        <span>${data.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="tax-row">
                        <span>Tax:</span>
                        <span>${data.taxAmount.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span>Total:</span>
                        <span>₹${(data.subtotal + data.taxAmount).toFixed(2)}</span>
                    </div>
                </div>
            </div>

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
            .professional-template {
                font-family: 'Georgia', serif;
                color: #333;
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                background: white;
                padding: 20mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
            }
            
            .professional-template .header-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid #ddd;
            }
            
            .professional-template .company-name {
                font-size: 22px;
                margin: 0 0 10px 0;
                font-weight: normal;
            }
            
            .professional-template .company-address {
                color: #666;
                margin-bottom: 5px;
                line-height: 1.4;
                font-size: 14px;
            }
            
            .professional-template .company-gst {
                font-size: 13px;
                color: #888;
            }
            
            .professional-template .invoice-title {
                font-size: 28px;
                margin-bottom: 10px;
                color: #555;
                text-align: right;
            }
            
            .professional-template .invoice-number {
                font-size: 16px;
                text-align: right;
                margin-bottom: 5px;
            }
            
            .professional-template .invoice-date {
                font-size: 14px;
                color: #666;
                text-align: right;
            }
            
            .professional-template .client-section {
                display: flex;
                margin-bottom: 30px;
                padding: 15px 0;
                border-top: 1px solid #ddd;
                border-bottom: 1px solid #ddd;
            }
            
            .professional-template .bill-to-label {
                font-weight: bold;
                margin-right: 15px;
                width: 80px;
                font-size: 16px;
            }
            
            .professional-template .client-name {
                font-weight: bold;
                margin-bottom: 5px;
                font-size: 16px;
            }
            
            .professional-template .client-address {
                color: #666;
                margin-bottom: 5px;
                line-height: 1.4;
                font-size: 14px;
            }
            
            .professional-template .client-gst {
                font-size: 14px;
                color: #888;
            }
            
            .professional-template .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 14px;
            }
            
            .professional-template .items-table th {
                text-align: left;
                padding: 10px;
                border-bottom: 2px solid #ddd;
                font-weight: normal;
                color: #555;
            }
            
            .professional-template .items-table td {
                padding: 10px;
                border-bottom: 1px solid #eee;
            }
            
            .professional-template .totals-section {
                display: flex;
                margin-top: 30px;
            }
            
            .professional-template .notes-section {
                width: 60%;
                padding-right: 20px;
            }
            
            .professional-template .notes-label {
                font-size: 16px;
                color: #555;
                margin-bottom: 10px;
                font-weight: bold;
            }
            
            .professional-template .notes-content {
                color: #666;
                font-size: 14px;
                line-height: 1.4;
            }
            
            .professional-template .amounts-section {
                width: 40%;
                font-size: 14px;
            }
            
            .professional-template .subtotal-row,
            .professional-template .tax-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            
            .professional-template .total-row {
                display: flex;
                justify-content: space-between;
                font-weight: bold;
                font-size: 16px;
                padding-top: 10px;
                border-top: 1px solid #ddd;
            }
            
            .professional-template .footer-section {
                margin-top: auto;
                padding-top: 50px;
                border-top: 1px solid #ddd;
            }
            
            .professional-template .thank-you {
                font-style: italic;
                color: #888;
                text-align: center;
                margin-bottom: 30px;
                font-size: 14px;
            }
            
            .professional-template .signature-section {
                text-align: right;
            }
            
            .professional-template .signature-line {
                display: inline-block;
                width: 200px;
                border-bottom: 1px solid #333;
                margin-bottom: 5px;
            }
            
            .professional-template .signature-label {
                font-size: 14px;
                color: #555;
            }
            
            @media print {
                .professional-template {
                    box-shadow: none;
                    margin: 0;
                    width: auto;
                    height: auto;
                }
            }
        `
    }
};
// Make templates globally available immediately
window.invoiceTemplates = invoiceTemplates;

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
// Function to render template preview
function renderTemplatePreview(templateKey) {
    const template = invoiceTemplates[templateKey];
    if (!template) return document.createElement('div');
    
    // Get current form values
    const templateData = {
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
    
    // Calculate totals
    $('#itemsTableBody tr').each(function() {
        const row = $(this);
        const qty = parseFloat(row.find('.qty').val()) || 0;
        const rate = parseFloat(row.find('.rate').val()) || 0;
        const taxRate = parseFloat(row.find('.tax').val()) || 0;
        const amount = parseFloat(row.find('.amount').val()) || 0;
        
        templateData.items.push({
            description: row.find('.item-desc').val() || 'Item',
            quantity: qty,
            price_per_unit: rate,
            gst: taxRate,
            amount: amount
        });
        
        templateData.subtotal += amount / (1 + (taxRate / 100));
        templateData.taxAmount += amount - (amount / (1 + (taxRate / 100)));
    });
    
    templateData.itemsHtml = generateItemsHtml(templateData.items);
    
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
                <div class="template-grid">
                    <!-- Templates will be inserted here -->
                </div>
            </div>
        </div>
    `;

    // Add CSS for the template grid
    const style = document.createElement('style');
    style.textContent = `
        .template-grid-container {
            padding: 20px;
            overflow-y: auto;
            max-height: calc(100vh - 200px);
        }
        
        .template-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 25px;
            padding: 10px;
        }
        
        .template-card {
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.2s ease;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            height: 450px;
            display: flex;
            flex-direction: column;
        }
        
        .template-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.12);
        }
        
        .template-preview-container {
            height: 350px;
            overflow: hidden;
            position: relative;
            background: #f9f9f9;
            display: flex;
            align-items: center;
            justify-content: center;
            border-bottom: 1px solid #eee;
        }
        
        .template-preview {
            width: 210mm; /* A4 width */
            height: 297mm; /* A4 height */
            transform: scale(0.2);
            transform-origin: top left;
            box-shadow: 0 0 8px rgba(0,0,0,0.1);
        }
        
        .template-info {
            padding: 15px;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
        }
        
        .template-name {
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 5px 0;
            color: #333;
        }
        
        .template-description {
            font-size: 14px;
            color: #666;
            margin: 0 0 10px 0;
            flex-grow: 1;
        }
        
        .template-category {
            display: inline-block;
            background: #e3f2fd;
            color: #1976d2;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 10px;
            align-self: flex-start;
        }
        
        .select-template-btn {
            background: #4285f4;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: background 0.2s;
            width: 100%;
        }
        
        .select-template-btn:hover {
            background: #3367d6;
        }
        
        .template-card.selected {
            border: 2px solid #4285f4;
            box-shadow: 0 0 0 4px rgba(66, 133, 244, 0.2);
        }
    `;
    document.head.appendChild(style);

    const templateGrid = templateSection.querySelector('.template-grid');
    if (!templateGrid) return;
    
    // Add each template to the grid
    Object.keys(invoiceTemplates).forEach(templateKey => {
        const template = invoiceTemplates[templateKey];
        
        const templateCard = document.createElement('div');
        templateCard.className = 'template-card';
        templateCard.dataset.template = templateKey;
        templateCard.dataset.category = template.category;
        
        // Create preview data with default values
        const previewData = {
            fromAddress: 'Your Company\n123 Business Rd\nCity, State 10001',
            toAddress: 'Customer Name\n456 Client Ave\nTown, State 20002',
            invoiceNumber: 'INV-2023-001',
            invoiceDate: new Date().toLocaleDateString(),
            supplierGst: '22AAAAA0000A1Z5',
            customerGst: '33BBBBB0000B2Z6',
            taxDetails: 'Payment due within 15 days. Late payments subject to 1.5% monthly interest.',
            subtotal: 1250.00,
            taxAmount: 225.00,
            items: [
                { description: 'Web Design Services', quantity: 10, price_per_unit: 100.00, gst: 18, amount: 1180.00 },
                { description: 'Domain Registration', quantity: 1, price_per_unit: 70.00, gst: 18, amount: 82.60 }
            ]
        };
        previewData.itemsHtml = generateItemsHtml(previewData.items);
        
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
    
    // Add filter functionality
    const filterSelect = document.getElementById('template-filter');
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            const filterValue = this.value;
            document.querySelectorAll('.template-card').forEach(card => {
                if (filterValue === 'all' || card.dataset.category === filterValue) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
    
    // Add selection handlers
    document.querySelectorAll('.template-card, .select-template-btn').forEach(element => {
        element.addEventListener('click', function(e) {
            // Stop propagation if clicking the button
            if (e.target.classList.contains('select-template-btn')) {
                e.stopPropagation();
            }
            
            const card = e.target.closest('.template-card');
            if (!card) return;
            
            const templateKey = card.dataset.template;
            selectTemplate(templateKey);
        });
    });
}

let selectedTemplate = null;

function selectTemplate(templateKey) {
    selectedTemplate = templateKey;
    
    // Update UI to show selection
    document.querySelectorAll('.template-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    const selectedCard = document.querySelector(`.template-card[data-template="${templateKey}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Show the "Use Template" button
    const useBtn = document.getElementById('use-template-btn');
    if (useBtn) {
        useBtn.style.display = 'block';
        useBtn.onclick = function() {
            applyTemplate(templateKey);
        };
    }
}

function applyTemplate(templateKey) {
    const template = invoiceTemplates[templateKey];
    if (!template) {
        console.error('Template not found:', templateKey);
        return;
    }

    // Save the selected template to localStorage
    localStorage.setItem('selectedInvoiceTemplate', templateKey);
    
    // Show success message
    Swal.fire({
        title: 'Template Selected!',
        text: `"${template.name}" template has been applied successfully.`,
        icon: 'success',
        confirmButtonText: 'Continue Editing',
        showCancelButton: true,
        cancelButtonText: 'View Invoice',
        reverseButtons: true
    }).then((result) => {
        if (result.isDismissed) {
            // If user clicks "View Invoice", generate and show the invoice
            generateAndShowInvoice(templateKey);
        } else {
            // Continue editing - you might want to update the editor UI
            updateEditorWithTemplate(templateKey);
        }
    });
}

function generateAndShowInvoice(templateKey) {
    const template = invoiceTemplates[templateKey];
    if (!template) return;

    // Get current form data
    const templateData = getCurrentFormData();
    templateData.itemsHtml = generateItemsHtml(templateData.items);

    // Create the invoice HTML
    const invoiceHtml = template.html(templateData);
    
    // Create a new window to display the invoice
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice Preview</title>
            <style>
                body { margin: 0; padding: 0; background: #f5f5f5; }
                .invoice-container { 
                    max-width: 800px; 
                    margin: 20px auto; 
                    padding: 20px; 
                    background: white; 
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                }
                .actions {
                    text-align: center;
                    margin: 20px 0;
                }
                button {
                    padding: 10px 20px;
                    margin: 0 10px;
                    background: #4285f4;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                ${template.styles}
            </style>
        </head>
        <body>
            <div class="actions">
                <button onclick="window.print()">Print Invoice</button>
                <button onclick="window.close()">Close</button>
            </div>
            <div class="invoice-container">
                ${invoiceHtml}
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
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

// Export for use in other files if needed
window.templateModule = {
    loadTemplateSelection,
    selectTemplate,
    applyTemplate,
    getTemplate: (key) => invoiceTemplates[key],
    renderTemplatePreview,
    generateItemsHtml
};


// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the choose-template page
    if (document.getElementById('choose-template')) {
        loadTemplateSelection();
    }

    // If there's a selected template in localStorage, apply it
    const savedTemplate = localStorage.getItem('selectedInvoiceTemplate');
    if (savedTemplate && invoiceTemplates[savedTemplate]) {
        updateEditorWithTemplate(savedTemplate);
    }
});


function showTemplateSelection() {
    // Load the template grid
    templateModule.loadTemplateSelection();
    
    // Highlight the currently selected template
    const currentTemplate = localStorage.getItem('selectedInvoiceTemplate');
    if (currentTemplate) {
        const selectedCard = document.querySelector(`.template-card[data-template="${currentTemplate}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
    }
}
