let lastExtractedData = null;
let 
dt; // Declare at the top

function showToast(message, isSuccess = true) {
  const toastEl = $('#toast');
  toastEl.removeClass('text-bg-success text-bg-danger');
  toastEl.addClass(isSuccess ? 'text-bg-success' : 'text-bg-danger');
  toastEl.find('.toast-body').text(message);
  const toast = new bootstrap.Toast(toastEl[0]);
  toast.show();
}

function renderExtractedInvoice(result) {
  console.log("Extracted result:", result)
  lastExtractedData = result;

  const invData = result.invoice_data;
  const invoiceNo = invData.invoice_number;

  // Remove all rows from DataTable
  dt.clear();

  // Add new row using DataTables API
dt.row.add([
  `<span contenteditable="true" class="editable" data-field="invoice_number">${invoiceNo}</span>`,
  `<span contenteditable="true" class="editable" data-field="from_address">${invData.from_address}</span>`,
  `<span contenteditable="true" class="editable" data-field="to_address">${invData.to_address}</span>`,
  `<span contenteditable="true" class="editable" data-field="gst_number">${invData.gst_number}</span>`,
  `<span contenteditable="true" class="editable" data-field="invoice_date">${invData.invoice_date}</span>`,
  `<span contenteditable="true" class="editable" data-field="total">${invData.total}</span>`,
  `<span contenteditable="true" class="editable" data-field="taxes">${invData.taxes}</span>`,
  `<span contenteditable="true" class="editable" data-field="total_quantity">${invData.total_quantity}</span>`,
  `<button class="btn btn-sm btn-outline-info toggleItems" data-id="${invoiceNo}">Items</button>`
]).draw();


  $('#extractedSection').show();
  $('#saveBtn').prop('disabled', false).text('Save').show();
}

function getItemsTableHtml(items) {
  return `
    <table class="table table-sm table-bordered mb-0" id="editableItemTable">
      <thead class="table-secondary">
        <tr>
          <th>Item ID</th>
          <th>Invoice No</th>
          <th>Description</th>
          <th>HSN</th>
          <th>Quantity</th>
          <th>Price/Unit</th>
          <th>CGST</th>
          <th>IGST</th>
          <th>SGST</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr data-id="${item.item_id}">
            <td>${item.item_id || "-"}</td>
            <td>${item.invoice_number}</td>
            <td contenteditable="true">${item.description || "-"}</td>
            <td contenteditable="true">${item.hsn || "-"}</td>
            <td contenteditable="true">${item.quantity || "-"}</td>
            <td contenteditable="true">${item.price_per_unit ?? "-"}</td>
            <td contenteditable="true">${item.gst || "-"}</td>
            <td contenteditable="true">${item.igst || "-"}</td>
            <td contenteditable="true">${item.sgst || "-"}</td>
            <td contenteditable="true">${item.amount || "-"}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <button class="btn btn-sm btn-success mt-2" id="saveUpdatedItems">💾 Save Items</button>
  `;
}



$('#recentInvoiceTable tbody').on('click', '.toggleItems', function () {
  const tr = $(this).closest('tr');
  const row = dt.row(tr);
  const invoiceNo = $(this).data('id'); // <-- Add this line

  let items = lastExtractedData?.invoice_data?.items;
  if (!Array.isArray(items) || items.length === 0) {
    items = lastExtractedData?.items;
  }

  if (row.child.isShown()) {
    row.child.hide();
    tr.removeClass('shown');
  } else {
    if (Array.isArray(items) && items.length > 0) {
      console.log("Showing child row for invoice:", invoiceNo, items);
      row.child(getItemsTableHtml(items)).show();
      tr.addClass('shown');
    } else {
      showToast("No item data found or already removed.", false);
    }
  }
});


function previewPDF(file) {
  const fileReader = new FileReader();
  fileReader.onload = function () {
    const typedArray = new Uint8Array(this.result);
    pdfjsLib.getDocument(typedArray).promise.then(pdf => {
      pdf.getPage(1).then(page => {
        const canvas = document.getElementById("pdfViewer");
        const context = canvas.getContext("2d");
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        page.render({ canvasContext: context, viewport: viewport });
        $('#pdfViewer').show();
      });
    });
  };
  fileReader.readAsArrayBuffer(file);
}

$('#invoiceFile').on('change', function () {
  const file = this.files[0];
  $('#previewImg').hide();
  $('#pdfViewer').hide();

  if (file) {
    const type = file.type;
    if (type === "application/pdf") {
      previewPDF(file);
    } else if (type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = function (e) {
        $('#previewImg').attr('src', e.target.result).show();
      };
      reader.readAsDataURL(file);
    }
  }
});

$('#uploadForm').on('submit', function (e) {
  e.preventDefault();
  showGlobalSpinner();

  const file = $('#invoiceFile')[0].files[0];
  const mode = $('#modeSelect').val();

  if (!file) {
    showToast("Please select a file.", false);
    hideGlobalSpinner(); // Hide spinner if no file
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);

  $.ajax({
    url: '/api/v1/upload-invoice',
    type: 'POST',
    data: formData,
    processData: false,
    contentType: false,
    success: function (resp) {
      console.log("Response from server:", resp);
      showToast("Invoice processed successfully.");
      renderExtractedInvoice(resp);
      hideGlobalSpinner(); // Hide spinner on success
    },
    error: function (xhr) {
      const msg = xhr.responseJSON?.detail || 'Upload failed.';
      showToast(msg, false);
      hideGlobalSpinner(); // Hide spinner on error
    }
  });
});


//initialize DataTable for recent invoices
$(document).ready(function() {
  dt = $('#recentInvoiceTable').DataTable({
    paging: false,
    searching: false,
    info: false
  });
});

// Save updated invoice data from editable table to the server
$('#saveBtn').on('click', function () {
  showDatatableSpinner();
  const row = $('#recentInvoiceTable tbody tr').first(); // first row only
  const updatedInvoice = {};

  row.find('td .editable').each(function () {
    const field = $(this).data('field');
    const value = $(this).text().trim();
    updatedInvoice[field] = value;
  });

  $.ajax({
    url: '/api/v1/invoices/update-invoice',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(updatedInvoice),
    success: function () {
      showToast("Invoice updated successfully.");
      $('#saveBtn').prop('disabled', true).text("✅ Updated");
      // After successful invoice update
updateLastExtractedData(updatedInvoice, 'invoice');
      hideDatatableSpinner();
    },
    error: function () {
      showToast("Failed to update invoice.", false);
      hideDatatableSpinner();
    }
  });
});


// Save updated items from editable table to the server
$(document).on('click', '#saveUpdatedItems', function () {
  const updatedItems = [];

  $('#editableItemTable tbody tr').each(function () {
    const row = $(this);
    updatedItems.push({
      item_id: row.data('id'),
      invoice_number: row.find('td:eq(1)').text().trim(),
      description: row.find('td:eq(2)').text().trim(),
      hsn: row.find('td:eq(3)').text().trim(),
      quantity: row.find('td:eq(4)').text().trim(),
      price_per_unit: row.find('td:eq(5)').text().trim(),
      gst: row.find('td:eq(6)').text().trim(),
      igst: row.find('td:eq(7)').text().trim(),
      sgst: row.find('td:eq(8)').text().trim(),
      amount: row.find('td:eq(9)').text().trim()
    });
  });

  $.ajax({
    url: '/api/v1/invoices/update-items',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(updatedItems),
    success: function () {
      showToast("Items updated successfully.");
      // After successful items update
updateLastExtractedData(updatedItems, 'items');
    },
    error: function () {
      showToast("Failed to update items.", false);
    }
  });
});

/**
 * Dynamically updates lastExtractedData with new values.
 * @param {Object} updatedData - The updated fields (for invoice or items).
 * @param {String} type - 'invoice' or 'items'
 */
function updateLastExtractedData(updatedData, type = 'invoice') {
  if (!lastExtractedData) return;

  if (type === 'invoice' && lastExtractedData.invoice_data) {
    Object.keys(updatedData).forEach(key => {
      lastExtractedData.invoice_data[key] = updatedData[key];
    });
  } else if (type === 'items') {
    // Support both lastExtractedData.items and lastExtractedData.invoice_data.items
    if (lastExtractedData.invoice_data && Array.isArray(lastExtractedData.invoice_data.items)) {
      lastExtractedData.invoice_data.items = updatedData;
    } else if (Array.isArray(lastExtractedData.items)) {
      lastExtractedData.items = updatedData;
    }
  }
}


// --- Pan and Zoom for Image ---
// --- State ---
let isPanning = false, startX = 0, startY = 0, panX = 0, panY = 0, scale = 1;
let activeElement = null;
const minScale = 0.5, maxScale = 4;

const previewImg = document.getElementById('previewImg');
const pdfViewer = document.getElementById('pdfViewer');

// --- PDF State ---
let pdfDoc = null, currentPage = 1, pdfScale = 1.5;

// --- Helpers ---
function setTransform(el, panX, panY, scale) {
  el.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}
function resetTransform(el) {
  panX = 0; panY = 0; scale = 1;
  setTransform(el, panX, panY, scale);
}

// --- Pan/Zoom Handlers ---
function attachPanZoom(el, isPDF = false) {
  el.onmousedown = function(e) {
    if (el.style.display === 'none') return;
    isPanning = true;
    activeElement = el;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    el.style.cursor = 'grabbing';
  };
  el.onwheel = function(e) {
    if (el.style.display === 'none') return;
    e.preventDefault();
    let delta = e.deltaY > 0 ? -0.1 : 0.1;
    let newScale = Math.min(maxScale, Math.max(minScale, scale + delta));
    if (newScale !== scale) {
      scale = newScale;
      if (isPDF) {
        pdfScale = scale * 1.5; // base scale for PDF
        renderPDFPage(currentPage, pdfScale, panX, panY, scale);
      } else {
        setTransform(el, panX, panY, scale);
      }
    }
  };
}
document.addEventListener('mousemove', function(e) {
  if (!isPanning || !activeElement) return;
  panX = e.clientX - startX;
  panY = e.clientY - startY;
  setTransform(activeElement, panX, panY, scale);
});
document.addEventListener('mouseup', function() {
  isPanning = false;
  if (activeElement) activeElement.style.cursor = 'grab';
  activeElement = null;
});

// --- Image Preview ---
function showImagePreview(src) {
  previewImg.src = src;
  previewImg.style.display = '';
  pdfViewer.style.display = 'none';
  panX = 0; panY = 0; scale = 1;
  setTransform(previewImg, panX, panY, scale);
}

// --- PDF Preview ---
let pdfRenderTask = null;

function renderPDFPage(pageNum, scaleVal, panX = 0, panY = 0, cssScale = 1) {
  pdfDoc.getPage(pageNum).then(page => {
    const viewport = page.getViewport({ scale: scaleVal });
    pdfViewer.height = viewport.height;
    pdfViewer.width = viewport.width;
    const context = pdfViewer.getContext("2d");
    context.clearRect(0, 0, pdfViewer.width, pdfViewer.height);

    // Cancel previous render task if running
    if (pdfRenderTask) {
      pdfRenderTask.cancel();
    }
    pdfRenderTask = page.render({ canvasContext: context, viewport: viewport });
    pdfRenderTask.promise.then(() => {
      setTransform(pdfViewer, panX, panY, cssScale);
      pdfRenderTask = null;
    }).catch(() => {
      pdfRenderTask = null;
    });
  });
}
function showPDFPreview() {
  previewImg.style.display = 'none';
  pdfViewer.style.display = '';
  panX = 0; panY = 0; scale = 1;
  renderPDFPage(currentPage, pdfScale, panX, panY, scale);
}

// --- Attach Pan/Zoom ---
attachPanZoom(previewImg, false);
attachPanZoom(pdfViewer, true);

// --- File Input Handler ---
// $('#invoiceFile').on('change', function () {
//   const file = this.files[0];
//   $('#previewImg').hide();
//   $('#pdfViewer').hide();

//   if (file) {
//     const type = file.type;
//     if (type === "application/pdf") {
//       const fileReader = new FileReader();
//       fileReader.onload = function () {
//         const typedArray = new Uint8Array(this.result);
//         pdfjsLib.getDocument(typedArray).promise.then(pdf => {
//           pdfDoc = pdf;
//           currentPage = 1;
//           pdfScale = 1.5;
//           showPDFPreview();
//         });
//       };
//       fileReader.readAsArrayBuffer(file);
//     } else if (type.startsWith("image/")) {
//       const reader = new FileReader();
//       reader.onload = function (e) {
//         showImagePreview(e.target.result);
//       };
//       reader.readAsDataURL(file);
//     }
//   }
// });
$('#invoiceFile').on('change', function () {
  const file = this.files[0];
  $('#previewImg').hide();
  $('#pdfViewer').hide();

  if (file) {
    const type = file.type;
    if (type === "application/pdf") {
      const fileReader = new FileReader();
      fileReader.onload = function () {
        const typedArray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedArray).promise.then(pdf => {
          pdfDoc = pdf;
          currentPage = 1;
          pdfScale = 1.5;
          showPDFPreview(); // <- uses cancel-safe render
        });
      };
      fileReader.readAsArrayBuffer(file);
    } else if (type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = function (e) {
        showImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }
});

// --- Resize Preview Area ---
// Adjust preview area size based on window size
function resizePreviewArea() {
  const wrapper = document.getElementById('previewWrapper');
  const width = wrapper.clientWidth;
  const height = wrapper.clientHeight;

  // For image, let natural size and transform handle scaling

  // For PDF, re-render at new size if visible
  if (pdfDoc && pdfViewer.style.display !== 'none') {
    renderPDFPage(currentPage, pdfScale);
  }
}

// Call on load and on resize
window.addEventListener('resize', resizePreviewArea);
document.addEventListener('DOMContentLoaded', resizePreviewArea);

// Show spinner
function showSpinner() {
  $('#uploadSpinner').show();
}

// Hide spinner
function hideSpinner() {
  $('#uploadSpinner').hide();
}

// Show global spinner
function showGlobalSpinner() {
  $('#globalSpinnerOverlay').show();
}
function hideGlobalSpinner() {
  $('#globalSpinnerOverlay').hide();
}

// Datatable spinner
function showDatatableSpinner() {
  $('#datatableSpinnerOverlay').show();
}
function hideDatatableSpinner() {
  $('#datatableSpinnerOverlay').hide();
}

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}
