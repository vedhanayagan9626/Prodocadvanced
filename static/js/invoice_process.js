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

// High-quality preview system for invoices
class HighQualityPreview {
    constructor() {
        this.state = {
            scale: 1,
            minScale: 0.1,
            maxScale: 5,
            panX: 0,
            panY: 0,
            isDragging: false,
            startX: 0,
            startY: 0,
            lastDistance: 0,
            element: null,
            wrapper: null,
            originalWidth: 0,
            originalHeight: 0
        };
        
        this.cleanup = null;
        this.devicePixelRatio = window.devicePixelRatio || 1;
    }

    // Initialize high-quality image preview
    initImagePreview(imgElement, wrapper) {
        return new Promise((resolve, reject) => {
            if (!imgElement || !wrapper) {
                reject(new Error('Invalid elements provided'));
                return;
            }

            this.state.element = imgElement;
            this.state.wrapper = wrapper;

            // Wait for image to load completely
            const handleImageLoad = () => {
                // Store original dimensions
                this.state.originalWidth = imgElement.naturalWidth;
                this.state.originalHeight = imgElement.naturalHeight;

                // Set high-quality rendering
                imgElement.style.imageRendering = 'crisp-edges';
                imgElement.style.imageRendering = '-webkit-optimize-contrast';
                imgElement.style.imageRendering = 'pixelated';
                imgElement.style.imageRendering = 'auto';
                
                // Reset any existing transforms
                imgElement.style.transform = 'none';
                imgElement.style.transformOrigin = '0 0';
                
                // Set initial size to natural dimensions for crisp display
                imgElement.style.width = `${this.state.originalWidth}px`;
                imgElement.style.height = `${this.state.originalHeight}px`;
                imgElement.style.maxWidth = 'none';
                imgElement.style.maxHeight = 'none';

                // Calculate initial fit-to-screen scale
                const wrapperRect = wrapper.getBoundingClientRect();
                const scaleX = (wrapperRect.width * 0.9) / this.state.originalWidth;
                const scaleY = (wrapperRect.height * 0.9) / this.state.originalHeight;
                const initialScale = Math.min(scaleX, scaleY, 1);

                // Set initial state
                this.state.scale = initialScale;
                this.centerElement(initialScale);
                
                // Setup event listeners
                this.setupEventListeners();
                
                resolve();
            };

            if (imgElement.complete && imgElement.naturalWidth > 0) {
                handleImageLoad();
            } else {
                imgElement.onload = handleImageLoad;
                imgElement.onerror = () => reject(new Error('Failed to load image'));
            }
        });
    }

    // Initialize high-quality PDF preview
    initPdfPreview(canvas, wrapper, pdfPage) {
        return new Promise((resolve, reject) => {
            try {
                this.state.element = canvas;
                this.state.wrapper = wrapper;

                // Calculate high-quality viewport
                const baseScale = 2.0; // Base scale for crisp rendering
                const viewport = pdfPage.getViewport({ scale: baseScale });
                
                // Account for device pixel ratio
                const outputScale = this.devicePixelRatio;
                const finalScale = baseScale * outputScale;
                
                // Set canvas dimensions
                canvas.width = Math.floor(viewport.width * outputScale);
                canvas.height = Math.floor(viewport.height * outputScale);
                
                // Set display size (CSS pixels)
                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;
                
                // Store original dimensions
                this.state.originalWidth = viewport.width;
                this.state.originalHeight = viewport.height;

                // Get context and scale for high DPI
                const context = canvas.getContext('2d');
                context.scale(outputScale, outputScale);

                // Render at high quality
                const renderContext = {
                    canvasContext: context,
                    viewport: pdfPage.getViewport({ scale: baseScale })
                };

                pdfPage.render(renderContext).promise.then(() => {
                    // Set up crisp rendering
                    canvas.style.imageRendering = 'crisp-edges';
                    canvas.style.transformOrigin = '0 0';
                    canvas.style.transform = 'none';

                    // Calculate initial fit-to-screen scale
                    const wrapperRect = wrapper.getBoundingClientRect();
                    const scaleX = (wrapperRect.width * 0.9) / this.state.originalWidth;
                    const scaleY = (wrapperRect.height * 0.9) / this.state.originalHeight;
                    const initialScale = Math.min(scaleX, scaleY, 1);

                    // Set initial state
                    this.state.scale = initialScale;
                    this.centerElement(initialScale);
                    
                    // Setup event listeners
                    this.setupEventListeners();
                    
                    resolve();
                }).catch(reject);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    // Center element in wrapper
    centerElement(scale = this.state.scale) {
        const wrapperRect = this.state.wrapper.getBoundingClientRect();
        const elementWidth = this.state.originalWidth * scale;
        const elementHeight = this.state.originalHeight * scale;
        
        this.state.panX = (wrapperRect.width - elementWidth) / 2;
        this.state.panY = (wrapperRect.height - elementHeight) / 2;
        
        this.applyTransform();
    }

    // Apply transform with bounds checking
    applyTransform() {
        const { element, wrapper, scale, panX, panY, originalWidth, originalHeight } = this.state;
        
        if (!element || !wrapper) return;

        const wrapperRect = wrapper.getBoundingClientRect();
        const scaledWidth = originalWidth * scale;
        const scaledHeight = originalHeight * scale;

        // Calculate bounds
        let newPanX = panX;
        let newPanY = panY;

        // If scaled content is larger than wrapper, allow panning within bounds
        if (scaledWidth > wrapperRect.width) {
            const maxPanX = 0;
            const minPanX = wrapperRect.width - scaledWidth;
            newPanX = Math.max(minPanX, Math.min(maxPanX, panX));
        } else {
            // Center if smaller than wrapper
            newPanX = (wrapperRect.width - scaledWidth) / 2;
        }

        if (scaledHeight > wrapperRect.height) {
            const maxPanY = 0;
            const minPanY = wrapperRect.height - scaledHeight;
            newPanY = Math.max(minPanY, Math.min(maxPanY, panY));
        } else {
            // Center if smaller than wrapper
            newPanY = (wrapperRect.height - scaledHeight) / 2;
        }

        // Update state
        this.state.panX = newPanX;
        this.state.panY = newPanY;

        // Apply transform using matrix for better performance
        element.style.transform = `translate(${newPanX}px, ${newPanY}px) scale(${scale})`;
    }

    // Setup all event listeners
    setupEventListeners() {
        const { element } = this.state;
        
        // Mouse events
        element.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        element.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        element.addEventListener('dblclick', this.handleDoubleClick.bind(this));

        // Touch events
        element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        element.addEventListener('touchend', this.handleTouchEnd.bind(this));

        // Prevent context menu
        element.addEventListener('contextmenu', (e) => e.preventDefault());

        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));

        // Set cursor
        element.style.cursor = 'grab';

        // Store cleanup function
        this.cleanup = () => {
            element.removeEventListener('mousedown', this.handleMouseDown.bind(this));
            document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
            document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
            element.removeEventListener('wheel', this.handleWheel.bind(this));
            element.removeEventListener('dblclick', this.handleDoubleClick.bind(this));
            element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
            element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
            element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
            element.removeEventListener('contextmenu', (e) => e.preventDefault());
            window.removeEventListener('resize', this.handleResize.bind(this));
        };
    }

    // Mouse event handlers
    handleMouseDown(e) {
        if (e.button !== 0) return; // Only left mouse button
        e.preventDefault();
        
        this.state.isDragging = true;
        this.state.startX = e.clientX - this.state.panX;
        this.state.startY = e.clientY - this.state.panY;
        this.state.element.style.cursor = 'grabbing';
    }

    handleMouseMove(e) {
        if (!this.state.isDragging) return;
        
        this.state.panX = e.clientX - this.state.startX;
        this.state.panY = e.clientY - this.state.startY;
        this.applyTransform();
    }

    handleMouseUp() {
        this.state.isDragging = false;
        this.state.element.style.cursor = 'grab';
    }

    handleWheel(e) {
        e.preventDefault();
        
        const rect = this.state.wrapper.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate zoom
        const zoomIntensity = 0.1;
        const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        const newScale = Math.min(
            this.state.maxScale, 
            Math.max(this.state.minScale, this.state.scale + delta)
        );
        
        // Zoom toward mouse position
        const scaleRatio = newScale / this.state.scale;
        this.state.panX = mouseX - (mouseX - this.state.panX) * scaleRatio;
        this.state.panY = mouseY - (mouseY - this.state.panY) * scaleRatio;
        this.state.scale = newScale;
        
        this.applyTransform();
    }

    handleDoubleClick() {
        // Fit to screen
        const wrapperRect = this.state.wrapper.getBoundingClientRect();
        const scaleX = (wrapperRect.width * 0.9) / this.state.originalWidth;
        const scaleY = (wrapperRect.height * 0.9) / this.state.originalHeight;
        const fitScale = Math.min(scaleX, scaleY, 1);
        
        this.state.scale = fitScale;
        this.centerElement(fitScale);
    }

    // Touch event handlers
    handleTouchStart(e) {
        e.preventDefault();
        
        if (e.touches.length === 1) {
            // Single touch - start dragging
            this.state.isDragging = true;
            this.state.startX = e.touches[0].clientX - this.state.panX;
            this.state.startY = e.touches[0].clientY - this.state.panY;
        } else if (e.touches.length === 2) {
            // Two touches - prepare for pinch zoom
            this.state.isDragging = false;
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            this.state.lastDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 1 && this.state.isDragging) {
            // Single touch drag
            this.state.panX = e.touches[0].clientX - this.state.startX;
            this.state.panY = e.touches[0].clientY - this.state.startY;
            this.applyTransform();
        } else if (e.touches.length === 2) {
            // Pinch zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            if (this.state.lastDistance > 0) {
                const scaleChange = currentDistance / this.state.lastDistance;
                const newScale = Math.min(
                    this.state.maxScale,
                    Math.max(this.state.minScale, this.state.scale * scaleChange)
                );
                
                // Calculate center between touches
                const rect = this.state.wrapper.getBoundingClientRect();
                const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
                const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
                
                // Zoom toward center
                const scaleRatio = newScale / this.state.scale;
                this.state.panX = centerX - (centerX - this.state.panX) * scaleRatio;
                this.state.panY = centerY - (centerY - this.state.panY) * scaleRatio;
                this.state.scale = newScale;
                
                this.applyTransform();
            }
            
            this.state.lastDistance = currentDistance;
        }
    }

    handleTouchEnd() {
        this.state.isDragging = false;
        this.state.lastDistance = 0;
    }

    handleResize() {
        // Recalculate and maintain current view on resize
        setTimeout(() => {
            this.applyTransform();
        }, 100);
    }

    // Public methods
    zoomIn() {
        const newScale = Math.min(this.state.maxScale, this.state.scale + 0.2);
        this.zoomToCenter(newScale);
    }

    zoomOut() {
        const newScale = Math.max(this.state.minScale, this.state.scale - 0.2);
        this.zoomToCenter(newScale);
    }

    zoomToCenter(scale) {
        const rect = this.state.wrapper.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const scaleRatio = scale / this.state.scale;
        this.state.panX = centerX - (centerX - this.state.panX) * scaleRatio;
        this.state.panY = centerY - (centerY - this.state.panY) * scaleRatio;
        this.state.scale = scale;
        
        this.applyTransform();
    }

    fitToScreen() {
        const wrapperRect = this.state.wrapper.getBoundingClientRect();
        const scaleX = (wrapperRect.width * 0.9) / this.state.originalWidth;
        const scaleY = (wrapperRect.height * 0.9) / this.state.originalHeight;
        const fitScale = Math.min(scaleX, scaleY, 1);
        
        this.state.scale = fitScale;
        this.centerElement(fitScale);
    }

    actualSize() {
        this.state.scale = 1;
        this.centerElement(1);
    }

    destroy() {
        if (this.cleanup) {
            this.cleanup();
        }
    }
}

// Make essential functions globally available
window.displayFilePreview = displayFilePreview;
window.processFile = processFile;
window.showToast = showToast;

// Main initialization
$(document).ready(function() {
    initializeApplication();
    setupPreviewControls();
    initializeItemHandlers();
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
    
    // Initialize template selection
    $('#templateSelect').change(function() {
        currentTemplate = $(this).val();
        
        // Force re-render with the new template
        if (lastExtractedData) {
            renderInvoicePreview(lastExtractedData, currentTemplate);
        } else {
            renderInvoicePreviewFromForm();
        }
        
        // Update the paper element's class
        const container = document.getElementById('invoice-preview-container');
        if (container && !document.getElementById('invoice-paper')) {
            const paper = document.createElement('div');
            paper.id = 'invoice-paper';
            paper.className = 'invoice-paper a4'; // Default size
            container.appendChild(paper);
        }
    });

    // Initialize download buttons
    $('#downloadPdfBtn').on('click', function(e) {
        e.preventDefault();
        downloadAsPDF();
    });
    
    $('#downloadImageBtn').on('click', function(e) {
        e.preventDefault();
        downloadAsImage();
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
        // Clean up previous preview
        if (currentPreview) {
            currentPreview.destroy();
        }

        const response = await fetch(`/api/v1/get-file?filename=${encodeURIComponent(filename)}`);
        if (!response.ok) throw new Error('Failed to load PDF');
        
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        const pdf = await pdfjsLib.getDocument(objectUrl).promise;
        pdfDoc = pdf;
        
        const page = await pdf.getPage(1);
        
        pdfViewer.style.display = 'block';
        
        // Initialize high-quality preview
        currentPreview = new HighQualityPreview();
        await currentPreview.initPdfPreview(pdfViewer, wrapper, page);
        
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
        // Clean up previous preview
        if (currentPreview) {
            currentPreview.destroy();
        }

        const response = await fetch(`/api/v1/get-file?filename=${encodeURIComponent(filename)}`);
        if (!response.ok) throw new Error('Failed to load image');
        
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        previewImg.src = objectUrl;
        previewImg.style.display = 'block';
        
        // Initialize high-quality preview
        currentPreview = new HighQualityPreview();
        await currentPreview.initImagePreview(previewImg, wrapper);
        
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

function renderInvoicePreview(data,currentTemplate) {
    // Check if templates are loaded
    if (!window.invoiceTemplates) {
        if (retryCount++ < MAX_RETRIES) {
                setTimeout(() => renderInvoicePreview(data), 100);
            } else {
                showToast("Failed to load templates", false);
            }
        return;
    }

    // Rest existing renderInvoicePreview code...
    const template = window.invoiceTemplates[currentTemplate] || window.invoiceTemplates.default

    const previewContainer = document.getElementById('invoice-preview-container');
    if (!previewContainer) {
        console.error("Preview container not found");
        return;
    }

    // Create invoice-paper element if it doesn't exist
    let paper = document.getElementById('invoice-paper');
    if (!paper) {
        paper = document.createElement('div');
        paper.id = 'invoice-paper';
        paper.className = 'invoice-paper';
        previewContainer.appendChild(paper);
    }

    // Prepare the data structure expected by templates
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

    // Clear previous content and apply template classes
    paper.innerHTML = '';
    paper.className = `invoice-paper ${currentTemplate}-template`;
    
    // Apply paper size class
    const paperSize = $('#paperSizeSelect').val().toLowerCase();
    paper.classList.add(paperSize);

    // Apply the template HTML
    paper.innerHTML = template.html(templateData);

    // Apply template-specific styles
    const styleElement = document.getElementById('dynamic-template-styles');
    if (styleElement) {
        styleElement.remove();
    }
    document.head.insertAdjacentHTML('beforeend', `<style id="dynamic-template-styles">${template.styles}</style>`);

    // Apply dynamic padding
    paper.style.padding = `${$('#topMargin').val()}in`;

    // Calculate and apply scaling
    setTimeout(() => {
        const scale = calculateOptimalScale(paper);
        if (scale) {
            paper.style.transform = `scale(${scale})`;
        }
        updatePreviewColors();
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
    if (!paperElement) {
        console.warn('Paper element not provided for scaling');
        return 1;
    }

    const container = document.getElementById('invoice-preview-container');
    if (!container) {
        console.warn('Preview container not found');
        return 1;
    }

    // Force layout calculation if needed
    const paperWidth = paperElement.offsetWidth || paperElement.getBoundingClientRect().width;
    const paperHeight = paperElement.offsetHeight || paperElement.getBoundingClientRect().height;
    
    if (!paperWidth || !paperHeight) {
        console.warn('Could not get paper dimensions');
        return 1;
    }

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const widthScale = (containerWidth * 0.9) / paperWidth;
    const heightScale = (containerHeight * 0.9) / paperHeight;

    return Math.min(widthScale, heightScale, 1);
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
        headerColor: $('#headerColor').val(),
        textColor: $('#textColor').val(),
        accentColor: $('#accentColor').val(),
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
    
    const template = invoiceTemplates[currentTemplate] || invoiceTemplates.default;
    const templateData = getCurrentFormData();
    templateData.itemsHtml = generateItemsHtml(templateData.items);
    
    // Create a temporary div for PDF generation
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = template.html(templateData);
    
    // Set up PDF
    const pdf = new window.jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: $('#paperSizeSelect').val().toLowerCase()
    });
    
    // Use html2canvas with proper settings
    html2canvas(tempDiv, {
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`${$('#invoiceNumber').val() || 'invoice'}.pdf`);
        showToast("PDF downloaded successfully");
    }).catch(err => {
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


function downloadAsImage() {
    showToast("Generating image...");
    
    // Create a temporary container with white background
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '100%';
    tempContainer.style.height = '100%';
    tempContainer.style.backgroundColor = 'white';
    document.body.appendChild(tempContainer);
    
    // Clone the invoice paper and force white background everywhere
    const paper = document.getElementById('invoice-paper');
    const clone = paper.cloneNode(true);
    
    // Reset all styles that might affect background
    clone.style.transform = 'none';
    clone.style.width = '';
    clone.style.height = '';
    clone.style.padding = '';
    clone.style.margin = '';
    clone.style.backgroundColor = 'white';
    clone.style.background = 'white';
    
    // Apply white background to all child elements
    $(clone).find('*').each(function() {
        $(this).css({
            'background-color': 'white',
            'background': 'white',
            'color': '#333' // Ensure text remains dark
        });
    });
    
    tempContainer.appendChild(clone);
    
    // Get paper size
    const paperSize = $('#paperSizeSelect').val().toLowerCase();
    let width, height;
    
    switch(paperSize) {
        case 'a4':
            width = 8.27 * 96; // Convert inches to pixels (96 DPI)
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
    
    // Capture the clone with proper settings
    html2canvas(clone, {
        scale: 2, // Higher scale for better quality
        width: width,
        height: height,
        windowWidth: width,
        windowHeight: height,
        backgroundColor: 'white',
        logging: true, // Helpful for debugging
        useCORS: true,
        allowTaint: true
    }).then(canvas => {
        // Create a final canvas to ensure pure white background
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = canvas.width;
        finalCanvas.height = canvas.height;
        const ctx = finalCanvas.getContext('2d');
        
        // Fill with white background first
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        
        // Draw the captured content
        ctx.drawImage(canvas, 0, 0);
        
        // Download
        const link = document.createElement('a');
        const invoiceNumber = $('#invoiceNumber').val() || 'invoice';
        link.download = `${invoiceNumber}.png`;
        link.href = finalCanvas.toDataURL('image/png');
        link.click();
        
        // Clean up
        document.body.removeChild(tempContainer);
        showToast("Image downloaded successfully");
    }).catch(err => {
        console.error("Image generation error:", err);
        document.body.removeChild(tempContainer);
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