import { showSuccess, showError, confirmDelete, showLoading } from '/static/js/notifications.js';

let selectedFiles = new Set();
let allFilesSelected = false;
let allFiles = [];
let allDocuments = [];
let filteredDocuments = [];
let currentTypeFilter = 'all';
let currentDateFilter = 'all';
const token = localStorage.getItem('authToken');

// Expose functions to the global scope
window.showContent = showContent;
window.toggleFileSelection = toggleFileSelection;
window.toggleAllFiles = toggleAllFiles;
window.redirectToOCR = redirectToOCR;

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}
const cookieToken = getCookie('token');
const localToken = localStorage.getItem('authToken');
if (!cookieToken || !localToken) {
    window.location.href = '/login';
}

async function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '/login';
        return false;
    }
    
    try {
        const response = await fetch('/api/v1/auth/verify-token', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Invalid token');
        }
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return false;
    }
}

// Update page title when switching sections
function updatePageTitle(sectionId) {
    const titles = {
        'all-documents': 'All Documents',
        'completed-list': 'Completed Bills',
        'choose-template': 'Choose Template',
        'update-template': 'Update Template',
        'index': 'Invoice Editor',
    };
    
    const titleElement = document.querySelector('.page-title');
    if (titleElement && titles[sectionId]) {
        titleElement.textContent = titles[sectionId];
    }
}

// Toggle between content sections
function showContent(sectionId, event) {

    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    updatePageTitle(sectionId);

    // Show the selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
        
        // Load data for specific sections
        if (sectionId === 'completed-list') {
            // Use setTimeout to ensure DOM is ready
            setTimeout(() => {
                if (typeof loadCompletedInvoices === 'function') {
                    loadCompletedInvoices();
                }
            }, 50);
        } else if (sectionId === 'all-documents') {
            fetchDocuments();
        }
    }
    
    // Update active menu item
    if (event && event.currentTarget) {
        document.querySelectorAll('.sidebar-menu li').forEach(item => {
            item.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
    }
}
window.showContent = showContent;


// Toggle child rows visibility
function toggleChildRows(checkbox) {
    const parentRow = checkbox.closest('tr');
    let nextRow = parentRow.nextElementSibling;
    
    while (nextRow && nextRow.classList.contains('child-row')) {
        nextRow.style.display = checkbox.checked ? 'table-row' : 'none';
        nextRow = nextRow.nextElementSibling;
    }
}

// Redirect to OCR page
function redirectToOCR(filename, mode = 'text') {
    // Get the original filename from the document data
    const originalFilename = allDocuments.find(doc => doc.name === filename)?.originalName || filename;
    // Redirect with both stored filename and original filename
    window.location.href = `index?file=${encodeURIComponent(filename)}&original=${encodeURIComponent(originalFilename)}&mode=${encodeURIComponent(mode)}`;
}

// Function to get file icon based on extension
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        pdf:     '<i class="fas fa-file-pdf file-type-pdf file-icon"></i>',
        jpg:     '<i class="fas fa-file-image file-type-image file-icon"></i>',
        jpeg:    '<i class="fas fa-file-image file-type-image file-icon"></i>',
        png:     '<i class="fas fa-file-image file-type-image file-icon"></i>',
        doc:     '<i class="fas fa-file-word file-type-document file-icon"></i>',
        docx:    '<i class="fas fa-file-word file-type-document file-icon"></i>',
        xls:     '<i class="fas fa-file-excel file-type-spreadsheet file-icon"></i>',
        xlsx:    '<i class="fas fa-file-excel file-type-spreadsheet file-icon"></i>',
        txt:     '<i class="fas fa-file-alt file-type-text file-icon"></i>',
        csv:     '<i class="fas fa-file-csv file-type-spreadsheet file-icon"></i>'
    };
    return icons[ext] || '<i class="fas fa-file file-icon"></i>';
}


// Function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


// Supported file types
const SUPPORTED_FILE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain'
];

// Max file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024; 

// Function to upload file
async function uploadFile(file) {
    if (!await checkAuth()) return false;
    // Validate file type
    if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
        showError(`Unsupported file type: ${file.name}`);
        return false;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        showError(`File too large (max ${formatFileSize(MAX_FILE_SIZE)}): ${file.name}`);
        return false;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/v1/upload-doc', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Upload successful:', result);
            return true;
        } else {
            const error = await response.json();
            console.error('Upload failed:', error);
            showError(error.detail || `Failed to upload ${file.name}`);
            return false;
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        showError(`Network error while uploading ${file.name}`);
        return false;
    }
}

// Function to fetch and display documents
async function fetchDocuments() {
    if (!await checkAuth()) return;
    try {
        const response = await fetch('/api/v1/list-docs');
        if (response.ok) {
            allDocuments = await response.json();
            applyFilters();
        } else {
            console.error('Failed to fetch documents');
            showError('Failed to load documents');
        }
    } catch (error) {
        console.error('Error fetching documents:', error);
        showError('Error loading documents');
    }
}

// Function to apply filters
function applyFilters() {
    filteredDocuments = [...allDocuments];
    
    // Apply type filter
    if (currentTypeFilter !== 'all') {
        filteredDocuments = filteredDocuments.filter(doc => {
            const ext = doc.name.split('.').pop().toLowerCase();
            
            switch(currentTypeFilter) {
                case 'pdf':
                    return ext === 'pdf';
                case 'images':
                    return ['jpg', 'jpeg', 'png'].includes(ext);
                case 'documents':
                    return ['doc', 'docx', 'txt'].includes(ext);
                default:
                    return true;
            }
        });
    }
    
    // Apply date filter
    if (currentDateFilter !== 'all') {
        const now = new Date();
        filteredDocuments = filteredDocuments.filter(doc => {
            const uploadDate = new Date(doc.uploadedOn);
            
            switch(currentDateFilter) {
                case 'today':
                    return uploadDate.toDateString() === now.toDateString();
                case 'last7days':
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    return uploadDate >= sevenDaysAgo;
                case 'thismonth':
                    return uploadDate.getMonth() === now.getMonth() && 
                           uploadDate.getFullYear() === now.getFullYear();
                default:
                    return true;
            }
        });
    }
    
    renderDocuments(filteredDocuments);
}

// Initialize filter event listeners
function initFilters() {
    const typeFilter = document.querySelector('.filter-select:nth-of-type(1)');
    const dateFilter = document.querySelector('.filter-select:nth-of-type(2)');
    
    if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
            currentTypeFilter = e.target.value.toLowerCase();
            applyFilters();
        });
    }
    
    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            currentDateFilter = e.target.value.toLowerCase().replace(' ', '');
            applyFilters();
        });
    }
}

// Function to render documents in the table
function renderDocuments(documents) {
    const tableBody = document.getElementById('documents-list');
    if (!tableBody) {
        console.error('Documents table body not found');
        return;
    }
    
    tableBody.innerHTML = '';
    allFiles = documents.map(doc => doc.name);
    
    documents.forEach(doc => {
        const row = document.createElement('tr');
        row.dataset.filename = doc.name;
        
        row.innerHTML = `
            <td><input type="checkbox" class="file-checkbox" 
                onchange="window.toggleFileSelection(this, '${doc.name}')"
                ${selectedFiles.has(doc.name) ? 'checked' : ''}></td>
            <td>
                <span>${getFileIcon(doc.name)}</span>
                ${doc.name}
            </td>
            <td class="file-size">${formatFileSize(doc.size)}</td>
            <td>${new Date(doc.uploadedOn).toLocaleString()}</td>
            <td>
                <select class="mode-select" style="width: 120px; display: inline-block;">
                    <option value="text">Text PDF</option>
                    <option value="ocr">Scanned</option>
                </select>
                <button class="process-btn" data-filename="${doc.name}">
                    <i class="fas fa-arrow-right"></i> Process
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    updateSelectAllCheckbox();
    updateDeleteButton();
}

// In your docupload.js
$(document).on('click', '.process-btn', function() {
    const filename = $(this).data('filename');
    const mode = $(this).closest('td').find('.mode-select').val();
    redirectToOCR(filename, mode);
});

function toggleAllFiles(selectAllCheckbox) {
    if (!selectAllCheckbox) return;
    
    const checkboxes = document.querySelectorAll('.file-checkbox:not(#select-all-checkbox)');
    
    if (selectAllCheckbox.checked) {
        allFiles.forEach(filename => selectedFiles.add(filename));
        checkboxes.forEach(cb => {
            if (cb) cb.checked = true;
        });
    } else {
        selectedFiles.clear();
        checkboxes.forEach(cb => {
            if (cb) cb.checked = false;
        });
    }
    
    updateDeleteButton();
}

// Event listener for file selection check boxes
function toggleFileSelection(checkbox, filename) {
    if (!checkbox || !filename) return;
    
    if (checkbox.checked) {
        selectedFiles.add(filename);
    } else {
        selectedFiles.delete(filename);
    }
    
    updateSelectAllCheckbox();
    updateDeleteButton();
}

function updateSelectAllCheckbox() {
    const selectAll = document.getElementById('select-all-checkbox');
    if (!selectAll) return;
    
    const checkboxes = document.querySelectorAll('.file-checkbox:not(#select-all-checkbox)');
    const checkedCount = selectedFiles.size;
    
    if (checkedCount === 0) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
    } else if (checkedCount === checkboxes.length) {
        selectAll.checked = true;
        selectAll.indeterminate = false;
    } else {
        selectAll.checked = false;
        selectAll.indeterminate = true;
    }
}

// Update delete button visibility 
function updateDeleteButton() {
    const deleteBtn = document.getElementById('delete-btn');
    if (!deleteBtn) return;
    
    deleteBtn.style.display = selectedFiles.size > 0 ? 'block' : 'none';
    deleteBtn.disabled = selectedFiles.size === 0;
}

// Event listener for delete function 
document.getElementById('delete-btn')?.addEventListener('click', async function() {
    if (selectedFiles.size === 0) return;
    
    confirmDelete(async () => {
        showLoading('Deleting files...');
        
        try {
            const response = await fetch('/api/v1/delete-docs', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filenames: Array.from(selectedFiles) })
            });
            
            if (response.ok) {
                const result = await response.json();
                showSuccess(`${result.deleted.length} file(s) deleted successfully`);
                selectedFiles.clear();
                updateDeleteButton();
                fetchDocuments();
            } else {
                const error = await response.json();
                showError(error.detail || 'Failed to delete files');
            }
        } catch (error) {
            showError('Network error while deleting files');
        }
    });
});

// File upload handler with progress modal
document.getElementById('file-upload')?.addEventListener('change', async function(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    showLoading(`Uploading ${files.length} file(s)`);
    
    try {
        let allSuccess = true;
        
        for (let i = 0; i < files.length; i++) {
            const success = await uploadFile(files[i]);
            if (!success) {
                allSuccess = false;
                showError(`Failed to upload ${files[i].name}`);
                break;
            }
        }
        
        if (allSuccess) {
            showSuccess(`${files.length} file(s) uploaded successfully`);
            fetchDocuments();
        }
    } catch (error) {
        showError('Error uploading files: ' + error.message);
    } finally {
        e.target.value = '';
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('select-all-checkbox') || 
        !document.getElementById('documents-list')) {
        console.error('Critical DOM elements missing');
        return;
    }
    
    fetchDocuments();
    initFilters();
});
