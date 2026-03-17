// user_management.js - Handles user search and management functionality

// Global variables for user search state
let currentUserPage = 1;
const usersPerPage = 50;
let currentUserQuery = '';
let currentUserSort = { field: 'lastName', order: 1 };

// Initialize user search functionality
function initUserSearch() {
    // Set up event listeners
    document.getElementById('userSearchButton').addEventListener('click', searchUsers);
    document.getElementById('userSearchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchUsers();
    });

    // Set up sortable headers
    document.querySelectorAll('#userResultsTable th[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
            const field = header.dataset.sort;
            
            // Update sort direction if same field, otherwise default to ascending
            if (currentUserSort.field === field) {
                currentUserSort.order = -currentUserSort.order;
            } else {
                currentUserSort.field = field;
                currentUserSort.order = 1;
            }
            
            // Update UI sort indicators
            document.querySelectorAll('#userResultsTable th[data-sort]').forEach(h => {
                h.classList.remove('asc', 'desc');
            });
            
            header.classList.add(currentUserSort.order === 1 ? 'asc' : 'desc');
            
            // Refresh search with new sort
            searchUsers();
        });
    });

    // Load initial user data
    loadUsers();
}

// Main function to load users
async function loadUsers() {
    try {
        showLoading('userSearchResults');
        
        const params = new URLSearchParams({
            query: currentUserQuery,
            page: currentUserPage,
            limit: usersPerPage,
            sortField: currentUserSort.field,
            sortOrder: currentUserSort.order
        });
        
        const response = await fetch(`/api/admin/users?${params}`);
        const { success, users, pagination } = await response.json();
        
        if (success) {
            renderUserResults(users);
            renderUserPagination(pagination);
        } else {
            throw new Error('Failed to load users');
        }
    } catch (error) {
        console.error('User search error:', error);
        showError('userSearchResults', 'Failed to load users. Please try again.');
    }
}

// Handle user search
function searchUsers() {
    currentUserQuery = document.getElementById('userSearchInput').value.trim();
    currentUserPage = 1;
    loadUsers();
}

// Render user results in table
function renderUserResults(users) {
    const tbody = document.getElementById('userSearchResults');
    
    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="no-results">No users found</td></tr>`;
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.studentIDNumber || 'N/A'}</td>
            <td>${user.lastName || 'N/A'}</td>
            <td>${user.firstName || 'N/A'}</td>
            <td>${user.emaildb || 'N/A'}</td>
            <td>${capitalize(user.role) || 'N/A'}</td>
            <td>${formatDateTime(user.lastLogin) || 'Never'}</td>
            <td>${formatDateTime(user.createdAt) || 'N/A'}</td>
        </tr>
    `).join('');
}

// Render pagination controls for user search
function renderUserPagination(pagination) {
    const container = document.getElementById('userPagination');
    container.innerHTML = '';
    
    if (pagination.pages <= 1) return;
    
    // Previous button
    if (pagination.page > 1) {
        const prevBtn = createPaginationButton('Previous', () => {
            currentUserPage--;
            loadUsers();
        });
        container.appendChild(prevBtn);
    }
    
    // Page numbers
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.pages, pagination.page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = createPaginationButton(i, () => {
            currentUserPage = i;
            loadUsers();
        });
        
        if (i === pagination.page) {
            pageBtn.disabled = true;
            pageBtn.classList.add('active');
        }
        
        container.appendChild(pageBtn);
    }
    
    // Next button
    if (pagination.page < pagination.pages) {
        const nextBtn = createPaginationButton('Next', () => {
            currentUserPage++;
            loadUsers();
        });
        container.appendChild(nextBtn);
    }
}

// Helper function to create pagination buttons
function createPaginationButton(text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
}

// Format date for display
function formatDateTime(dateString) {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Capitalize first letter
function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

// Show loading state
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<tr><td colspan="7" class="loading">Loading...</td></tr>`;
    }
}

// Show error state
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<tr><td colspan="7" class="error">${message}</td></tr>`;
    }
}

// Initialize when DOM is loaded
if (document.readyState !== 'loading') {
    initUserSearch();
} else {
    document.addEventListener('DOMContentLoaded', initUserSearch);
}