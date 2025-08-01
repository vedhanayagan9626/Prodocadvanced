// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';


// Global variables
let lastExtractedData = null;
let dt; // DataTable instance
let pdfDoc = null;
let currentPage = 1;
let pdfScale = 1.5;
let isPanning = false;
let startX = 0, startY = 0;
let panX = 0, panY = 0;
let scale = 1;
const minScale = 0.5;
const maxScale = 4;
let activeElement = null;
let jsPDF = window.jspdf;


// Make essential functions globally available
window.displayFilePreview = displayFilePreview;
window.processFile = processFile;
window.resetTransform = resetTransform;
window.showToast = showToast;

// Main initialization
$(document).ready(function() {
    initializeApplication();
    setupPreviewControls();
    initializeItemHandlers()
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
    $('#headerColor').val('#333333');
    $('#textColor').val('#333333');
    $('#accentColor').val('#2196F3');

    // Initialize event handlers
    $('#uploadForm').on('submit', handleFormSubmit);
    $('#saveBtn').on('click', handleSaveInvoice);
    $('#addItemBtn').on('click', handleAddItem);
    
    // Initialize download buttons - Add these lines
    $('#downloadPdfBtn').on('click', function(e) {
        e.preventDefault();
        downloadAsPDF();
    });
    
    $('#downloadImageBtn').on('click', function(e) {
        e.preventDefault();
        downloadAsImage();
    });

    // Initialize pan/zoom
    attachPanZoom(document.getElementById('previewImg'), false);
    attachPanZoom(document.getElementById('pdfViewer'), true);

    // Initialize pan/zoom after elements are loaded
    setTimeout(() => {
            const previewImg = document.getElementById('previewImg');
            const pdfViewer = document.getElementById('pdfViewer');
            
            if (previewImg) {
                attachPanZoom(previewImg, false);
                resetTransform(previewImg);
            }
            
            if (pdfViewer) {
                attachPanZoom(pdfViewer, true);
            }
            
            // Add touch event support for mobile devices
            setupTouchEvents();
        }, 500);

    // Initialize preview controls
    setupPreviewControls();
    
    // Window resize handler
    $(window).on('resize', resizePreviewArea);
    resizePreviewArea();
    
    // Initialize item handlers
    initializeItemHandlers();
    
    // Setup preview listeners
    setupPreviewListeners();
}

// Touch event support
function setupTouchEvents() {
    const previewWrapper = document.getElementById('previewWrapper');
    if (!previewWrapper) return;
    
    let touchStartX = 0;
    let touchStartY = 0;
    let initialPanX = 0;
    let initialPanY = 0;
    
    previewWrapper.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) return;
        e.preventDefault();
        
        const activeEl = document.getElementById('previewImg').style.display !== 'none' ? 
            document.getElementById('previewImg') : 
            document.getElementById('pdfViewer');
            
        if (!activeEl) return;
        
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        initialPanX = panX;
        initialPanY = panY;
        activeEl.style.cursor = 'grabbing';
    });
    
    previewWrapper.addEventListener('touchmove', function(e) {
        if (e.touches.length !== 1) return;
        e.preventDefault();
        
        const activeEl = document.getElementById('previewImg').style.display !== 'none' ? 
            document.getElementById('previewImg') : 
            document.getElementById('pdfViewer');
            
        if (!activeEl) return;
        
        panX = initialPanX + (e.touches[0].clientX - touchStartX);
        panY = initialPanY + (e.touches[0].clientY - touchStartY);
        
        if (activeEl.id === 'pdfViewer') {
            renderPdfPage(currentPage, pdfScale);
        } else {
            applyTransform(activeEl);
        }
    });
    
    previewWrapper.addEventListener('touchend', function() {
        const activeEl = document.getElementById('previewImg').style.display !== 'none' ? 
            document.getElementById('previewImg') : 
            document.getElementById('pdfViewer');
            
        if (activeEl) {
            activeEl.style.cursor = 'grab';
        }
    });
    
    // Pinch zoom for touch devices
    let initialDistance = 0;
    let initialScale = 1;
    
    previewWrapper.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            initialDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialScale = scale;
        }
    });
    
    previewWrapper.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            
            const activeEl = document.getElementById('previewImg').style.display !== 'none' ? 
                document.getElementById('previewImg') : 
                document.getElementById('pdfViewer');
                
            if (!activeEl) return;
            
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            
            const newScale = Math.min(maxScale, Math.max(minScale, initialScale * (currentDistance / initialDistance)));
            
            if (newScale !== scale) {
                scale = newScale;
                
                if (activeEl.id === 'pdfViewer') {
                    pdfScale = scale * 1.5;
                    renderPdfPage(currentPage, pdfScale);
                } else {
                    applyTransform(activeEl);
                }
            }
        }
    });
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

// Display file preview with proper CORS handling
function displayFilePreview(filename) {
    if (!filename) {
        showToast("No file specified for preview", false);
        return;
    }

    const fileType = filename.split('.').pop().toLowerCase();
    const previewImg = $('#previewImg');
    const pdfViewer = $('#pdfViewer');
    
    // Hide both initially
    previewImg.hide();
    pdfViewer.hide();

    if (fileType === 'pdf') {
        fetchPDFPreview(filename);
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) {
        fetchImagePreview(filename);
    } else {
        showToast("Unsupported file type for preview", false);
    }
}

function fetchPDFPreview(filename) {
    const pdfViewer = document.getElementById('pdfViewer');
    
    fetch(`/api/v1/get-file?filename=${encodeURIComponent(filename)}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load PDF');
            return response.blob();
        })
        .then(blob => {
            const objectUrl = URL.createObjectURL(blob);
            return pdfjsLib.getDocument(objectUrl).promise;
        })
        .then(pdf => {
            pdfDoc = pdf;
            return pdf.getPage(1);
        })
        .then(page => {
            const viewport = page.getViewport({ scale: 1.5 });
            pdfViewer.height = viewport.height;
            pdfViewer.width = viewport.width;
            const context = pdfViewer.getContext("2d");
            
            return page.render({
                canvasContext: context,
                viewport: viewport
            });
        })
        .then(() => {
            pdfViewer.style.display = 'block';
        })
        .catch(error => {
            console.error("PDF preview error:", error);
            showToast("Failed to load PDF preview", false);
        });
}

function fetchImagePreview(filename) {
    const previewImg = document.getElementById('previewImg');
    const wrapper = document.getElementById('previewWrapper');
    
    fetch(`/api/v1/get-file?filename=${encodeURIComponent(filename)}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load image');
            return response.blob();
        })
        .then(blob => {
            const objectUrl = URL.createObjectURL(blob);
            previewImg.src = objectUrl;
            previewImg.style.display = 'block';
            
            previewImg.onload = function() {
                URL.revokeObjectURL(objectUrl); // Clean up memory
                
                // Center the image initially
                const wrapperWidth = wrapper.clientWidth;
                const wrapperHeight = wrapper.clientHeight;
                const imgWidth = this.naturalWidth;
                const imgHeight = this.naturalHeight;
                
                // Calculate initial scale to fit
                const scaleX = wrapperWidth / imgWidth;
                const scaleY = wrapperHeight / imgHeight;
                scale = Math.min(scaleX, scaleY, 1);
                
                // Center the image
                panX = (wrapperWidth - imgWidth * scale) / 2;
                panY = (wrapperHeight - imgHeight * scale) / 2;
                
                applyTransform(previewImg);
            };
            
            previewImg.onerror = function() {
                URL.revokeObjectURL(objectUrl);
                throw new Error('Image failed to load');
            };
        })
        .catch(error => {
            console.error("Image preview error:", error);
            showToast("Failed to load image preview", false);
        });
}


// PDF rendering with pan/zoom support
function renderPdfPage(pageNum, scaleVal) {
    if (!pdfDoc) return;
    
    pdfDoc.getPage(pageNum).then(page => {
        const pdfViewer = document.getElementById('pdfViewer');
        const viewport = page.getViewport({ scale: scaleVal });
        
        // Adjust canvas size
        pdfViewer.height = viewport.height;
        pdfViewer.width = viewport.width;
        
        const context = pdfViewer.getContext("2d");
        
        // Clear previous render
        context.clearRect(0, 0, pdfViewer.width, pdfViewer.height);
        
        // Create temporary canvas for rendering
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = pdfViewer.width;
        tempCanvas.height = pdfViewer.height;
        const tempContext = tempCanvas.getContext('2d');
        
        // Render page to temporary canvas
        page.render({
            canvasContext: tempContext,
            viewport: viewport
        }).promise.then(() => {
            // Apply pan/zoom transform to the main canvas
            context.save();
            context.translate(panX, panY);
            context.scale(scale, scale);
            context.drawImage(tempCanvas, 0, 0);
            context.restore();
            
            pdfViewer.style.display = 'block';
        });
    }).catch(error => {
        console.error("PDF render error:", error);
        showToast("Failed to render PDF page", false);
    });
}

// Pan/Zoom Functions
function attachPanZoom(el, isPDF = false) {
    if (!el) return;

    // Mouse down handler
    el.addEventListener('mousedown', function(e) {
        if (el.style.display === 'none') return;
        e.preventDefault();
        isPanning = true;
        activeElement = el;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        el.style.cursor = 'grabbing';
    });

    // Mouse move handler
    document.addEventListener('mousemove', function(e) {
        if (!isPanning) return;
        e.preventDefault();
        
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        
        if (isPDF) {
            // For PDF, we need to re-render at the new position
            renderPdfPage(currentPage, pdfScale);
        } else {
            applyTransform(el);
        }
    });

    // Mouse up handler
    document.addEventListener('mouseup', function() {
        isPanning = false;
        if (activeElement) {
            activeElement.style.cursor = 'grab';
        }
    });

    // Wheel handler for zooming
    el.addEventListener('wheel', function(e) {
        if (el.style.display === 'none') return;
        e.preventDefault();
        
        // Get mouse position relative to element
        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate zoom direction and amount
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScale = Math.min(maxScale, Math.max(minScale, scale + delta));
        
        if (newScale !== scale) {
            // Adjust pan to zoom toward mouse position
            panX = mouseX - (mouseX - panX) * (newScale / scale);
            panY = mouseY - (mouseY - panY) * (newScale / scale);
            
            scale = newScale;
            
            if (isPDF) {
                pdfScale = scale * 1.5;
                renderPdfPage(currentPage, pdfScale);
            } else {
                applyTransform(el);
            }
        }
    });
}

// Apply transform to element
function applyTransform(el) {
    el.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

// Reset transform
function resetTransform(element) {
    if (!element) return;
    panX = 0;
    panY = 0;
    scale = 1;
    element.style.transform = 'translate(0px, 0px) scale(1)';
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
        <td class="text-center"><button type="button" class="remove-item-btn">×</button></td>
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

function renderInvoicePreview(data) {
    const invData = data.invoice_data || {};
    const items = data.items || [];
    
    const paperSize = $('#paperSizeSelect').val().toLowerCase();
    const paper = $('#invoice-paper');
    
    // Set paper class and reset any transforms
    paper.removeClass('a4 letter a5').addClass(paperSize);
    paper.css('transform', 'none');
    
    // Calculate dynamic font sizes based on paper size
    let baseFontSize = 12; // px
    let padding = 0.7; // inches
    
        switch(paperSize) {
        case 'a5':
            baseFontSize = 10;
            padding = 0.5;
            break;
        case 'letter':
            baseFontSize = 12;
            padding = 0.7;
            break;
        case 'a4':
        default:
            baseFontSize = 12;
            padding = 0.7;
    }

    // Apply dynamic padding
    paper.css('padding', `${padding}in`);

    // Safely get values with defaults
    const fromAddress = $('#fromAddress').val() || '';
    const toAddress = $('#toAddress').val() || '';
    const invoiceNumber = $('#invoiceNumber').val() || 'INV-001';
    const total = $('#total').val() || '0.00';
    const invoiceDate = $('#invoiceDate').val() || new Date().toLocaleDateString();
    const supplierGst = $('#supplierGst').val() || '';
    const customerGst = $('#customerGst').val() || '';
    const taxDetails = $('#taxDetails').val() || '';

    // Generate items HTML
    let itemsHtml = '';
    items.forEach((item, index) => {
        itemsHtml += `
            <tr>
                <td>${index + 1}</td>
                <td>
                    ${item.description || 'Item'}<br>
                    <span class="item-desc">${item.hsn || ''}</span>
                </td>
                <td>
                    ${item.quantity || '1'}<br>
                    <span class="item-desc">Nos</span>
                </td>
                <td>${(parseFloat(item.price_per_unit) || 0).toFixed(2)}</td>
                <td>0.00</td>
                <td>${item.gst || '0'}%</td>
                <td>${(parseFloat(item.amount) - (parseFloat(item.price_per_unit) * parseFloat(item.quantity)) || 0).toFixed(2)}</td>
                <td>${(parseFloat(item.amount) || 0).toFixed(2)}</td>
            </tr>
        `;
    });
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const taxAmount = items.reduce((sum, item) => {
        const rate = parseFloat(item.gst) || 0;
        const amount = parseFloat(item.amount) || 0;
        return sum + (amount - (amount / (1 + (rate / 100))));
    }, 0);
    
    // Generate the invoice HTML with safe value handling
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
                        <td class="total-value">${subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td class="total-label">Tax Amount</td>
                        <td class="total-value">${taxAmount.toFixed(2)}</td>
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
    
    paper.html(invoiceHtml);
    

    // Apply dynamic styling
    paper.find('.invoice-content').css({
        'font-size': `${baseFontSize}px`,
        'line-height': `${baseFontSize * 1.5}px`
    });
    
    adjustContentForPaperSize();

    console.log('Paper dimensions:', {
        width: paper.offsetWidth,
        height: paper.offsetHeight,
        scrollWidth: paper.scrollWidth,
        scrollHeight: paper.scrollHeight
    });

    // Apply scaling for preview (if needed)
    const scale = calculateOptimalScale(paper[0]);
    paper.css('transform', `scale(${scale})`);
    
    // Update colors
    updatePreviewColors();
}

function calculateOptimalScale(paperElement) {
    const container = document.getElementById('invoice-preview-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const paperWidth = paperElement.offsetWidth;
    const paperHeight = paperElement.offsetHeight;
    
    const widthScale = (containerWidth * 0.9) / paperWidth;
    const heightScale = (containerHeight * 0.9) / paperHeight;
    
    return Math.min(widthScale, heightScale, 1); // Don't scale up beyond 100%
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

function handleSaveInvoice() {
    showDatatableSpinner();
    const updatedInvoice = {
        invoice_data: {},
        items: []
    };
    const styling = {
        paperSize: $('#paperSizeSelect').val(),
        headerColor: $('#headerColor').val(),
        textColor: $('#textColor').val(),
        accentColor: $('#accentColor').val(),
        topMargin: $('#topMargin').val()
        //if any styles enabled in invoice editor add them here 
    };

    // Collect basic invoice data (same as before)
    $('#invoiceForm input, #invoiceForm textarea').each(function() {
        const field = $(this).data('field');
        if (field) {
            updatedInvoice.invoice_data[field] = $(this).val();
        }
    });
    
    // Add calculated fields
    updatedInvoice.invoice_data.subtotal = $('#subtotal').val();
    updatedInvoice.invoice_data.tax_amount = $('#taxAmount').val();
        // Add to your correction data
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
    });
    console.log("Data being sent to backend:", updatedInvoice);
    // Call the new correction endpoint
    $.ajax({
        url: '/api/v1/invoices/save-correction',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(updatedInvoice),
        success: function(response) {
            showToast("Invoice corrections saved successfully.");
            $('#saveBtn').html('<i class="fas fa-check-circle"></i> Saved').prop('disabled', true);
        },
        error: function() {
            showToast("Failed to save invoice corrections.", false);
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
function showToast(message, isSuccess = true) {
    const toastEl = $('#toast');
    toastEl.removeClass('text-bg-success text-bg-danger')
           .addClass(isSuccess ? 'text-bg-success' : 'text-bg-danger')
           .find('.toast-body').text(message);
    new bootstrap.Toast(toastEl[0]).show();
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
    // Paper size change
    $('#paperSizeSelect').change(function() {
            const paperSize = $(this).val().toLowerCase();
            const paper = $('#invoice-paper');
            
            // Remove all paper size classes first
            paper.removeClass('a4 letter a5');
            
            // Add the selected class
            paper.addClass(paperSize);
            
            // Update dimensions based on selected size
            switch(paperSize) {
                case 'a4':
                    paper.css({
                        'width': '8.27in',
                        'min-height': '11.69in'
                    });
                    break;
                case 'letter':
                    paper.css({
                        'width': '8.5in',
                        'min-height': '11in'
                    });
                    break;
                case 'a5':
                    paper.css({
                        'width': '5.83in',
                        'min-height': '8.27in'
                    });
                    break;
            }
            
            // Re-render with new dimensions
            renderInvoicePreviewFromForm();
            
            // Adjust preview scaling
            setTimeout(() => {
                const scale = calculateOptimalScale(paper[0]);
                paper.css('transform', `scale(${scale})`);
            }, 100);
        });
    
    // Color changes
    $('#headerColor, #textColor, #accentColor').change(function() {
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
    const headerColor = $('#headerColor').val();
    const textColor = $('#textColor').val();
    const accentColor = $('#accentColor').val();
    
    const style = `
        .invoice-content, 
        .invoice-paper,
        .invoice-paper .company-info,
        .invoice-paper .bill-to,
        .invoice-paper .invoice-details,
        .invoice-paper .items-table td,
        .invoice-paper .notes-section,
        .invoice-paper .footer {
            color: ${textColor} !important;
        }
        .items-table th
        {
            background-color: ${headerColor} !important;
            color: white !important;
        }
        .invoice-type{
        color: ${headerColor} !important;
        } 
        .balance-amount, 
        .total-value b,
        .invoice-number {
            color: ${accentColor} !important;
        }
    `;
    
    $('#dynamic-preview-styles').remove();
    $('head').append(`<style id="dynamic-preview-styles">${style}</style>`);
}

// Download as PDF
function downloadAsPDF() {
    showToast("Generating PDF...");
    
    const paper = document.getElementById('invoice-paper');
    const container = document.getElementById('invoice-preview-container');
    
    // Store original styles
    const originalStyles = {
        paperTransform: paper.style.transform,
        paperWidth: paper.style.width,
        paperHeight: paper.style.height,
        paperPadding: paper.style.padding,
        containerOverflow: container.style.overflow,
        containerHeight: container.style.height,
        containerPadding: container.style.padding
    };
    
    // Get selected paper size
    const paperSize = $('#paperSizeSelect').val().toUpperCase();
    
    // Create a clone of the paper element to avoid affecting the display
    const clone = paper.cloneNode(true);
    clone.id = 'pdf-generation-clone';
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.transform = 'none';
    clone.style.width = '';
    clone.style.height = '';
    clone.style.padding = '';
    clone.style.overflow = 'visible';
    document.body.appendChild(clone);
    
    // Set up PDF
    const pdf = new window.jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: paperSize.toLowerCase()
    });
    
    // Calculate dimensions based on paper size
    let width, height;
    switch(paperSize) {
        case 'A4':
            width = 8.27;
            height = 11.69;
            break;
        case 'LETTER':
            width = 8.5;
            height = 11;
            break;
        case 'A5':
            width = 5.83;
            height = 8.27;
            break;
        default:
            width = 8.27;
            height = 11.69;
    }
    
    // Use html2canvas with proper settings
    html2canvas(clone, {
        scale: 3, // High resolution for better quality
        logging: false,
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        width: width * 96, // Convert inches to pixels (96 DPI)
        height: height * 96,
        windowWidth: width * 96,
        windowHeight: height * 96
    }).then(canvas => {
        // Remove the clone
        document.body.removeChild(clone);
        
        // Calculate image dimensions in PDF units (inches)
        const imgWidth = width;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Add image to PDF
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        // Download the PDF
        const invoiceNumber = $('#invoiceNumber').val() || 'invoice_' + new Date().toISOString().slice(0, 10);
        pdf.save(`${invoiceNumber}.pdf`);
        showToast("PDF downloaded successfully");
    }).catch(err => {
        // Clean up clone if error occurs
        if (document.getElementById('pdf-generation-clone')) {
            document.body.removeChild(clone);
        }
        console.error("PDF generation error:", err);
        showToast("Failed to generate PDF", false);
    });
}


// Download as Image
// function downloadAsImage() {
//     showToast("Generating image...");
    
//     const paper = document.getElementById('invoice-paper');
//     const container = document.getElementById('invoice-preview-container');
    
//     // Store original styles
//     const originalStyles = {
//         transform: paper.style.transform,
//         transformOrigin: paper.style.transformOrigin,
//         width: paper.style.width,
//         height: paper.style.height,
//         overflow: paper.style.overflow
//     };
    
//     // Remove any scaling/transformations
//     paper.style.transform = 'none';
//     paper.style.transformOrigin = 'top left';
//     paper.style.overflow = 'visible';
    
//     // Get natural dimensions based on paper size
//     const paperSize = $('#paperSizeSelect').val().toLowerCase();
//     let width, height;
    
//     switch(paperSize) {
//         case 'a4':
//             width = 8.27 * 96; // Convert inches to pixels (96 DPI)
//             height = 11.69 * 96;
//             break;
//         case 'letter':
//             width = 8.5 * 96;
//             height = 11 * 96;
//             break;
//         case 'a5':
//             width = 5.83 * 96;
//             height = 8.27 * 96;
//             break;
//         default:
//             width = 8.27 * 96;
//             height = 11.69 * 96;
//     }
    
//     // Temporarily set exact dimensions
//     paper.style.width = `${width}px`;
//     paper.style.height = `${height}px`;
    
//     // Use html2canvas with proper settings
//     html2canvas(paper, {
//         scale: 1, // No additional scaling
//         logging: true,
//         useCORS: true,
//         allowTaint: true,
//         scrollX: 0,
//         scrollY: 0,
//         width: width,
//         height: height,
//         windowWidth: width,
//         windowHeight: height
//     }).then(canvas => {
//         // Restore original styles
//         Object.keys(originalStyles).forEach(key => {
//             paper.style[key] = originalStyles[key];
//         });
        
//         // Create download link
//         const link = document.createElement('a');
//         const invoiceNumber = $('#invoiceNumber').val() || 'invoice';
//         link.download = `${invoiceNumber}.png`;
//         link.href = canvas.toDataURL('image/png');
        
//         // Trigger download
//         document.body.appendChild(link);
//         link.click();
//         document.body.removeChild(link);
        
//         showToast("Image downloaded successfully");
//     }).catch(err => {
//         console.error("Image generation error:", err);
//         showToast("Failed to generate image", false);
        
//         // Restore original styles if error occurs
//         Object.keys(originalStyles).forEach(key => {
//             paper.style[key] = originalStyles[key];
//         });
//     });
// }

function downloadAsImage() {
    showToast("Generating image...");
    
    // Create a temporary container
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '100%';
    tempContainer.style.height = '100%';
    document.body.appendChild(tempContainer);
    
    // Clone the invoice paper
    const paper = document.getElementById('invoice-paper');
    const clone = paper.cloneNode(true);
    clone.style.transform = 'none';
    clone.style.width = '';
    clone.style.height = '';
    tempContainer.appendChild(clone);
    
    // Get paper size
    const paperSize = $('#paperSizeSelect').val().toLowerCase();
    let width, height;
    
    switch(paperSize) {
        case 'a4':
            width = 8.27 * 96;
            height = 11.69 * 96;
            break;
        case 'letter':
            width = 8.5 * 96;
            height = 11 * 96;
            break;
        case 'a5':
            width = 5.83 * 96;
            height = 8.27 * 96;
            break;
        default:
            width = 8.27 * 96;
            height = 11.69 * 96;
    }
    
    // Set explicit dimensions
    clone.style.width = `${width}px`;
    clone.style.height = `${height}px`;
    
    // Capture the clone
    html2canvas(clone, {
        scale: 1,
        width: width,
        height: height,
        windowWidth: width,
        windowHeight: height
    }).then(canvas => {
        // Clean up
        document.body.removeChild(tempContainer);
        
        // Download
        const link = document.createElement('a');
        link.download = `${$('#invoiceNumber').val() || 'invoice'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        showToast("Image downloaded successfully");
    }).catch(err => {
        document.body.removeChild(tempContainer);
        console.error("Image generation error:", err);
        showToast("Failed to generate image", false);
    });
}
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
                background-color: rgba(255, 255, 255, 0.7);
                z-index: 9999;
                display: flex;
                justify-content: center;
                align-items: center;
            ">
                <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
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