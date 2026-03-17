const API_URL = 'https://script.google.com/macros/s/AKfycbz8rsTh7FsEUbpq1FR33VMQ_2auDYpjuq6SJTbOmgzHqHSRThylSkpEe7ZTExBo8099jQ/exec';

const input = document.getElementById('rfidInput');
const status = document.getElementById('status');
const logsDiv = document.getElementById('logs');
const reloadBtn = document.getElementById('reloadBtn');
const syncBtn = document.getElementById('syncBtn');
let registeredList = [];  // 💡 store attendees here
let offlineLogs = JSON.parse(localStorage.getItem("offlineLogs") || "[]");

// Manual sync button handler
syncBtn.addEventListener("click", () => {
  status.textContent = "Manual sync started...";
  syncStoredLogs();
  focusInput();
});

async function loadRegisteredList() {
  status.textContent = "Loading registered data...";
  try {
    const res = await fetch(API_URL);
    registeredList = await res.json();
    status.textContent = "Ready to scan.";
  } catch (e) {
    status.textContent = "Failed to load registered data.";
  }
}

// Fetch registered list on load
window.addEventListener("load", async () => {
  try {
    const res = await fetch(API_URL);
    registeredList = await res.json();
    status.textContent = "Ready to scan.";
  } catch (e) {
    status.textContent = "Failed to load registered data.";
  }
});

// Reload button handler
reloadBtn.addEventListener("click", () => {
  loadRegisteredList();
  focusInput();
  console.log("Registered List:", registeredList);
});

function focusInput() {
  input.focus();
  input.select();
}

let customTimeSlots = null;

// Fetch custom time slots on load
async function loadTimeSlots() {
  try {
    const res = await fetch(API_URL + '?timeslots=1');
    customTimeSlots = await res.json();
    console.log("Loaded custom time slots:", customTimeSlots);
  } catch (e) {
    customTimeSlots = null;
    console.warn("Using default time slots.");
  }
}
window.addEventListener("load", loadTimeSlots);

function getSlot() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const current = h * 60 + m;

  // Use custom slots if loaded and valid
  if (customTimeSlots) {
    for (const [slot, value] of Object.entries(customTimeSlots)) {
      if (!value || !value.start || !value.end) continue;
      const [sh, sm] = value.start.split(":").map(Number);
      const [eh, em] = value.end.split(":").map(Number);
      if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) continue;
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      // Handle midnight wrap-around
      if (endMin > startMin) {
        if (current >= startMin && current < endMin) {
          return slot.replace("_", " ");
        }
      } else {
        // Slot wraps past midnight
        if (current >= startMin || current < endMin) {
          return slot.replace("_", " ");
        }
      }
    }
    // Fallback to default logic if no custom slot matches
    if (h < 12) return "AM IN";
    if (h >= 12 && h < 13) return "AM OUT";
    if (h >= 13 && h < 17) return "PM IN";
    return "PM OUT";
  }

  // Default fallback
  if (h < 12) return "AM IN";
  if (h >= 12 && h < 13) return "AM OUT";
  if (h >= 13 && h < 17) return "PM IN";
  return "PM OUT";
}

function logEntry(entry) {
  const logsDiv = document.getElementById('logs-main');
  if (!logsDiv) return;

  // Compose full name
  const fullName = `${entry.last_name}, ${entry.first_name}${entry.middle_name ? ' ' + entry.middle_name : ''}`;
  // Slot badge
  const slotBadge = `<span class="slot-badge" data-slot="${entry.slot || ''}">${entry.slot || ''}</span>`;
  // Late badge
  const lateBadge = isLate(entry) ? `<span class="late-label">LATE</span>` : '';
  // Organization
  const org = entry.organization ? `<span class="org">${entry.organization}</span>` : '';
  // Entry time
  const time = `<span class="log-time">${entry.time}</span>`;
  // Pending sync badge
  const logClass = entry.synced ? 'logged' : 'pending';
  const pendingBadge = !entry.synced
    ? `<span class="pending-label"><i class="fas fa-clock"></i> Pending Sync</span>`
    : '';

  const logHtml = `
    <li class="log-entry ${logClass}">
      <div class="log-main-row">
        <span class="log-name">${fullName}</span>
        <span class="slot-badge">${entry.slot || ''}</span>
        ${lateBadge}
        ${pendingBadge}
      </div>
      <div class="log-meta-row">
        <span class="log-time">${entry.time}</span>
        <span class="org">${entry.organization || ''}</span>
      </div>
    </li>
  `;

  // Remove 'new' class from previous first log if needed
  if (logsDiv.firstChild && logsDiv.firstChild.classList) logsDiv.firstChild.classList.remove('new');
  const temp = document.createElement('div');
  temp.innerHTML = logHtml;
  const newLog = temp.firstElementChild;
  newLog.classList.add('new');
  logsDiv.prepend(newLog);
}

function saveOffline(entry) {
  const logs = JSON.parse(localStorage.getItem("logs") || "[]");
  logs.push(entry);
  localStorage.setItem("logs", JSON.stringify(logs));
}

function syncStoredLogs() {
  if (!navigator.onLine) return;
  if (!offlineLogs.length) {
    status.textContent = "No offline logs to sync.";
    return;
  }

  let logsToSync = [...offlineLogs];
  let syncedCount = 0;
  let failed = false;

  offlineLogs.forEach(async (log, idx) => {
    try {
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log)
      });
      syncedCount++;
      offlineLogs = offlineLogs.filter(l => l !== log);
      localStorage.setItem("offlineLogs", JSON.stringify(offlineLogs));
      logEntry({ ...log, synced: true });
      if (syncedCount === logsToSync.length && !failed) {
        status.textContent = "All offline logs synced!";
      }
    } catch (e) {
      failed = true;
      status.innerHTML = `Sync failed. <button id="retrySyncBtn">Retry</button>`;
      document.getElementById('retrySyncBtn').onclick = syncStoredLogs;
    }
  });
}

function isLate(entry) {
  // Default cutoff times
  let amLateHour = 9, amLateMinute = 0;
  let pmLateHour = 13, pmLateMinute = 0;

  // Check custom timeslots if available
  if (customTimeSlots) {
    // For AM IN, use AM_START as cutoff if present, else AM_IN.start
    if (entry.slot === "AM IN") {
      let cutoff = null;
      if (customTimeSlots.AM_START && customTimeSlots.AM_START.start) {
        cutoff = customTimeSlots.AM_START.start;
      } else if (customTimeSlots.AM_IN && customTimeSlots.AM_IN.start) {
        cutoff = customTimeSlots.AM_IN.start;
      }
      if (cutoff) {
        const [h, m] = cutoff.split(":").map(Number);
        amLateHour = h;
        amLateMinute = m;
      }
    }
    // For PM IN, use PM_START as cutoff if present, else PM_IN.start
    if (entry.slot === "PM IN") {
      let cutoff = null;
      if (customTimeSlots.PM_START && customTimeSlots.PM_START.start) {
        cutoff = customTimeSlots.PM_START.start;
      } else if (customTimeSlots.PM_IN && customTimeSlots.PM_IN.start) {
        cutoff = customTimeSlots.PM_IN.start;
      }
      if (cutoff) {
        const [h, m] = cutoff.split(":").map(Number);
        pmLateHour = h;
        pmLateMinute = m;
      }
    }
  }

  // Parse entry time
  const [h, m] = entry.time.split(":").map(Number);

  if (entry.slot === "AM IN") {
    // Late if after AM cutoff
    return (h > amLateHour) || (h === amLateHour && m > amLateMinute);
  }
  if (entry.slot === "PM IN") {
    // Late if after PM cutoff
    return (h > pmLateHour) || (h === pmLateHour && m > pmLateMinute);
  }
  // You can add more rules for other slots if needed
  return false;
}



input.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    let rfid = input.value.trim();
    input.value = "";
    focusInput();

    if (!rfid) return;

    rfid = stripLeadingZeros(rfid);

    const match = registeredList.find(entry => String(entry.rfid).replace(/^0+/, '') === rfid);
    const now = new Date();
    const entry = {
      rfid: rfid,
      id_number: match ? (match.id_number || "") : "",
      last_name: match ? (match.last_name || "") : "",
      first_name: match ? (match.first_name || "") : "",
      middle_name: match ? (match.middle_name || "") : "",
      organization: match ? (match.organization || "") : "",
      contact_no: match ? String(match.contact_no || "") : "",
      date: now.toISOString().split("T")[0],
      time: now.toLocaleTimeString(),
      slot: getSlot(),
      synced: false
      
    };
        console.log("Match:", match);
        // Print name and contact number after scanning
    if (match) {
      status.textContent = `Registered: ${rfid} | Name: ${entry.last_name}, ${entry.first_name} `;
    } else {
      status.textContent = `Unregistered RFID: ${rfid}`;
    }

      const helloLabel = document.getElementById('helloLabel');
// ...inside your input keydown handler, after creating entry...
if (match) {
  helloLabel.textContent = `Hello, ${entry.first_name} ${entry.last_name}`;
} else {
  helloLabel.textContent = '';
}

    if (!navigator.onLine) {
      offlineLogs.push(entry);
      localStorage.setItem("offlineLogs", JSON.stringify(offlineLogs));
      logEntry(entry);
      return;
    }

    fetch(API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry)
    }).then(() => {
      entry.synced = true;
      logEntry(entry);
      syncStoredLogs();
    }).catch(() => {
      offlineLogs.push(entry);
      localStorage.setItem("offlineLogs", JSON.stringify(offlineLogs));
      logEntry(entry);
    });
  }


});

function updateClock() {
  const now = new Date();
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  document.getElementById('clock').textContent = now.toLocaleDateString('en-US', options);
}
setInterval(updateClock, 1000);
document.addEventListener("DOMContentLoaded", updateClock);
window.addEventListener('DOMContentLoaded', focusInput);

// Optionally update stats
function updateStats(count) {
  const stats = document.getElementById('stats');
  if (stats) stats.textContent = `Today: ${count} attendees`;
}

function stripLeadingZeros(str) {
  return String(str).replace(/^0+/, '');
}

document.addEventListener('click', function(e) {
  // If modal is open, do not focus RFID input
  const modal = document.getElementById('miniLoginModal');
  if (modal && modal.style.display !== 'none') return;
  if (e.target !== input) {
    focusInput();
  }
});

function updateSystemIndicator() {
  const indicator = document.getElementById('system-indicator');
  if (!indicator) return;
  if (navigator.onLine) {
    indicator.classList.add('system-online');
    indicator.classList.remove('system-offline');
    status.innerHTML = `<span id="system-indicator" class="system-online"></span>Ready for next scan`;
  } else {
    indicator.classList.add('system-offline');
    indicator.classList.remove('system-online');
    status.innerHTML = `<span id="system-indicator" class="system-offline"></span>Offline - logs will be saved locally`;
  }
}
window.addEventListener('online', () => {
  updateSystemIndicator();
  syncStoredLogs();
});
window.addEventListener('offline', updateSystemIndicator);
document.addEventListener('DOMContentLoaded', updateSystemIndicator);

function renderLogs(logs) {
  const logsDiv = document.getElementById('logs-main');
  logsDiv.innerHTML = '';
  if (!logs || logs.length === 0) {
    logsDiv.innerHTML = `
      <div class="empty-logs">
        <i class="fas fa-inbox"></i>
        <div>No attendance logs yet.</div>
      </div>
    `;
    return;
  }
  logs.forEach(entry => logEntry(entry));
}

// Sidebar toggle
document.querySelector('.sidebar-toggle').addEventListener('click', function() {
  const actions = document.getElementById('sidebar-actions');
  const expanded = this.getAttribute('aria-expanded') === 'true';
  this.setAttribute('aria-expanded', !expanded);
  actions.classList.toggle('open');
});

document.getElementById('downloadLogsBtn').addEventListener('click', function () {
  // Only download offline logs
  let logs = offlineLogs || [];

  if (!logs.length) {
    alert("No offline logs to download.");
    return;
  }

  // Prepare CSV content
  const headers = [
    "RFID", "ID Number", "Last Name", "First Name", "Middle Name",
    "Organization", "Contact No", "Date", "Time", "Slot", "Late", "Synced"
  ];
  const rows = logs.map(entry => [
    entry.rfid,
    entry.id_number,
    entry.last_name,
    entry.first_name,
    entry.middle_name,
    entry.organization,
    entry.contact_no,
    entry.date,
    entry.time,
    entry.slot,
    isLate(entry) ? "Yes" : "No",
    entry.synced ? "Yes" : "No"
  ]);
  const csvContent = [headers].concat(rows)
    .map(row => row.map(val => `"${(val || '').toString().replace(/"/g, '""')}"`).join(","))
    .join("\r\n");

  // Create a Blob and trigger download
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "offline_attendance_logs.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

function downloadOfflineLogsXLSX() {
  if (!offlineLogs || offlineLogs.length === 0) return;

  const headers = [
    "RFID", "ID Number", "Last Name", "First Name", "Middle Name",
    "Organization", "Contact No", "Date", "Time", "Slot", "Late", "Synced"
  ];
  const data = offlineLogs.map(entry => [
    entry.rfid,
    entry.id_number,
    entry.last_name,
    entry.first_name,
    entry.middle_name,
    entry.organization,
    entry.contact_no,
    entry.date,
    entry.time,
    entry.slot,
    isLate(entry) ? "Yes" : "No",
    entry.synced ? "Yes" : "No"
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Offline Logs");
  XLSX.writeFile(wb, "offline_attendance_logs.xlsx");
}

window.addEventListener('beforeunload', function (e) {
  if (offlineLogs && offlineLogs.length > 0) {
    // Attempt to auto-download XLSX
    downloadOfflineLogsXLSX();
    e.preventDefault();
    e.returnValue = 'You have unsynced attendance logs. They have been downloaded, but please sync or save before leaving!';
    return e.returnValue;
  }
});

// --- Mini Login Modal Logic ---
function trapFocus(modal) {
  const focusable = modal.querySelectorAll('input, button, [tabindex]:not([tabindex="-1"])');
  let first = focusable[0];
  let last = focusable[focusable.length - 1];
  modal.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  });
}

function showMiniLoginModal() {
  const modal = document.getElementById('miniLoginModal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  modal.focus();
  trapFocus(modal);
  setTimeout(() => document.getElementById('miniUsername').focus(), 100);
}

function hideMiniLoginModal() {
  document.getElementById('miniLoginModal').style.display = 'none';
  document.body.style.overflow = '';
}

function handleMiniLogin() {
  document.getElementById('miniLoginForm').onsubmit = async function(e) {
    e.preventDefault();
    const user = document.getElementById('miniUsername').value.trim();
    const pass = document.getElementById('miniPassword').value;
    const errorDiv = document.getElementById('miniLoginError');
    errorDiv.textContent = '';
    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIDNumber: user, password: pass })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        errorDiv.textContent = data.message || 'Invalid username or password.';
        // Keep focus in modal for retry
        setTimeout(() => {
          if (!user) {
            document.getElementById('miniUsername').focus();
          } else {
            document.getElementById('miniPassword').focus();
          }
        }, 10);
      }
    } catch {
      errorDiv.textContent = 'Network error. Please try again.';
      setTimeout(() => document.getElementById('miniUsername').focus(), 10);
    }
  };

  // Show/hide password toggle
  const pwInput = document.getElementById('miniPassword');
  const toggle = document.getElementById('miniTogglePassword');
  toggle.onclick = function() {
    pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
    toggle.textContent = pwInput.type === 'password' ? '👁️' : '🙈';
  };
  toggle.onkeydown = function(e) {
    if (e.key === 'Enter' || e.key === ' ') toggle.click();
  };
}

async function checkAuthAndShowModal() {
  try {
    const res = await fetch('/api/check-auth', { credentials: 'same-origin' });
    if (res.ok) {
      // Authenticated: hide modal, focus RFID input
      hideMiniLoginModal();
      focusInput();
    } else {
      // Not authenticated: show modal
      showMiniLoginModal();
      handleMiniLogin();
    }
  } catch {
    // On error, show modal
    showMiniLoginModal();
    handleMiniLogin();
  }
}

document.addEventListener('DOMContentLoaded', checkAuthAndShowModal);

// --- Logout Logic ---
document.querySelector('.btn-logout').onclick = async function() {
  // Download unsynced logs before logout
  if (offlineLogs && offlineLogs.length > 0) {
    downloadOfflineLogsXLSX();
    await new Promise(r => setTimeout(r, 800)); // Give time for download
  }
  // Call backend logout
  await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
  window.location.reload();
};