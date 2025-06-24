let dataTable;

function showToast(message, isSuccess = true) {
  const toastEl = $('#toast');
  toastEl.removeClass('text-bg-success text-bg-danger');
  toastEl.addClass(isSuccess ? 'text-bg-success' : 'text-bg-danger');
  toastEl.find('.toast-body').text(message);
  const toast = new bootstrap.Toast(toastEl[0]);
  toast.show();
}

function renderInvoices(data) {
  const tbody = $('#invoiceTable tbody');
  tbody.empty();

  const invoiceRows = data.map(inv => {
    const invoiceNo = inv.InvoiceNo || '-';
    const from = inv.FromAddress || '-';
    const to = inv.ToAddress || '-';
    const gst = inv.GSTNo || '-';
    const date = inv.InvoiceDate || '-';
    const total = inv.TotalAmount ?? inv.Total ?? '-';
    const taxes = inv.Taxes ?? '-';
    const qty = inv.TotalQuantity ?? '-';

    return `
      <tr id="row-${CSS.escape(invoiceNo)}">
        <td>${invoiceNo}</td>
        <td>${from}</td>
        <td>${to}</td>
        <td>${gst}</td>
        <td>${date}</td>
        <td>${total}</td>
        <td>${taxes}</td>
        <td>${qty}</td>
        <td>
          <button class="btn btn-sm btn-outline-info me-1 toggleItems" data-id="${invoiceNo}">Items</button>
          <button class="btn btn-sm btn-outline-danger deleteInvoice" data-id="${invoiceNo}">Delete</button>
        </td>
      </tr>`;
  }).join('');

  if ($.fn.DataTable.isDataTable('#invoiceTable')) {
    $('#invoiceTable').DataTable().destroy();
  }

  tbody.html(invoiceRows);

  $('#invoiceTable').DataTable({
    paging: true,
    ordering: true,
    info: true,
    searching: false
  });
}

$(document).on('click', '.toggleItems', function () {
  const invoiceNo = $(this).data('id');
  const tr = $(this).closest('tr');
  const table = $('#invoiceTable').DataTable();
  const row = table.row(tr);

  if (row.child.isShown()) {
    row.child.hide();
    tr.removeClass('shown');
  } else {
    $.get(`/api/v1/invoices/${encodeURIComponent(invoiceNo)}/items`, function (items) {
      const itemRows = Array.isArray(items) && items.length > 0
        ? items.map(item => `
          <tr>
            <td>${item.ItemID ?? '-'}</td>
            <td>${item.InvoiceNo ?? '-'}</td>
            <td>${item.Description ?? '-'}</td>
            <td>${item.HSN ?? '-'}</td>
            <td>${item.Quantity ?? '-'}</td>
            <td>${item.PricePerUnit ?? '-'}</td>
            <td>${item.GST ?? '-'}</td>
            <td>${item.IGST ?? '-'}</td>
            <td>${item.SGST ?? '-'}</td>
            <td>${item.Amount ?? '-'}</td>
          </tr>`).join('')
        : '<tr><td colspan="10" class="text-center">No items available</td></tr>';

      const itemTable = `
        <table class="table table-sm table-striped table-bordered mb-0 nested-table">
          <thead class="table-secondary">
            <tr>
              <th>Item ID</th>
              <th>Invoice No</th>
              <th>Description</th>
              <th>HSN</th>
              <th>Quantity</th>
              <th>Price/Unit</th>
              <th>GST</th>
              <th>IGST</th>
              <th>SGST</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>`;

      console.log("Showing child row for invoice:", invoiceNo, items);
      row.child(itemTable).show();
      tr.addClass('shown');
    }).fail(() => {
      showToast('Failed to load invoice items.', false);
    });
  }
});

function fetchInvoices() {
  $.get('/api/v1/invoices', function (data) {
    const searchTerm = $('#searchInput').val().toLowerCase();
    const filtered = data.filter(inv =>
      inv.InvoiceNo?.toLowerCase().includes(searchTerm)
    );
    renderInvoices(filtered);
  });
}

function fetchInvoiceDetails(invoiceNo) {
  $.get(`/api/v1/invoices/${encodeURIComponent(invoiceNo)}`, function (data) {
    renderInvoices([data]);
  }).fail(function () {
    showToast("Failed to fetch invoice details.", false);
  });
}

$(document).on('click', '.deleteInvoice', function () {
  const invoiceId = $(this).data('id');
  if (confirm('Are you sure you want to delete this invoice?')) {
    $.ajax({
      url: `/api/v1/invoices/${encodeURIComponent(invoiceId)}`,
      type: 'DELETE',
      success: function () {
        showToast('Invoice deleted successfully!', true);
        fetchInvoices();
      },
      error: function () {
        showToast('Failed to delete invoice.', false);
      }
    });
  }
});

$('#listInvoices').on('click', function () {
  $('#invoiceDetail').hide();
  $('#searchInput').val('');
  fetchInvoices();
});

$('#searchInput').on('keypress', function (e) {
  if (e.which === 13) {
    const invoiceNo = $(this).val().trim();
    if (invoiceNo !== '') {
      fetchInvoiceDetails(invoiceNo); // <-- pass raw value, do NOT encode here
    }
  }
});

$(document).ready(fetchInvoices);
