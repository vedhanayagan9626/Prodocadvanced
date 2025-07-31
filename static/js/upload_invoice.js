// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

$(document).ready(function() {
    // Initialize Toast
    const toast = new bootstrap.Toast(document.getElementById('toast'));
    
    // Variables for drag and drop
    let isDragging = false;
    let startPos = { x: 0, y: 0 };
    let translate = { x: 0, y: 0 };
    let scale = 1;
    
    // File handling
    let currentFile = null;
    
    // Initialize DataTable
    const invoiceTable = $('#recentInvoiceTable').DataTable({
        columns: [
            { data: 'invoiceNo' },
            { data: 'from' },
            { data: 'to' },
            { data: 'gstNo' },
            { data: 'date' },
            { data: 'total' },
            { data: 'taxes' },
            { data: 'qty' },
            { 
                data: null,
                render: function(data, type, row) {
                    return '<button class="btn btn-sm btn-primary use-invoice">Use</button>';
                }
            }
        ]
    });
    
    // Form submission for processing
    $('#uploadForm').on('submit', function(e) {
        e.preventDefault();
        
        if (!currentFile) {
            showToast('Please select a file first', 'danger');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('mode', $('#modeSelect').val());
        
        $('#uploadSpinner').show();
        
        $.ajax({
            url: '/api/process-invoice',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                $('#uploadSpinner').hide();
                
                if (response.success) {
                    showToast('Invoice processed successfully!', 'success');
                    
                    // Populate the editor fields with extracted data
                    if (response.data) {
                        populateEditorFields(response.data);
                    }
                    
                    // Show the extracted data in the table
                    if (response.items && response.items.length > 0) {
                        populateItemsTable(response.items);
                    }
                } else {
                    showToast(response.message || 'Processing failed', 'danger');
                }
            },
            error: function() {
                $('#uploadSpinner').hide();
                showToast('Error processing invoice', 'danger');
            }
        });
    });
    
    // Populate editor fields with extracted data
    function populateEditorFields(data) {
        if (data.companyName) $('#company-name').val(data.companyName);
        if (data.companyAddress) $('#company-address').val(data.companyAddress);
        if (data.companyEmail) $('#company-email').val(data.companyEmail);
        if (data.invoiceNumber) $('#invoice-number').val(data.invoiceNumber);
        if (data.invoiceDate) $('#invoice-date').val(data.invoiceDate);
        if (data.dueDate) $('#due-date').val(data.dueDate);
        if (data.clientName) $('#client-name').val(data.clientName);
        if (data.billingAddress) $('#billing-address').val(data.billingAddress);
        
        // Update preview
        updateInvoicePreview();
    }
    
    // Populate items table with extracted items
    function populateItemsTable(items) {
        // Clear existing items
        $('#item-editor').empty();
        
        // Add each item to the editor
        items.forEach((item, index) => {
            addItemRow(item);
        });
        
        // Update preview
        updateInvoicePreview();
    }
    
    // Add item row to the editor
    function addItemRow(item = {}) {
        const itemId = Date.now();
        const itemRow = `
            <div class="item-row" data-id="${itemId}">
                <input type="text" class="item-name" placeholder="Item name" value="${item.name || ''}">
                <input type="text" class="item-desc" placeholder="Description" value="${item.description || ''}">
                <input type="number" class="item-qty" placeholder="Qty" value="${item.quantity || 1}" min="1">
                <input type="number" class="item-rate" placeholder="Rate" value="${item.rate || 0}" step="0.01" min="0">
                <button class="remove-item">×</button>
            </div>
        `;
        $('#item-editor').append(itemRow);
        
        // Add event listeners for changes
        $(`[data-id="${itemId}"] input`).on('change', updateInvoicePreview);
        $(`[data-id="${itemId}"] .remove-item`).on('click', function() {
            $(this).parent().remove();
            updateInvoicePreview();
        });
    }
    
    // Add new item button
    $('#add-item').on('click', function(e) {
        e.preventDefault();
        addItemRow();
    });
    
    // Update invoice preview with current data
    function updateInvoicePreview() {
        // Update header information
        $('#preview-company-name').text($('#company-name').val());
        $('#preview-company-address').text($('#company-address').val());
        $('#preview-company-email').text($('#company-email').val());
        $('#preview-invoice-title').text($('#invoice-title').val());
        $('#preview-invoice-number').text($('#invoice-number').val());
        $('#preview-invoice-date').text($('#invoice-date').val());
        $('#preview-client-name').text($('#client-name').val());
        $('#preview-billing-address').text($('#billing-address').val());
        $('#preview-invoice-notes').text($('#invoice-notes').val());
        
        // Update items table
        const itemsTable = $('#preview-items-table');
        itemsTable.empty();
        
        let subtotal = 0;
        
        $('.item-row').each(function() {
            const name = $(this).find('.item-name').val();
            const desc = $(this).find('.item-desc').val();
            const qty = parseFloat($(this).find('.item-qty').val()) || 0;
            const rate = parseFloat($(this).find('.item-rate').val()) || 0;
            const amount = qty * rate;
            
            subtotal += amount;
            
            const row = `
                <tr>
                    <td>${name}</td>
                    <td>${desc}</td>
                    <td>${qty}</td>
                    <td>$${rate.toFixed(2)}</td>
                    <td>$${amount.toFixed(2)}</td>
                </tr>
            `;
            itemsTable.append(row);
        });
        
        // Calculate tax and total (simplified for example)
        const taxRate = 0.1; // 10% tax
        const tax = subtotal * taxRate;
        const total = subtotal + tax;
        
        // Update totals
        $('#preview-subtotal').text('$' + subtotal.toFixed(2));
        $('#preview-tax').text('$' + tax.toFixed(2));
        $('#preview-total').text('$' + total.toFixed(2));
        $('#preview-total-amount').text('$' + total.toFixed(2));
    }
    
    // Show toast message
    function showToast(message, type = 'success') {
        const toastEl = $('#toast');
        toastEl.removeClass('text-bg-success text-bg-danger');
        toastEl.addClass(`text-bg-${type}`);
        toastEl.find('.toast-body').text(message);
        toast.show();
    }
    
    // File input change handler
    $('#fileInput').on('change', function(e) {
        if (e.target.files.length > 0) {
            currentFile = e.target.files[0];
            $('#currentFilename').text(currentFile.name);
            
            // Preview the file
            previewFile(currentFile);
        }
    });
    
    // Drag and drop handlers
    $('#previewWrapper').on('mousedown', function(e) {
        if ($('#previewImg').is(':visible') || $('#pdfViewer').is(':visible')) {
            isDragging = true;
            startPos = {
                x: e.clientX - translate.x,
                y: e.clientY - translate.y
            };
            $(this).css('cursor', 'grabbing');
        }
    });
    
    $(document).on('mousemove', function(e) {
        if (!isDragging) return;
        
        translate.x = e.clientX - startPos.x;
        translate.y = e.clientY - startPos.y;
        
        $('#previewImg, #pdfViewer').css({
            'transform': `translate(${translate.x}px, ${translate.y}px) scale(${scale})`
        });
    });
    
    $(document).on('mouseup', function() {
        isDragging = false;
        $('#previewWrapper').css('cursor', 'grab');
    });
    
    // Zoom handlers
    $(document).on('wheel', '#previewWrapper', function(e) {
        if ($('#previewImg').is(':visible') || $('#pdfViewer').is(':visible')) {
            e.preventDefault();
            const delta = -e.originalEvent.deltaY;
            
            if (delta > 0) {
                scale *= 1.1;
            } else {
                scale /= 1.1;
            }
            
            // Limit scale
            scale = Math.min(Math.max(0.1, scale), 4);
            
            $('#previewImg, #pdfViewer').css({
                'transform': `translate(${translate.x}px, ${translate.y}px) scale(${scale})`
            });
        }
    });
    
    // Preview the uploaded file
    function previewFile(file) {
        const reader = new FileReader();
        const wrapper = $('#previewWrapper');
        const img = $('#previewImg');
        const canvas = $('#pdfViewer');
        
        if (file.type.match('image.*')) {
            // Image file
            reader.onload = function(e) {
                img.attr('src', e.target.result).show();
                canvas.hide();
                
                // Reset transform
                resetImageTransform();
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            // PDF file
            img.hide();
            canvas.show();
            
            // Load PDF with PDF.js
            reader.onload = function(e) {
                const typedArray = new Uint8Array(e.target.result);
                
                pdfjsLib.getDocument(typedArray).promise.then(function(pdf) {
                    pdf.getPage(1).then(function(page) {
                        const viewport = page.getViewport({ scale: 1.0 });
                        const context = canvas[0].getContext('2d');
                        
                        // Set canvas dimensions
                        canvas[0].height = viewport.height;
                        canvas[0].width = viewport.width;
                        
                        // Render PDF page
                        page.render({
                            canvasContext: context,
                            viewport: viewport
                        });
                        
                        // Reset transform
                        resetImageTransform();
                    });
                });
            };
            reader.readAsArrayBuffer(file);
        } else {
            // Unsupported file type
            showToast('Unsupported file type', 'danger');
            img.hide();
            canvas.hide();
        }
    }
    
    // Reset image transform
    function resetImageTransform() {
        scale = 1;
        translate = { x: 0, y: 0 };
        $('#previewImg, #pdfViewer').css({
            'transform': 'translate(0, 0) scale(1)'
        });
    }
    
    // Initialize with one empty item
    addItemRow();
    
    // Set up change listeners for all editor fields
    $('.sidebar-section input, .sidebar-section textarea, .sidebar-section select').on('change', updateInvoicePreview);
    
    // Initialize preview
    updateInvoicePreview();
});

function initializeItemHandlers() {
    // Add item button
    $('#addItemBtn').off('click').on('click', handleAddItem);
    
    // Delete item button
    $('#itemsTableBody').off('click', '.delete-item').on('click', '.delete-item', function() {
        $(this).closest('tr').remove();
        calculateInvoiceTotals();
    });
    
    // Input changes
    $('#itemsTableBody').off('input').on('input', '.qty, .rate, .tax', function() {
        calculateRowTotal($(this).closest('tr'));
        calculateInvoiceTotals();
    });
}

// Then call it in renderExtractedInvoice after rendering items:
initializeItemHandlers();