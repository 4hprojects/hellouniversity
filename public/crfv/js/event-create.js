//event-create.js 
document.addEventListener('DOMContentLoaded', async () => {
  const authModal = document.getElementById('authModal');
  const goHomeBtn = document.getElementById('goHomeBtn');
  const createPanel = document.getElementById('createPanel');
  //const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const headerNav = document.getElementById('headerNav');

  let events = []; // Make sure this is declared at the top

  // Mobile menu toggle
//  mobileMenuBtn.addEventListener('click', () => {
 //   headerNav.classList.toggle('active');
  //});

  // Check admin session
  try {
    const res = await fetch('/session-check', { credentials: 'include' });
    if (!res.ok) throw new Error();
    const user = await res.json();
    console.log('Admin Check:', user);
    if (user.role !== 'admin' && user.role !== 'manager') throw new Error();
    authModal.style.display = 'none';
    document.body.style.overflow = '';
    renderCreatePanel(user);
    loadUpcomingEvents();
    loadArchivedEvents();
    loadAllEvents();
  } catch (err) {
    console.error('Admin Check Failed:', err);
    authModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  goHomeBtn.addEventListener('click', () => {
    window.location.href = '/crfv/index';
  });

  function generateEventId(eventName, startDate) {
    const prefix = eventName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
    if (!startDate) return prefix;
    const dateObj = new Date(startDate);
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const yy = String(dateObj.getFullYear()).slice(-2);
    return `${prefix}${mm}${dd}${yy}`;
  }

  function renderCreatePanel(user) {
    createPanel.innerHTML = `
      <div class="app-container">
        <div class="header">
          <h1>Create New Event</h1>
        </div>
        <form id="eventForm" class="attendance-card" autocomplete="off">
          <label>Event Name: <input type="text" name="event_name" required></label>
          <label>Start Date: <input type="date" name="start_date" required></label>
          <label>End Date: <input type="date" name="end_date" required></label>
          <label>Location: <input type="text" name="location" required></label>
          <label>Venue: <input type="text" name="venue" required></label>
          <label>Event ID: <input type="text" name="event_id" id="event_id" readonly style="background:#f3f3f3;"></label>
          <button type="submit" class="btn btn-primary mt-4">Create Event</button>
          <div id="eventStatus" class="mt-4 text-blue-600"></div>
        </form>
      </div>
    `;
    document.getElementById('eventForm').addEventListener('submit', handleEventCreate);

    // Auto-generate event_id as user types
    const eventNameInput = document.querySelector('input[name="event_name"]');
    const startDateInput = document.querySelector('input[name="start_date"]');
    const eventIdInput = document.getElementById('event_id');

    function updateEventId() {
      eventIdInput.value = generateEventId(eventNameInput.value, startDateInput.value);
    }
    eventNameInput.addEventListener('input', updateEventId);
    startDateInput.addEventListener('input', updateEventId);
  }

  async function handleEventCreate(e) {
    e.preventDefault();
    const form = e.target;
    const statusDiv = document.getElementById('eventStatus');
    statusDiv.textContent = "Creating event...";

    // Clear previous errors
    statusDiv.style.color = "#d32f2f";
    statusDiv.textContent = "";

    // Frontend validation
    if (!form.event_name.value.trim()) {
      statusDiv.textContent = "Event name is required.";
      form.event_name.focus();
      return;
    }
    if (!form.start_date.value) {
      statusDiv.textContent = "Start date is required.";
      form.start_date.focus();
      return;
    }
    if (!form.end_date.value) {
      statusDiv.textContent = "End date is required.";
      form.end_date.focus();
      return;
    }
    if (new Date(form.end_date.value) < new Date(form.start_date.value)) {
      statusDiv.textContent = "End date cannot be before start date.";
      form.end_date.focus();
      return;
    }
    if (!form.location.value.trim()) {
      statusDiv.textContent = "Location is required.";
      form.location.focus();
      return;
    }
    if (!form.venue.value.trim()) {
      statusDiv.textContent = "Venue is required.";
      form.venue.focus();
      return;
    }

    try {
      const formData = {
        event_id: generateEventId(form.event_name.value.trim(), form.start_date.value),
        event_name: form.event_name.value.trim(),
        start_date: form.start_date.value,
        end_date: form.end_date.value,
        location: form.location.value.trim(),
        venue: form.venue.value.trim()
      };

      const res = await fetch('/api/events', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const result = await res.json();

      if (res.ok && result.status === "success") {
        statusDiv.style.color = "#1976d2";
        statusDiv.textContent = "Event created successfully!";
        form.reset();
        document.getElementById('event_id').value = '';
        loadUpcomingEvents();
      } else if (result.status === "error" && result.field) {
        statusDiv.textContent = `${result.field}: ${result.message}`;
        // Optionally focus the field with error
        if (form[result.field]) form[result.field].focus();
      } else if (result.error) {
        statusDiv.textContent = result.error;
      } else {
        throw new Error(result.message || "Event creation failed");
      }
    } catch (err) {
      statusDiv.textContent = err.message || "Network error. Please try again.";
    }
  }

  function formatEventDate(start, end) {
    if (!start && !end) return '';
    if (start === end || !end) {
      return new Date(start).toLocaleDateString();
    }
    return `${new Date(start).toLocaleDateString()} – ${new Date(end).toLocaleDateString()}`;
  }

  function formatDateDDMMMYYYY(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date)) return '';
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }
 

  // Modal HTML (add to body if not present)
  if (!document.getElementById('eventEditModal')) {
    const modal = document.createElement('div');
    modal.id = 'eventEditModal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">

        <form id="editEventForm" class="attendance-card">
          <h2>Edit Event</h2>
          <label align="left">Event Name: <input type="text" name="event_name" required></label>
          <!-- Place inside your form -->
          <div class="form-row">
            <label align="left" for="start_date" style="flex:1;">Start Date:
              <input type="date" name="start_date" id="start_date" required>
            </label>
            <label align="left" for="end_date" style="flex:1;">End Date:
              <input type="date" name="end_date" id="end_date" required>
            </label>
          </div>
          <label align="left">Location: <input type="text" name="location" required></label>
          <label align="left">Venue: <input type="text" name="venue"></label>
          <div class="form-row">
            <label align="left" for="editEventStatus" class="status-label">Status:</label>
            <select name="status" id="editEventStatus" class="status-select">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div id="statusHint" class="modal-hint" style="margin-top:8px;color:#555;font-size:0.95em;">
            <strong>Archiving</strong> an event will move it to the Completed Events list.<br> Archived events are hidden from upcoming events, but you can change the status back to Active at any time.
          </div>
          <label align="left">Created By: 
            <input type="text" name="creator_account_name" id="creator_account_name" readonly style="background:#f3f3f3;">
          </label>
          <div id="modalMsg" style="margin-bottom:1em;color:#d32f2f;"></div>
          <div class="modal-actions">
                  <button type="button" id="deleteEventBtn" class="btn btn-danger modal-delete-btn" title="Delete this event">
          <span>Delete Event</span>
        </button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
            <button type="button" id="closeEditModal" class="btn">Cancel</button>
          </div>
        </form>
      </div>
      <style>
        #eventEditModal { position:fixed;top:0;left:0;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;z-index:1000;}
        .modal-backdrop {position:absolute;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);}
        .modal-content {position:relative;background:#fff;padding:2rem;border-radius:8px;z-index:1;min-width:320px;}
        .modal-actions {margin-top:1rem;display:flex;gap:1rem;}
      </style>
    `;
    document.body.appendChild(modal);

    // Attach the handler here!
    modal.querySelector('#deleteEventBtn').onclick = function() {
      const eventId = modal.querySelector('#editEventForm').dataset.eventId;
      document.getElementById('deleteConfirmModal').style.display = 'flex';
      document.getElementById('deleteConfirmForm').dataset.eventId = eventId;
      document.getElementById('delete_password').value = '';
      document.getElementById('deleteModalMsg').textContent = '';
    };
  }

  // Modal open/close logic
  function openEditModal(eventId) {
    // Always use the latest events array
    const event = events.find(ev => ev.event_id === eventId);
    if (!event) {
      alert('Event not found.');
      return;
    }
    const modal = document.getElementById('eventEditModal');
    const form = modal.querySelector('#editEventForm');
    form.event_name.value = event.event_name || '';
    form.start_date.value = event.start_date || '';
    form.end_date.value = event.end_date || '';
    form.location.value = event.location || '';
    form.venue.value = event.venue || '';
    form.status.value = event.status || 'active';
    form.creator_account_name.value = event.created_by_name || 'Unknown';
    form.dataset.eventId = eventId;
    modal.style.display = 'flex';
    const msgDiv = document.getElementById('modalMsg');
    if (msgDiv) msgDiv.textContent = '';

    // Status hint logic
    const statusSelect = form.status;
    const statusHint = modal.querySelector('#statusHint');
    function updateStatusHint() {
      if (statusSelect.value === 'archived') {
        statusHint.innerHTML = `<strong>Archiving</strong> will move this event to Completed Events. <br> You may <strong>restore</strong> it by changing status back to Active.`;
      } else {
        statusHint.innerHTML = `Set status to <strong>Active</strong> to show this event in Upcoming Events.`;
      }
    }
    statusSelect.onchange = updateStatusHint;
    updateStatusHint(); // Initialize on modal open
  }
  document.getElementById('closeEditModal').onclick = () => {
    if (confirm("Are you sure you want to cancel editing? Unsaved changes will be lost.")) {
      document.getElementById('eventEditModal').style.display = 'none';
    }
  };

  // Handle edit form submission (status is updated here)
  document.getElementById('editEventForm').onsubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const eventId = form.dataset.eventId;
    if (new Date(form.end_date.value) < new Date(form.start_date.value)) {
      alert("End date cannot be before start date.");
      return;
    }
    if (!confirm("Are you sure you want to save these changes?")) return;
    const updatedData = {
      event_name: form.event_name.value.trim(),
      start_date: form.start_date.value,
      end_date: form.end_date.value,
      location: form.location.value.trim(),
      venue: form.venue.value.trim(),
      status: form.status.value // <-- status is sent only on Save
    };
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        document.getElementById('eventEditModal').style.display = 'none';
        loadUpcomingEvents();
        loadArchivedEvents();
        loadAllEvents();
      } else {
        const errorData = await res.json();
        alert('Failed to update event.');
      }
    } catch {
      alert('Network error.');
    }
  };
  
  // Archive/Un-archive logic
  async function handleArchiveEvent(eventId, action) {
    if (!confirm(`Are you sure you want to ${action.toLowerCase()} this event?`)) return;
    const status = action === 'Un-archive' ? 'active' : 'archived';
    try {
      const res = await fetch(`/api/events/${eventId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        loadUpcomingEvents();
        loadArchivedEvents();
        loadAllEvents();
      } else {
        alert('Failed to update event status.');
      }
    } catch {
      alert('Network error.');
    }
  }

  // Utility to render events in a list
  function renderEvents(listId, events, currentUser) {
    const list = document.getElementById(listId);
    list.innerHTML = '';
    events.forEach(event => {
      const isCreator = event.created_by_name === currentUser.userId;
      const isAdmin = currentUser.role === 'admin';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${event.event_name}</td>
        <td>${event.start_date}</td>
        <td>${event.end_date}</td>
        <td>${event.location}</td>
        <td>${event.venue}</td>
        <td>
          <span title="Created by">${event.created_by_name || 'Unknown'}</span>
        </td>
        <td>
          ${(isCreator || isAdmin) ? `<button class="delete-btn" data-id="${event.event_id}">Delete</button>` : ''}
        </td>
      `;
      list.appendChild(row);
    });

    // Attach delete handler
    list.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = async (e) => {
        const eventId = btn.getAttribute('data-id');
        const password = prompt('Please enter your password to confirm deletion:');
        if (!password) return;
        if (confirm('Are you sure you want to delete this event?')) {
          const res = await fetch(`/api/events/${eventId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // <-- Important for session!
            body: JSON.stringify({ password })
          });
          const result = await res.json();

          if (res.status === 409 && result.hasAttendance) {
            if (confirm('This event has attendance records. Do you want to delete all associated records and the event?')) {
              // Send cascade delete
              const cascadeRes = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ password, cascade: true })
              });
              const cascadeResult = await cascadeRes.json();
              if (cascadeResult.status === 'success') {
                alert('Event and all associated records deleted.');
                // Refresh table or close modal
              } else {
                alert(cascadeResult.error || 'Cascade delete failed.');
              }
            }
          } else if (result.status === 'success') {
            alert('Event deleted.');
            // Refresh table or close modal
          } else {
            alert(result.error || 'Delete failed.');
          }
        }
      };
    });
  }

  // Render Upcoming Events
  function renderUpcomingEvents(listId, events) {
    const tbody = document.getElementById(listId);
    tbody.innerHTML = '';
    if (!events || events.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-gray-400">No events found.</td></tr>';
      return;
    }
    events.forEach((ev, i) => {
      const tr = document.createElement('tr');
      tr.className = i % 2 === 0 ? 'event-row-even' : 'event-row-odd';
      tr.innerHTML = `
        <td style="text-align:left;">${ev.event_id}</td>
        <td style="text-align:left;"><strong>${ev.event_name}</strong></td>
        <td style="text-align:left;">
          ${formatDateDDMMMYYYY(ev.start_date)}
          ${ev.end_date ? ' to ' + formatDateDDMMMYYYY(ev.end_date) : ''}
        </td>
        <td style="text-align:left;">${ev.venue || ''}</td>
        <td style="text-align:left;">${ev.location || ''}</td>
        <td>
          <button class="event-action edit-btn" data-id="${ev.event_id}">Edit</button>
          <button class="event-action archive-btn" data-id="${ev.event_id}">
            ${ev.status === 'archived' ? 'Un-archive' : 'Archive'}
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    setTimeout(() => {
      tbody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = (e) => openEditModal(e.target.dataset.id);
      });
      tbody.querySelectorAll('.archive-btn').forEach(btn => {
        btn.onclick = (e) => handleArchiveEvent(e.target.dataset.id, e.target.textContent);
      });
    }, 0);
  }

  // Render Archived Events
  function renderArchivedEvents(listId, events) {
    const tbody = document.getElementById(listId);
    tbody.innerHTML = '';
    if (!events || events.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-gray-400">No archived events found.</td></tr>';
      return;
    }
    events.forEach((ev, i) => {
      const tr = document.createElement('tr');
      tr.className = i % 2 === 0 ? 'event-row-even' : 'event-row-odd';
      tr.innerHTML = `
        <td style="text-align:left;">${ev.event_id}</td>
        <td style="text-align:left;"><strong>${ev.event_name}</strong></td>
        <td style="text-align:left;">
          ${formatDateDDMMMYYYY(ev.start_date)}
          ${ev.end_date ? ' to ' + formatDateDDMMMYYYY(ev.end_date) : ''}
        </td>
        <td style="text-align:left;">${ev.venue || ''}</td>
        <td style="text-align:left;">${ev.location || ''}</td>
        <td style="text-align:left;">
          ${ev.status || ''}
          <button class="event-action edit-btn" data-id="${ev.event_id}">Edit</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    setTimeout(() => {
      tbody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = (e) => openEditModal(e.target.dataset.id);
      });
    }, 0);
  }

  // Fetch Upcoming Events
  function loadUpcomingEvents() {
    fetch('/api/events/upcoming')
      .then(res => res.json())
      .then(data => {
        console.log('Fetched events:', data);
        events = Array.isArray(data) ? data : [];
        // Sort descending by start_date
        events.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        renderUpcomingEvents('latestEventsList', events);
      })
      .catch(() => {
        events = [];
        renderUpcomingEvents('latestEventsList', []);
      });
  }

  // Fetch Completed (Archived) Events
  function loadArchivedEvents() {
    fetch('/api/events/all')
      .then(res => res.json())
      .then(data => {
        const archived = Array.isArray(data) ? data.filter(ev => ev.status === 'archived') : [];
        archived.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        events = archived; // Update global events for modal editing
        renderArchivedEvents('archivedEventsList', archived);
      })
      .catch(() => {
        events = [];
        renderArchivedEvents('archivedEventsList', []);
      });
  }

  // Fetch All Events
  function loadAllEvents() {
    fetch('/api/events/all')
      .then(res => res.json())
      .then(data => {
        const allEvents = Array.isArray(data) ? data : [];
        allEvents.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        events = allEvents; // <-- Add this line
        renderAllEvents('allEventsList', allEvents);
      })
      .catch(() => {
        events = [];
        renderAllEvents('allEventsList', []);
      });
  }

  document.querySelectorAll('.collapsible').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.getAttribute('data-target');
      const table = document.getElementById(targetId);
      const icon = header.querySelector('.collapse-icon');
      if (table.style.display === 'none') {
        table.style.display = 'table';
        header.classList.remove('collapsed');
        if (icon) icon.textContent = '▼';
      } else {
        table.style.display = 'none';
        header.classList.add('collapsed');
        if (icon) icon.textContent = '▲';
      }
    });
  });

  function renderAllEvents(listId, events) {
    const tbody = document.getElementById(listId);
    tbody.innerHTML = '';
    if (!events || events.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-gray-400">No events found.</td></tr>';
      return;
    }
    events.forEach((ev, i) => {
      const tr = document.createElement('tr');
      tr.className = i % 2 === 0 ? 'event-row-even' : 'event-row-odd';
      tr.innerHTML = `
        <td style="text-align:left;">${ev.event_id}</td>
        <td style="text-align:left;"><strong>${ev.event_name}</strong></td>
        <td style="text-align:left;">
          ${formatDateDDMMMYYYY(ev.start_date)}
          ${ev.end_date ? ' to ' + formatDateDDMMMYYYY(ev.end_date) : ''}
        </td>
        <td style="text-align:left;">${ev.venue || ''}</td>
        <td style="text-align:left;">${ev.location || ''}</td>
        <td>
          <button class="event-action edit-btn" data-id="${ev.event_id}">Edit</button>
        </td>
      `;
      tbody.appendChild(tr);
      tr.querySelector('.edit-btn').onclick = () => openEditModal(ev.event_id, events);
    });

    setTimeout(() => {
      tbody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = (e) => openEditModal(e.target.dataset.id, events);
      });
    }, 0);
  }

  // Delete Confirmation Modal (HTML and Logic)
  if (!document.getElementById('deleteConfirmModal')) {
    const deleteModal = document.createElement('div');
    deleteModal.id = 'deleteConfirmModal';
    deleteModal.style.display = 'none';
    deleteModal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content" style="max-width:340px;">
        <form id="deleteConfirmForm" class="attendance-card" autocomplete="off">
          <h2>Delete Event</h2>
          <p style="color:#d32f2f;">Are you sure you want to delete this event? This action cannot be undone. Enter your password to confirm.</p>
          <label align="left" style="display:block;position:relative;">
            Password:
            <input type="password" name="delete_password" id="delete_password" required autocomplete="current-password" placeholder="Enter your password" style="padding-right:2.5em;">
            <button type="button" id="toggleDeletePwd" style="position:absolute;right:0.5em;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:1em;" tabindex="-1" aria-label="Show password">&#128065;</button>
          </label>
          <div id="deleteModalMsg" style="margin-bottom:1em;color:#d32f2f;"></div>
          <div class="modal-actions">
            <button type="submit" class="btn btn-danger">Delete</button>
            <button type="button" id="cancelDeleteBtn" class="btn">Cancel</button>
          </div>
        </form>
      </div>
      <style>
        #deleteConfirmModal { position:fixed;top:0;left:0;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;z-index:1001;}
        #deleteConfirmModal .modal-backdrop {position:absolute;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);}
        #deleteConfirmModal .modal-content {position:relative;background:#fff;padding:2rem;border-radius:8px;z-index:1;min-width:280px;}
        #deleteConfirmModal .modal-actions {margin-top:1rem;display:flex;gap:1rem;}

        /* Modal button styles */
.btn {
  padding: 0.6em 1.2em;
  border: none;
  border-radius: 6px;
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  margin: 0 0.2em;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
}

.btn-primary {
  background: #43a047;   /* Green shade */
  color: #fff;
  box-shadow: 0 1px 4px #0001;
}
.btn-primary:hover {
  background: #388e3c;   /* Darker green on hover */
}

.btn-danger {
  background: #d32f2f;
  color: #fff;
  box-shadow: 0 1px 4px #0001;
}
.btn-danger:hover {
  background: #b71c1c;
}

.btn-cancel {
  background: #f3f6fa;
  color: #333;
  box-shadow: 0 1px 4px #0001;
}
.btn-cancel:hover {
  background: #e0e0e0;
  color: #1976d2;
}

/* Make modal actions spaced and responsive */
.modal-actions {
  display: flex;
  gap: 1em;
  justify-content: center;
  margin-top: 1em;
}
      </style>
    `;
    document.body.appendChild(deleteModal);

    // Show/hide password toggle logic
    deleteModal.querySelector('#toggleDeletePwd').onclick = function() {
      const pwdInput = deleteModal.querySelector('#delete_password');
      pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
      this.innerHTML = pwdInput.type === 'password' ? '&#128065;' : '&#128068;';
    };
    // Delete confirmation handler
    document.getElementById('deleteConfirmForm').onsubmit = async function(e) {
      e.preventDefault();
      const eventId = e.target.dataset.eventId;
      const password = e.target.delete_password.value;
      const msgDiv = document.getElementById('deleteModalMsg');
      msgDiv.textContent = '';
      if (!password) {
        msgDiv.textContent = 'Password is required.';
        return;
      }

      // Add confirmation dialog before processing
      if (!window.confirm('Are you sure you want to permanently delete this event?')) {
        e.target.querySelector('button[type="submit"]').disabled = false;
        return;
      }

      e.target.querySelector('button[type="submit"]').disabled = true;
      try {
        const res = await fetch(`/api/events/${eventId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ password })
        });
        const result = await res.json();
        if (result.status === 'success') {
          msgDiv.style.color = '#1976d2';
          msgDiv.textContent = 'Event deleted.';
          setTimeout(() => {
            document.getElementById('deleteConfirmModal').style.display = 'none';
            document.getElementById('eventEditModal').style.display = 'none';
            loadUpcomingEvents();
            loadArchivedEvents();
            loadAllEvents();
          }, 800);
        } else {
          msgDiv.textContent = result.error || 'Delete failed.';
        }
      } catch {
        msgDiv.textContent = 'Network error.';
      }
      e.target.querySelector('button[type="submit"]').disabled = false;
    };

    // Cancel button handler
    document.getElementById('cancelDeleteBtn').onclick = function() {
      document.getElementById('deleteConfirmModal').style.display = 'none';
    };
  }

  // Global event listener for delete buttons
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('delete-btn')) {
      const eventId = e.target.getAttribute('data-id');
      const form = document.getElementById('deleteConfirmForm');
      form.dataset.eventId = eventId; // Store event ID in form
      document.getElementById('deleteConfirmModal').style.display = 'flex';
    }
  });

  // Status change handler (for both eventEditModal and deleteConfirmModal)
  form.status.onchange = async function() {
    const eventId = form.dataset.eventId;
    const status = form.status.value;
    form.status.disabled = true; // Disable while updating
    try {
      const res = await fetch(`/api/events/${eventId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const result = await res.json();
      if (res.ok && result.status === 'success') {
        showModalMessage('Status updated!');
        loadUpcomingEvents();
        loadArchivedEvents();
        loadAllEvents();
      } else {
        showModalMessage(result.message || 'Failed to update status.');
      }
    } catch {
      showModalMessage('Network error.');
    }
    form.status.disabled = false;
  };

  function showModalMessage(msg) {
    // Add a div in your modal for feedback, e.g. <div id="modalMsg"></div>
    document.getElementById('modalMsg').textContent = msg;
  }

  // Fetch user info (adjust endpoint as needed)
  const res = await fetch('/api/user', { credentials: 'include' });
  if (res.ok) {
    const user = await res.json();
    document.getElementById('userName').textContent = `Hello, ${user.firstName}`;
  }


});

  document.getElementById('logoutBtn').onclick = async () => {
    await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
    window.location.href = '/crfv/index';
  }; //server.js was used to handle this
