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

// Global variables for invoice data and items
let invoiceData = {};
let invoiceItems = [];

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
  handleUrlParameters();
});

function initializeApplication() {
  // Initialize jsPDF correctly
  window.jsPDF = window.jspdf.jsPDF;
  
  // Initialize event handlers
  $('#uploadForm').on('submit', handleFormSubmit);
  $('#saveInvoiceBtn').on('click', saveInvoice);
  
  // Initialize items table
  initializeItemsTable();
  
  // Add event listeners for dynamic calculations
  addCalculationEventListeners();
  
  // Window resize handler
  window.addEventListener('resize', function() {
    if (currentPreview) {
      currentPreview.fitToScreen();
    }
  });
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

// Initialize the items table
function initializeItemsTable() {
  // Create a simple table for items if it doesn't exist
  const itemsContainer = document.querySelector('.invoice-editor-container');
  if (!document.getElementById('itemsTableContainer')) {
    const itemsTableHTML = `
      <div id="itemsTableContainer" class="invoice-field-group" style="grid-column: 1 / -1; margin-top: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <label style="font-weight: bold; font-size: 1.1rem;">Line Items</label>
          <button type="button" class="btn btn-sm btn-primary" id="addItemBtn">
            <i class="fas fa-plus"></i> Add Item
          </button>
        </div>
        <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
          <table id="itemsTable" class="table table-sm table-bordered" style="table-layout: fixed; width: 100%;">
            <thead class="table-light" style="position: sticky; top: 0; z-index: 1;">
              <tr>
                <th style="width: 20%;">Item Name</th>
                <th style="width: 10%;">SKU</th>
                <th style="width: 10%;">HSN/SAC</th>
                <th style="width: 8%;">Quantity</th>
                <th style="width: 10%;">Rate</th>
                <th style="width: 8%;">Tax %</th>
                <th style="width: 10%;">Tax Amount</th>
                <th style="width: 12%;">Total</th>
                <th style="width: 7%;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <!-- Items will be added dynamically -->
            </tbody>
            <tfoot>
              <tr>
                <td colspan="6" style="text-align: right; font-weight: bold;">Subtotal:</td>
                <td id="itemsTaxTotal" style="font-weight: bold;">0.00</td>
                <td id="itemsSubtotal" style="font-weight: bold;">0.00</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
    itemsContainer.insertAdjacentHTML('beforeend', itemsTableHTML);
    
    // Add event listener for add item button
    document.getElementById('addItemBtn').addEventListener('click', addNewItem);
  }
}

// Add event listeners for dynamic calculations
function addCalculationEventListeners() {
  // Listen for changes in all form fields for live editing
  document.addEventListener('input', function(e) {
    // Fields that affect grand total
    if (e.target.matches('#tdsAmount, #tcsAmount, #entityDiscountAmount')) {
      calculateGrandTotal();
    }
  });
  
  // Also listen for changes in select elements
  document.addEventListener('change', function(e) {
    if (e.target.matches('#isInclusiveTax')) {
      calculateAllTotals();
    }
  });
}

// Process the response from the backend and populate the form
function processExtractionResult(result) {
  try {
    // Store the extracted data globally
    invoiceData = result.invoice_data || {};
    invoiceItems = result.items || [];
    
    // Populate invoice data fields
    populateInvoiceFields(invoiceData);
    
    // Populate items table
    populateItemsTable(invoiceItems);
    
    // Calculate totals
    calculateAllTotals();
    
    showToast("Invoice data loaded successfully");
  } catch (error) {
    console.error("Error processing extraction result:", error);
    showToast("Failed to process invoice data", false);
  }
}

// Populate invoice fields with extracted data
function populateInvoiceFields(data) {
  // Map field IDs to data keys (customize based on your field names)
  const fieldMapping = {
    'billDate': 'Bill Date',
    'billNumber': 'Bill Number',
    'purchaseOrder': 'PurchaseOrder',
    'billStatus': 'Bill Status',
    'sourceOfSupply': 'Source of Supply',
    'destinationOfSupply': 'Destination of Supply',
    'gstTreatment': 'GST Treatment',
    'gstin': 'GST Identification Number (GSTIN)',
    'isInclusiveTax': 'Is Inclusive Tax',
    'tdsPercentage': 'TDS Percentage',
    'tdsAmount': 'TDS Amount',
    'tdsSectionCode': 'TDS Section Code',
    'tdsName': 'TDS Name',
    'vendorName': 'Vendor Name',
    'dueDate': 'Due Date',
    'currencyCode': 'Currency Code',
    'exchangeRate': 'Exchange Rate',
    'attachmentId': 'Attachment ID',
    'attachmentPreviewId': 'Attachment Preview ID',
    'attachmentName': 'Attachment Name',
    'attachmentType': 'Attachment Type',
    'attachmentSize': 'Attachment Size',
    'subTotal': 'SubTotal',
    'total': 'Total',
    'balance': 'Balance',
    'vendorNotes': 'Vendor Notes',
    'termsConditions': 'Terms & Conditions',
    'paymentTerms': 'Payment Terms',
    'paymentTermsLabel': 'Payment Terms Label',
    'isBillable': 'Is Billable',
    'customerName': 'Customer Name',
    'projectName': 'Project Name',
    'purchaseOrderNumber': 'Purchase Order Number',
    'isDiscountBeforeTax': 'Is Discount Before Tax',
    'entityDiscountAmount': 'Entity Discount Amount',
    'discountAccount': 'Discount Account',
    'isLandedCost': 'Is Landed Cost',
    'warehouseName': 'Warehouse Name',
    'branchName': 'Branch Name',
    'cfTransporteName': 'CF.Transporte_Name',
    'tcsTaxName': 'TCS Tax Name',
    'tcsPercentage': 'TCS Percentage',
    'natureOfCollection': 'Nature Of Collection',
    'tcsAmount': 'TCS Amount',
    'supplyType': 'Supply Type',
    'itcEligibility': 'ITC Eligibility'
  };
  
  // Populate each field
  for (const [fieldId, dataKey] of Object.entries(fieldMapping)) {
    const field = document.getElementById(fieldId);
    if (field && data[dataKey] !== undefined) {
      field.value = data[dataKey];
    }
  }
  
  // Handle special cases (like select elements)
  const isInclusiveTax = document.getElementById('isInclusiveTax');
  if (isInclusiveTax && data['Is Inclusive Tax']) {
    isInclusiveTax.value = data['Is Inclusive Tax'].toString().toLowerCase() === 'true' ? 'yes' : 'no';
  }
}

// Populate items table with extracted items
function populateItemsTable(items) {
  const tbody = document.querySelector('#itemsTable tbody');
  tbody.innerHTML = ''; // Clear existing items
  
  items.forEach((item, index) => {
    const row = document.createElement('tr');
    row.dataset.index = index;
    row.innerHTML = `
      <td><input type="text" class="form-control form-control-sm" value="${item['Item Name'] || ''}" data-field="Item Name"></td>
      <td><input type="text" class="form-control form-control-sm" value="${item.SKU || ''}" data-field="SKU"></td>
      <td><input type="text" class="form-control form-control-sm" value="${item['HSN/SAC'] || ''}" data-field="HSN/SAC"></td>
      <td><input type="number" class="form-control form-control-sm" value="${item.Quantity || 0}" step="0.001" data-field="Quantity"></td>
      <td><input type="number" class="form-control form-control-sm" value="${item.Rate || 0}" step="0.01" data-field="Rate"></td>
      <td><input type="number" class="form-control form-control-sm" value="${item['Tax Percentage'] || 0}" step="0.01" data-field="Tax Percentage"></td>
      <td><input type="number" class="form-control form-control-sm" value="${item['Tax Amount'] || 0}" step="0.01" data-field="Tax Amount" readonly></td>
      <td><input type="number" class="form-control form-control-sm" value="${item['Item Total'] || 0}" step="0.01" data-field="Item Total" readonly></td>
      <td>
        <button type="button" class="btn btn-sm btn-danger delete-item">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  // Add event listeners for delete buttons
  document.querySelectorAll('.delete-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      const index = parseInt(row.dataset.index);
      deleteItem(index);
    });
  });
  
  // Add event listeners for input fields in the table
  document.querySelectorAll('#itemsTable input').forEach(input => {
    input.addEventListener('input', function() {
      const row = this.closest('tr');
      const index = parseInt(row.dataset.index);
      updateItemFromTable(index, this.dataset.field, this.value);
    });
  });
  
  // Calculate initial totals
  calculateAllTotals();
}

// Update item from table input
function updateItemFromTable(index, field, value) {
  if (invoiceItems[index]) {
    // Convert to number if the field is numeric
    if (['Quantity', 'Rate', 'Tax Percentage', 'Tax Amount', 'Item Total'].includes(field)) {
      value = parseFloat(value) || 0;
    }
    
    invoiceItems[index][field] = value;
    
    // Recalculate if quantity, rate, or tax percentage changes
    if (['Quantity', 'Rate', 'Tax Percentage'].includes(field)) {
      calculateItemTotalFromTable(index);
    }
    
    // Recalculate all totals
    calculateAllTotals();
  }
}

// Calculate item total based on table inputs
function calculateItemTotalFromTable(index) {
  const row = document.querySelector(`#itemsTable tr[data-index="${index}"]`);
  if (!row) return;
  
  const quantityInput = row.querySelector('input[data-field="Quantity"]');
  const rateInput = row.querySelector('input[data-field="Rate"]');
  const taxPercentageInput = row.querySelector('input[data-field="Tax Percentage"]');
  const taxAmountInput = row.querySelector('input[data-field="Tax Amount"]');
  const itemTotalInput = row.querySelector('input[data-field="Item Total"]');
  
  const quantity = parseFloat(quantityInput.value) || 0;
  const rate = parseFloat(rateInput.value) || 0;
  const taxPercentage = parseFloat(taxPercentageInput.value) || 0;
  const isInclusiveTax = document.getElementById('isInclusiveTax').value === 'yes';
  
  let itemTotal, taxAmount;
  
  if (isInclusiveTax) {
    // Tax is included in the rate
    const taxableAmount = rate / (1 + taxPercentage / 100);
    taxAmount = taxableAmount * (taxPercentage / 100);
    itemTotal = quantity * rate;
  } else {
    // Tax is added to the base amount
    const baseAmount = quantity * rate;
    taxAmount = baseAmount * (taxPercentage / 100);
    itemTotal = baseAmount + taxAmount;
  }
  
  // Update fields
  taxAmountInput.value = taxAmount.toFixed(2);
  itemTotalInput.value = itemTotal.toFixed(2);
  
  // Update the data model
  if (invoiceItems[index]) {
    invoiceItems[index]['Tax Amount'] = taxAmount;
    invoiceItems[index]['Item Total'] = itemTotal;
  }
}

// Add a new empty item
function addNewItem() {
  const newItem = {
    'Item Name': 'New Item',
    'SKU': '',
    'HSN/SAC': '',
    'Quantity': 1,
    'Rate': 0,
    'Tax Percentage': 0,
    'Tax Amount': 0,
    'Item Total': 0
  };
  
  invoiceItems.push(newItem);
  
  // Add to table
  const tbody = document.querySelector('#itemsTable tbody');
  const row = document.createElement('tr');
  const index = invoiceItems.length - 1;
  row.dataset.index = index;
  
  row.innerHTML = `
    <td><input type="text" class="form-control form-control-sm" value="${newItem['Item Name']}" data-field="Item Name"></td>
    <td><input type="text" class="form-control form-control-sm" value="${newItem.SKU}" data-field="SKU"></td>
    <td><input type="text" class="form-control form-control-sm" value="${newItem['HSN/SAC']}" data-field="HSN/SAC"></td>
    <td><input type="number" class="form-control form-control-sm" value="${newItem.Quantity}" step="0.001" data-field="Quantity"></td>
    <td><input type="number" class="form-control form-control-sm" value="${newItem.Rate}" step="0.01" data-field="Rate"></td>
    <td><input type="number" class="form-control form-control-sm" value="${newItem['Tax Percentage']}" step="0.01" data-field="Tax Percentage"></td>
    <td><input type="number" class="form-control form-control-sm" value="${newItem['Tax Amount']}" step="0.01" data-field="Tax Amount" readonly></td>
    <td><input type="number" class="form-control form-control-sm" value="${newItem['Item Total']}" step="0.01" data-field="Item Total" readonly></td>
    <td>
      <button type="button" class="btn btn-sm btn-danger delete-item">
        <i class="fas fa-trash"></i>
      </button>
    </td>
  `;
  tbody.appendChild(row);
  
  // Add event listeners for the new row
  row.querySelector('.delete-item').addEventListener('click', () => deleteItem(index));
  row.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', function() {
      updateItemFromTable(index, this.dataset.field, this.value);
    });
  });
  
  // Calculate the new item total
  calculateItemTotalFromTable(index);
  
  // Recalculate totals
  calculateAllTotals();
}

// Delete an item
function deleteItem(index) {
  if (confirm("Are you sure you want to delete this item?")) {
    invoiceItems.splice(index, 1);
    
    // Refresh the table
    populateItemsTable(invoiceItems);
    
    // Recalculate totals
    calculateAllTotals();
    
    showToast("Item deleted successfully");
  }
}

// Calculate all totals (subtotal, taxes, grand total)
function calculateAllTotals() {
  let subTotal = 0;
  let totalTax = 0;
  
  // Calculate subtotal and total tax from items
  invoiceItems.forEach(item => {
    const quantity = parseFloat(item.Quantity) || 0;
    const rate = parseFloat(item.Rate) || 0;
    const taxPercentage = parseFloat(item['Tax Percentage']) || 0;
    const isInclusiveTax = document.getElementById('isInclusiveTax').value === 'yes';
    
    if (isInclusiveTax) {
      // Tax is included in the rate
      const taxableAmount = rate / (1 + taxPercentage / 100);
      const itemTax = taxableAmount * (taxPercentage / 100);
      subTotal += quantity * taxableAmount;
      totalTax += quantity * itemTax;
    } else {
      // Tax is added to the base amount
      const baseAmount = quantity * rate;
      const itemTax = baseAmount * (taxPercentage / 100);
      subTotal += baseAmount;
      totalTax += itemTax;
    }
  });
  
  // Update items subtotal and tax total in table footer
  document.getElementById('itemsSubtotal').textContent = subTotal.toFixed(2);
  document.getElementById('itemsTaxTotal').textContent = totalTax.toFixed(2);
  
  // Get other amounts
  const tdsAmount = parseFloat(document.getElementById('tdsAmount').value) || 0;
  const tcsAmount = parseFloat(document.getElementById('tcsAmount').value) || 0;
  const entityDiscountAmount = parseFloat(document.getElementById('entityDiscountAmount').value) || 0;
  
  // Calculate grand total
  const grandTotal = subTotal + totalTax - tdsAmount - tcsAmount - entityDiscountAmount;
  
  // Update fields (these values are derived from the items table calculations)
  document.getElementById('subTotal').value = subTotal.toFixed(2);
  document.getElementById('total').value = grandTotal.toFixed(2);
  document.getElementById('balance').value = grandTotal.toFixed(2);
  
  // Update tax amount field if it exists
  const taxAmountField = document.getElementById('taxAmount');
  if (taxAmountField) {
    taxAmountField.value = totalTax.toFixed(2);
  }
}

// Calculate grand total based on adjustments
function calculateGrandTotal() {
  // Get values from items table footer
  const subTotal = parseFloat(document.getElementById('itemsSubtotal').textContent) || 0;
  const totalTax = parseFloat(document.getElementById('itemsTaxTotal').textContent) || 0;
  
  // Get adjustment values
  const tdsAmount = parseFloat(document.getElementById('tdsAmount').value) || 0;
  const tcsAmount = parseFloat(document.getElementById('tcsAmount').value) || 0;
  const entityDiscountAmount = parseFloat(document.getElementById('entityDiscountAmount').value) || 0;
  
  // Calculate grand total
  const grandTotal = subTotal + totalTax - tdsAmount - tcsAmount - entityDiscountAmount;
  
  // Update fields
  document.getElementById('total').value = grandTotal.toFixed(2);
  document.getElementById('balance').value = grandTotal.toFixed(2);
}

// Save the complete invoice
function saveInvoice() {
  // Collect all invoice data
  const invoiceToSave = {
    invoice_data: collectInvoiceData(),
    items: invoiceItems
  };
  
  // Show loading
  showGlobalSpinner();
  
  // Send to server
  fetch('/api/v1/save-invoice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(invoiceToSave)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to save invoice');
    }
    return response.json();
  })
  .then(data => {
    showToast("Invoice saved successfully");
  })
  .catch(error => {
    console.error("Error saving invoice:", error);
    showToast("Failed to save invoice", false);
  })
  .finally(() => {
    hideGlobalSpinner();
  });
}

// Collect invoice data from form fields
function collectInvoiceData() {
  const data = {};
  
  // Get all field values (excluding item-specific fields that are in the table)
  const fields = [
    'billDate', 'billNumber', 'purchaseOrder', 'billStatus', 'sourceOfSupply',
    'destinationOfSupply', 'gstTreatment', 'gstin', 'isInclusiveTax', 'tdsPercentage',
    'tdsAmount', 'tdsSectionCode', 'tdsName', 'vendorName', 'dueDate', 'currencyCode',
    'exchangeRate', 'attachmentId', 'attachmentPreviewId', 'attachmentName', 'attachmentType',
    'attachmentSize', 'subTotal', 'total', 'balance', 'vendorNotes', 'termsConditions',
    'paymentTerms', 'paymentTermsLabel', 'isBillable', 'customerName', 'projectName',
    'purchaseOrderNumber', 'isDiscountBeforeTax', 'entityDiscountAmount', 'discountAccount',
    'isLandedCost', 'warehouseName', 'branchName', 'cfTransporteName', 'tcsTaxName',
    'tcsPercentage', 'natureOfCollection', 'tcsAmount', 'supplyType', 'itcEligibility'
  ];
  
  fields.forEach(field => {
    const element = document.getElementById(field);
    if (element) {
      data[field] = element.value;
    }
  });
  
  return data;
}

// Update the processFile function to handle the response
function processFile(filename, mode) {
  showGlobalSpinner();
  
  // Disable form during processing
  $('#uploadForm').find('button, input, select').prop('disabled', true);
  
  const formData = new FormData();
  formData.append('filename', filename);
  formData.append('mode', mode);
  formData.append('advanced', 'true');  // Indicate advanced processing

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
    // Process the extracted data
    processExtractionResult(data);
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

// UI Functions
function showToast(message, isSuccess = true, duration = 2000) {
  // Create toast element if it doesn't exist
  if (!$('#toast').length) {
    $('body').append(`
      <div id="toast" class="toast align-items-center text-white border-0 position-fixed" role="alert" aria-live="assertive" aria-atomic="true" style="bottom: 20px; right: 20px; z-index: 9999;">
        <div class="d-flex">
          <div class="toast-body"></div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `);
  }
  
  const toastEl = $('#toast');
  toastEl.removeClass('bg-success bg-danger')
         .addClass(isSuccess ? 'bg-success' : 'bg-danger')
         .find('.toast-body').text(message);

  const toast = new bootstrap.Toast(toastEl[0], {
    delay: duration,
    autohide: true
  });
  toast.show();
}

function showGlobalSpinner() {
  document.getElementById('InvoiceeditorNavglobalSpinnerOverlay').style.display = 'flex';
}

function hideGlobalSpinner() {
  document.getElementById('InvoiceeditorNavglobalSpinnerOverlay').style.display = 'none';
}