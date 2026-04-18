const COLUMN_PICKER_KEY = 'paymentReportsColumns';
const COLUMN_PICKER_MAX_WIDTH = 420;
const COLUMN_PICKER_MIN_WIDTH = 320;
const COLUMN_PICKER_VIEWPORT_PADDING = 24;
const COLUMN_PICKER_MOBILE_BREAKPOINT = 980;
const CANONICAL_PAYMENT_STATUS_OPTIONS = [
  'Fully Paid',
  'Partially Paid',
  'Accounts Receivable'
];
const DEFAULT_VISIBLE_KEYS = [
  'attendee_no',
  'last_name',
  'first_name',
  'organization',
  'payment_status',
  'amount',
  'notes'
];
const DEFAULT_VISIBLE_KEY_SET = new Set(DEFAULT_VISIBLE_KEYS);
const EDITABLE_PAYMENT_FIELDS = [
  'payment_status',
  'amount',
  'form_of_payment',
  'date_full_payment',
  'date_partial_payment',
  'account',
  'or_number',
  'quickbooks_no',
  'shipping_tracking_no',
  'notes'
];

const COLUMN_DEFINITIONS = [
  {
    key: 'attendee_no',
    label: 'Attendee No',
    render: (row) => escapeHtml(row.attendee_no || '-')
  },
  {
    key: 'first_name',
    label: 'First Name',
    render: (row) => escapeHtml(row.first_name || '-')
  },
  {
    key: 'last_name',
    label: 'Last Name',
    render: (row) => escapeHtml(row.last_name || '-')
  },
  {
    key: 'organization',
    label: 'Organization',
    render: (row) => escapeHtml(row.organization || '-')
  },
  {
    key: 'payment_status',
    label: 'Payment Status',
    render: renderPaymentStatusCell
  },
  {
    key: 'amount',
    label: 'Amount',
    render: (row) => `PHP ${escapeHtml(formatCurrency(row.amount))}`
  },
  {
    key: 'form_of_payment',
    label: 'Form of Payment',
    render: (row) => escapeHtml(row.form_of_payment || '-')
  },
  {
    key: 'date_full_payment',
    label: 'Date Full Payment',
    render: (row) => escapeHtml(formatDate(row.date_full_payment))
  },
  {
    key: 'date_partial_payment',
    label: 'Date Partial Payment',
    render: (row) => escapeHtml(formatDate(row.date_partial_payment))
  },
  {
    key: 'account',
    label: 'Account',
    render: (row) => escapeHtml(row.account || '-')
  },
  {
    key: 'or_number',
    label: 'OR Number',
    render: (row) => escapeHtml(row.or_number || '-')
  },
  {
    key: 'quickbooks_no',
    label: 'QuickBooks No',
    render: (row) => escapeHtml(row.quickbooks_no || '-')
  },
  {
    key: 'shipping_tracking_no',
    label: 'Shipping Tracking No',
    render: (row) => escapeHtml(row.shipping_tracking_no || '-')
  },
  {
    key: 'notes',
    label: 'Notes',
    cellClass: 'payment-report-notes-cell',
    render: (row) => escapeHtml(row.notes || '-')
  },
  {
    key: 'created_at',
    label: 'Created At',
    render: (row) => escapeHtml(formatDateTime(row.created_at))
  }
];

const DETAILS_COLUMN = {
  key: '_details',
  label: 'Details',
  cellClass: 'payment-report-details-cell',
  render: (row) => `
    <button
      type="button"
      class="payment-report-details-btn"
      data-payment-id="${escapeHtml(row.payment_id || '')}"
    >
      Details
    </button>
  `
};

const state = {
  events: [],
  selectedEventId: '',
  currentUserRole: 'manager',
  paymentData: [],
  filteredData: [],
  currentPage: 1,
  rowsPerPage: 25,
  searchDebounceId: null,
  visibleColumnKeys: [...DEFAULT_VISIBLE_KEYS]
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizePaymentStatus(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/recievable/g, 'receivable');
}

function titleizeStatus(value) {
  return String(value || '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getCanonicalPaymentStatus(value) {
  const status = normalizePaymentStatus(value);

  if (status === 'paid' || status === 'fully paid') {
    return 'Fully Paid';
  }

  if (
    status === 'partially paid' ||
    status === 'partial paid' ||
    status === 'partial'
  ) {
    return 'Partially Paid';
  }

  if (
    status === '' ||
    status === 'accounts receivable' ||
    status === 'ar' ||
    status === 'unpaid' ||
    status === 'pending'
  ) {
    return 'Accounts Receivable';
  }

  return titleizeStatus(status);
}

function categorizePaymentStatus(value) {
  const canonicalStatus = getCanonicalPaymentStatus(value);

  if (canonicalStatus === 'Fully Paid') {
    return 'paid';
  }

  if (canonicalStatus === 'Partially Paid') {
    return 'partial';
  }

  return 'receivable';
}

function compareStatusOptions(left, right) {
  const order = new Map([
    ['Fully Paid', 1],
    ['Partially Paid', 2],
    ['Accounts Receivable', 3]
  ]);

  const leftRank = order.get(left) || 99;
  const rightRank = order.get(right) || 99;
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return String(left).localeCompare(String(right));
}

function createStatusOptions(rows) {
  return Array.from(
    new Set(
      (Array.isArray(rows) ? rows : [])
        .map((row) => getCanonicalPaymentStatus(row?.payment_status))
        .filter(Boolean)
    )
  ).sort(compareStatusOptions);
}

function parseAmount(value) {
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(amount) {
  return Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = parseDateValue(value);
  if (!date) {
    return String(value);
  }

  return date.toLocaleString();
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).replace(/\.\d{6}/, '');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDateToken(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sanitizeFileToken(value, fallback = 'payment-report') {
  const token = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return token || fallback;
}

function truncateText(value, maxLength = 40) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength).trim();
}

function getExportColumns() {
  return getVisibleColumns().filter((column) => column.key !== DETAILS_COLUMN.key);
}

function getDisplayExportValue(row, columnKey) {
  if (columnKey === 'payment_status') {
    return getCanonicalPaymentStatus(row.payment_status);
  }

  if (columnKey === 'amount') {
    return formatCurrency(row.amount);
  }

  if (columnKey === 'date_full_payment' || columnKey === 'date_partial_payment') {
    return formatDate(row[columnKey]);
  }

  if (columnKey === 'created_at') {
    return formatDateTime(row.created_at);
  }

  return row[columnKey] ?? '';
}

function getTypedExportValue(row, columnKey) {
  if (columnKey === 'payment_status') {
    return getCanonicalPaymentStatus(row.payment_status);
  }

  if (columnKey === 'amount') {
    const amount = Number.parseFloat(row.amount);
    return Number.isFinite(amount) ? amount : null;
  }

  if (columnKey === 'date_full_payment' || columnKey === 'date_partial_payment') {
    return parseDateValue(row[columnKey]) || null;
  }

  if (columnKey === 'created_at') {
    return parseDateValue(row.created_at) || null;
  }

  return row[columnKey] ?? '';
}

function buildExportContext(scope, rowCount) {
  const event = getSelectedEvent();
  const eventId = event?.event_id || state.selectedEventId || 'selected-event';
  const eventName = event?.event_name || getSelectedEventLabel();
  const startDate = event?.start_date ? formatDate(event.start_date) : '';
  const scopeLabel = scope === 'all' ? 'All Rows' : 'Filtered Rows';
  const eventIdToken = sanitizeFileToken(eventId, 'selected-event');
  const eventNameToken = sanitizeFileToken(truncateText(eventName, 36), eventIdToken);
  const fileBase = `payment-report-${eventIdToken}-${eventNameToken}-${sanitizeFileToken(scopeLabel)}-${formatDateToken()}`;
  const subtitleParts = [
    `${eventName} (${eventId})`,
    scopeLabel,
    `${rowCount} row${rowCount === 1 ? '' : 's'}`
  ];

  if (startDate && startDate !== '-') {
    subtitleParts.splice(1, 0, `Start Date: ${startDate}`);
  }

  return {
    eventId,
    eventName,
    scopeLabel,
    fileBase,
    sheetName: truncateText(`Payments ${eventId}`, 31),
    pdfTitle: 'Payment Report',
    pdfSubtitle: subtitleParts.join(' | ')
  };
}

function applyWorksheetFormats(worksheet, exportColumns, rowCount) {
  exportColumns.forEach((column, columnIndex) => {
    const needsDateFormat =
      column.key === 'date_full_payment' ||
      column.key === 'date_partial_payment' ||
      column.key === 'created_at';
    const needsAmountFormat = column.key === 'amount';

    if (!needsDateFormat && !needsAmountFormat) {
      return;
    }

    for (let rowOffset = 0; rowOffset < rowCount; rowOffset += 1) {
      const cellRef = XLSX.utils.encode_cell({ r: rowOffset + 1, c: columnIndex });
      const cell = worksheet[cellRef];
      if (!cell) {
        continue;
      }

      if (needsAmountFormat && typeof cell.v === 'number') {
        cell.z = '#,##0.00';
      }

      if (needsDateFormat && cell.v) {
        cell.z = column.key === 'created_at' ? 'yyyy-mm-dd hh:mm' : 'yyyy-mm-dd';
      }
    }
  });
}

async function chooseExportScope(fileFormatLabel) {
  const selection = await window.crfvDialog.confirm(
    `Choose which payment rows to export as ${fileFormatLabel} for ${getSelectedEventLabel()}.`,
    {
      title: `Export ${fileFormatLabel}`,
      confirmLabel: 'Export all',
      extraActionLabel: 'Export filtered',
      extraActionResult: 'filtered',
      cancelLabel: 'Cancel',
      dismissResult: null
    }
  );

  if (selection === true) {
    return 'all';
  }

  if (selection === 'filtered') {
    return 'filtered';
  }

  return null;
}

function getExportRows(scope) {
  return scope === 'all' ? state.paymentData : state.filteredData;
}

function getStatusTone(statusLabel) {
  const category = categorizePaymentStatus(statusLabel);
  if (category === 'paid') {
    return 'is-paid';
  }
  if (category === 'partial') {
    return 'is-partial';
  }
  return 'is-receivable';
}

function renderPaymentStatusCell(row) {
  const label = getCanonicalPaymentStatus(row.payment_status);
  return `<span class="payment-status-pill ${escapeHtml(getStatusTone(label))}">${escapeHtml(label)}</span>`;
}

function getRequestedEventId() {
  return new URLSearchParams(window.location.search).get('event_id') || '';
}

function updateEventQueryParam(eventId) {
  const url = new URL(window.location.href);
  if (eventId) {
    url.searchParams.set('event_id', eventId);
  } else {
    url.searchParams.delete('event_id');
  }
  window.history.replaceState({}, '', url.toString());
}

function getSelectedEvent() {
  return state.events.find((event) => event.event_id === state.selectedEventId) || null;
}

function getSelectedEventLabel() {
  const event = getSelectedEvent();
  if (!event) {
    return 'the selected event';
  }

  return event.event_name || event.event_id || 'the selected event';
}

function updatePaymentAuditsLink() {
  const link = document.getElementById('openPaymentAuditsLink');
  if (!link) {
    return;
  }

  link.href = state.selectedEventId
    ? `/crfv/payment-audits?event_id=${encodeURIComponent(state.selectedEventId)}`
    : '/crfv/payment-audits';
}

function sanitizeVisibleColumnKeys(keys, fallbackKeys = DEFAULT_VISIBLE_KEYS) {
  const allowedKeys = new Set(COLUMN_DEFINITIONS.map((column) => column.key));
  const requestedKeys = Array.isArray(keys) ? keys : fallbackKeys;
  const requestedSet = new Set(requestedKeys.filter((key) => allowedKeys.has(key)));
  const orderedKeys = COLUMN_DEFINITIONS
    .filter((column) => requestedSet.has(column.key))
    .map((column) => column.key);

  if (orderedKeys.length > 0) {
    return orderedKeys;
  }

  return COLUMN_DEFINITIONS
    .filter((column) => fallbackKeys.includes(column.key))
    .map((column) => column.key);
}

function applyVisibleColumnKeys(keys) {
  state.visibleColumnKeys = sanitizeVisibleColumnKeys(keys);
}

function saveColumnPrefs() {
  try {
    window.localStorage.setItem(COLUMN_PICKER_KEY, JSON.stringify(state.visibleColumnKeys));
  } catch (error) {
    console.warn('Failed to save payment report column preferences.', error);
  }
}

function loadColumnPrefs() {
  try {
    const storedValue = window.localStorage.getItem(COLUMN_PICKER_KEY);
    if (!storedValue) {
      applyVisibleColumnKeys(DEFAULT_VISIBLE_KEYS);
      return;
    }

    const parsedKeys = JSON.parse(storedValue);
    applyVisibleColumnKeys(parsedKeys);
  } catch (error) {
    console.warn('Failed to load payment report column preferences.', error);
    applyVisibleColumnKeys(DEFAULT_VISIBLE_KEYS);
  }
}

function getColumnPickerSections() {
  const defaultColumns = [];
  const detailColumns = [];

  COLUMN_DEFINITIONS.forEach((column) => {
    if (DEFAULT_VISIBLE_KEY_SET.has(column.key)) {
      defaultColumns.push(column);
      return;
    }

    detailColumns.push(column);
  });

  return [
    {
      title: 'Default View',
      description: 'Recommended columns for routine event payment maintenance.',
      columns: defaultColumns
    },
    {
      title: 'More Details',
      description: 'Additional payment-reference fields for deeper event review.',
      columns: detailColumns
    }
  ];
}

function getVisibleColumns() {
  const visibleKeys = new Set(state.visibleColumnKeys);
  const visibleColumns = COLUMN_DEFINITIONS.filter((column) => visibleKeys.has(column.key));
  visibleColumns.push(DETAILS_COLUMN);
  return visibleColumns;
}

function areColumnKeyListsEqual(leftKeys, rightKeys) {
  if (!Array.isArray(leftKeys) || !Array.isArray(rightKeys) || leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key, index) => key === rightKeys[index]);
}

function isColumnPickerMobileViewport() {
  return window.matchMedia(`(max-width: ${COLUMN_PICKER_MOBILE_BREAKPOINT}px)`).matches;
}

function isColumnPickerOpen(pickerDropdown) {
  return Boolean(pickerDropdown) && pickerDropdown.style.display === 'grid';
}

function resetColumnPickerLayout(pickerDropdown) {
  pickerDropdown.classList.remove('is-aligned-left', 'is-aligned-right');
  pickerDropdown.style.removeProperty('--column-picker-horizontal-offset');
  pickerDropdown.style.removeProperty('width');
  pickerDropdown.style.removeProperty('max-width');
  pickerDropdown.style.removeProperty('min-width');
}

function applyColumnPickerAlignment(pickerDropdown, alignment) {
  pickerDropdown.classList.remove('is-aligned-left', 'is-aligned-right');
  pickerDropdown.classList.add(alignment === 'right' ? 'is-aligned-right' : 'is-aligned-left');
  pickerDropdown.style.setProperty('--column-picker-horizontal-offset', '0px');
}

function getColumnPickerOverflow(rect) {
  const maxRight = window.innerWidth - COLUMN_PICKER_VIEWPORT_PADDING;
  const leftOverflow = Math.max(COLUMN_PICKER_VIEWPORT_PADDING - rect.left, 0);
  const rightOverflow = Math.max(rect.right - maxRight, 0);

  return {
    total: leftOverflow + rightOverflow,
    left: leftOverflow,
    right: rightOverflow
  };
}

function positionColumnPicker(pickerDropdown) {
  resetColumnPickerLayout(pickerDropdown);

  if (isColumnPickerMobileViewport()) {
    applyColumnPickerAlignment(pickerDropdown, 'left');
    return;
  }

  const viewportSafeWidth = Math.max(240, window.innerWidth - (COLUMN_PICKER_VIEWPORT_PADDING * 2));
  const dropdownWidth = Math.min(COLUMN_PICKER_MAX_WIDTH, viewportSafeWidth);
  const minWidth = Math.min(COLUMN_PICKER_MIN_WIDTH, dropdownWidth);

  pickerDropdown.style.width = `${dropdownWidth}px`;
  pickerDropdown.style.maxWidth = `${viewportSafeWidth}px`;
  pickerDropdown.style.minWidth = `${minWidth}px`;

  applyColumnPickerAlignment(pickerDropdown, 'right');
  const rightRect = pickerDropdown.getBoundingClientRect();
  const rightOverflow = getColumnPickerOverflow(rightRect);
  if (rightOverflow.total === 0) {
    return;
  }

  applyColumnPickerAlignment(pickerDropdown, 'left');
  const leftRect = pickerDropdown.getBoundingClientRect();
  const leftOverflow = getColumnPickerOverflow(leftRect);
  if (leftOverflow.total === 0) {
    return;
  }

  const bestAlignment = rightOverflow.total <= leftOverflow.total ? 'right' : 'left';
  const bestOverflow = bestAlignment === 'right' ? rightOverflow : leftOverflow;

  applyColumnPickerAlignment(pickerDropdown, bestAlignment);

  let horizontalOffset = 0;
  if (bestOverflow.left > 0) {
    horizontalOffset = bestOverflow.left;
  } else if (bestOverflow.right > 0) {
    horizontalOffset = -bestOverflow.right;
  }

  pickerDropdown.style.setProperty('--column-picker-horizontal-offset', `${horizontalOffset}px`);
}

function updateColumnPickerTriggerState() {
  const pickerButton = document.getElementById('showColumnPickerBtn');
  const pickerDropdown = document.getElementById('columnPickerDropdown');
  const count = document.getElementById('columnPickerCount');
  const visibleCount = state.visibleColumnKeys.length;

  if (count) {
    count.textContent = `${visibleCount} visible`;
  }

  if (pickerButton) {
    pickerButton.setAttribute('aria-label', `Columns, ${visibleCount} visible`);
    pickerButton.classList.toggle('is-open', isColumnPickerOpen(pickerDropdown));
  }
}

function applyAndRenderVisibleColumnKeys(keys) {
  applyVisibleColumnKeys(keys);
  saveColumnPrefs();
  renderColumnPicker();
  renderRecords();
}

function renderColumnPicker() {
  const pickerDropdown = document.getElementById('columnPickerDropdown');
  if (!pickerDropdown) {
    return;
  }

  const visibleKeys = new Set(state.visibleColumnKeys);
  pickerDropdown.innerHTML = '';
  pickerDropdown.setAttribute('aria-label', 'Column visibility options');

  const header = document.createElement('div');
  header.className = 'payment-report-column-menu__header';

  const headingGroup = document.createElement('div');
  headingGroup.className = 'payment-report-column-menu__heading-group';

  const title = document.createElement('p');
  title.className = 'payment-report-column-menu__title';
  title.textContent = 'Visible Columns';

  const helper = document.createElement('p');
  helper.className = 'payment-report-column-menu__helper';
  helper.textContent = 'Choose which columns appear in the table. At least one must stay visible.';

  headingGroup.appendChild(title);
  headingGroup.appendChild(helper);

  const summary = document.createElement('span');
  summary.className = 'payment-report-column-menu__summary';
  summary.textContent = `${visibleKeys.size} of ${COLUMN_DEFINITIONS.length} visible`;

  header.appendChild(headingGroup);
  header.appendChild(summary);

  const actions = document.createElement('div');
  actions.className = 'payment-report-column-menu__actions';

  const showAllButton = document.createElement('button');
  showAllButton.type = 'button';
  showAllButton.className = 'payment-report-column-menu__action';
  showAllButton.textContent = 'Show all';
  showAllButton.disabled = visibleKeys.size === COLUMN_DEFINITIONS.length;
  showAllButton.addEventListener('click', () => {
    applyAndRenderVisibleColumnKeys(COLUMN_DEFINITIONS.map((column) => column.key));
  });

  const resetDefaultsButton = document.createElement('button');
  resetDefaultsButton.type = 'button';
  resetDefaultsButton.className = 'payment-report-column-menu__action';
  resetDefaultsButton.textContent = 'Reset default';
  resetDefaultsButton.disabled = areColumnKeyListsEqual(state.visibleColumnKeys, DEFAULT_VISIBLE_KEYS);
  resetDefaultsButton.addEventListener('click', () => {
    applyAndRenderVisibleColumnKeys(DEFAULT_VISIBLE_KEYS);
  });

  actions.appendChild(showAllButton);
  actions.appendChild(resetDefaultsButton);

  const sections = document.createElement('div');
  sections.className = 'payment-report-column-menu__sections';

  getColumnPickerSections().forEach((section) => {
    const sectionElement = document.createElement('section');
    sectionElement.className = 'payment-report-column-menu__section';

    const sectionTitle = document.createElement('p');
    sectionTitle.className = 'payment-report-column-menu__section-title';
    sectionTitle.textContent = section.title;

    const sectionDescription = document.createElement('p');
    sectionDescription.className = 'payment-report-column-menu__section-description';
    sectionDescription.textContent = section.description;

    const optionList = document.createElement('div');
    optionList.className = 'payment-report-column-menu__option-list';

    section.columns.forEach((column) => {
      const label = document.createElement('label');
      label.className = `payment-report-column-option${visibleKeys.has(column.key) ? ' is-active' : ''}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = column.key;
      checkbox.checked = visibleKeys.has(column.key);

      const labelText = document.createElement('span');
      labelText.className = 'payment-report-column-option__label';
      labelText.textContent = column.label;

      checkbox.addEventListener('change', async () => {
        const nextKeys = new Set(state.visibleColumnKeys);
        if (checkbox.checked) {
          nextKeys.add(column.key);
        } else {
          nextKeys.delete(column.key);
        }

        if (nextKeys.size === 0) {
          checkbox.checked = true;
          await window.crfvDialog.alert('Keep at least one visible column in the payment report table.', { tone: 'info' });
          return;
        }

        applyAndRenderVisibleColumnKeys(Array.from(nextKeys));
      });

      label.appendChild(checkbox);
      label.appendChild(labelText);
      optionList.appendChild(label);
    });

    sectionElement.appendChild(sectionTitle);
    sectionElement.appendChild(sectionDescription);
    sectionElement.appendChild(optionList);
    sections.appendChild(sectionElement);
  });

  pickerDropdown.appendChild(header);
  pickerDropdown.appendChild(actions);
  pickerDropdown.appendChild(sections);

  updateColumnPickerTriggerState();

  if (isColumnPickerOpen(pickerDropdown)) {
    positionColumnPicker(pickerDropdown);
  }
}

function setupColumnPicker() {
  const pickerButton = document.getElementById('showColumnPickerBtn');
  const pickerDropdown = document.getElementById('columnPickerDropdown');
  if (!pickerButton || !pickerDropdown) {
    return;
  }

  const closeColumnPicker = ({ returnFocus = false } = {}) => {
    pickerDropdown.style.display = 'none';
    pickerButton.setAttribute('aria-expanded', 'false');
    pickerDropdown.setAttribute('aria-hidden', 'true');
    updateColumnPickerTriggerState();

    if (returnFocus) {
      pickerButton.focus();
    }
  };

  const openColumnPicker = () => {
    pickerDropdown.style.display = 'grid';
    positionColumnPicker(pickerDropdown);
    pickerButton.setAttribute('aria-expanded', 'true');
    pickerDropdown.setAttribute('aria-hidden', 'false');
    updateColumnPickerTriggerState();
  };

  const syncOpenColumnPickerPosition = () => {
    if (isColumnPickerOpen(pickerDropdown)) {
      positionColumnPicker(pickerDropdown);
    }
  };

  renderColumnPicker();
  pickerButton.setAttribute('aria-expanded', 'false');
  pickerDropdown.setAttribute('aria-hidden', 'true');
  updateColumnPickerTriggerState();

  pickerButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isColumnPickerOpen(pickerDropdown)) {
      closeColumnPicker();
      return;
    }

    openColumnPicker();
  });

  pickerDropdown.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  document.addEventListener('click', (event) => {
    if (!pickerDropdown.contains(event.target) && !pickerButton.contains(event.target)) {
      closeColumnPicker();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isColumnPickerOpen(pickerDropdown)) {
      event.preventDefault();
      closeColumnPicker({ returnFocus: true });
    }
  });

  window.addEventListener('resize', syncOpenColumnPickerPosition);
}

async function loadCurrentUserRole() {
  try {
    const response = await fetch('/api/check-auth', { credentials: 'same-origin' });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    const role = String(data?.user?.role || '').trim().toLowerCase();
    if (role === 'admin' || role === 'manager') {
      state.currentUserRole = role;
    }
  } catch (error) {
    console.warn('Unable to determine the current user role for payment reports.', error);
  }
}

function populateEventSelect() {
  const eventSelect = document.getElementById('eventSelect');
  if (!eventSelect) {
    return;
  }

  eventSelect.innerHTML = '<option value="">-- Select an Event --</option>';
  state.events.forEach((event) => {
    const option = document.createElement('option');
    option.value = event.event_id;
    option.textContent = `${event.event_name} (${formatDate(event.start_date)})`;
    eventSelect.appendChild(option);
  });
  eventSelect.value = state.selectedEventId;
}

async function loadEvents() {
  const eventSelect = document.getElementById('eventSelect');
  if (!eventSelect) {
    return;
  }

  const requestedEventId = getRequestedEventId();

  eventSelect.disabled = true;
  eventSelect.innerHTML = '<option value="">Loading events...</option>';

  try {
    const response = await fetch('/api/events/all', { credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error('Failed to load events.');
    }

    const data = await response.json();
    const events = Array.isArray(data) ? data : data.events || [];
    state.events = [...events].sort((left, right) => String(right.start_date || '').localeCompare(String(left.start_date || '')));

    if (requestedEventId && state.events.some((event) => event.event_id === requestedEventId)) {
      state.selectedEventId = requestedEventId;
    }

    populateEventSelect();
    updatePaymentAuditsLink();
    eventSelect.disabled = false;
  } catch (error) {
    console.error('Unable to load payment report events.', error);
    eventSelect.innerHTML = '<option value="">Unable to load events</option>';
  }
}

function sortPaymentRows(rows) {
  return [...rows].sort((left, right) => {
    const rightCreatedAt = String(right.created_at || '');
    const leftCreatedAt = String(left.created_at || '');
    if (rightCreatedAt !== leftCreatedAt) {
      return rightCreatedAt.localeCompare(leftCreatedAt);
    }

    const leftName = `${left.last_name || ''} ${left.first_name || ''}`.trim();
    const rightName = `${right.last_name || ''} ${right.first_name || ''}`.trim();
    return leftName.localeCompare(rightName);
  });
}

async function loadPayments(eventId) {
  const response = await fetch(`/api/payments-report?event_id=${encodeURIComponent(eventId)}`, {
    credentials: 'same-origin'
  });

  if (!response.ok) {
    throw new Error('Failed to load payment records.');
  }

  const data = await response.json();
  state.paymentData = sortPaymentRows(Array.isArray(data) ? data : []);
  state.currentPage = 1;
  renderStatusFilter();
  renderEventContext();
  renderSummary();
  applyFilters();
}

function renderEventContext() {
  const container = document.getElementById('selectedEventContext');
  const eventName = document.getElementById('selectedEventName');
  const eventIdLabel = document.getElementById('selectedEventIdLabel');
  const eventDateLabel = document.getElementById('selectedEventDateLabel');
  const hasEvent = Boolean(state.selectedEventId);
  const event = getSelectedEvent();

  if (!container || !eventName || !eventIdLabel || !eventDateLabel) {
    return;
  }

  container.hidden = !hasEvent;
  if (!hasEvent || !event) {
    eventName.textContent = '-';
    eventIdLabel.textContent = 'Event ID: -';
    eventDateLabel.textContent = 'Start Date: -';
    return;
  }

  eventName.textContent = event.event_name || event.event_id || 'Selected Event';
  eventIdLabel.textContent = `Event ID: ${event.event_id || '-'}`;
  eventDateLabel.textContent = `Start Date: ${formatDate(event.start_date)}`;
}

function createEmptySummary() {
  return {
    payment_record_count: 0,
    total_recorded_amount: 0,
    total_collected_amount: 0,
    total_receivable_amount: 0,
    paid_count: 0,
    partial_count: 0,
    receivable_count: 0
  };
}

function summarizePaymentRows(rows) {
  const summary = createEmptySummary();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const amount = parseAmount(row?.amount);
    const category = categorizePaymentStatus(row?.payment_status);

    summary.payment_record_count += 1;
    summary.total_recorded_amount += amount;

    if (category === 'paid') {
      summary.paid_count += 1;
      summary.total_collected_amount += amount;
      return;
    }

    if (category === 'partial') {
      summary.partial_count += 1;
      summary.total_collected_amount += amount;
      return;
    }

    summary.receivable_count += 1;
    summary.total_receivable_amount += amount;
  });

  return summary;
}

function renderSummary() {
  const section = document.getElementById('eventSummarySection');
  const cards = document.getElementById('paymentSummaryCards');
  const chips = document.getElementById('paymentStatusChips');
  if (!section || !cards || !chips) {
    return;
  }

  const hasEvent = Boolean(state.selectedEventId);
  section.hidden = !hasEvent;
  if (!hasEvent) {
    cards.innerHTML = '';
    chips.innerHTML = '';
    return;
  }

  const summary = summarizePaymentRows(state.paymentData);
  const activeStatus = String(document.getElementById('statusFilter')?.value || '').trim();
  const selectedEventLabel = getSelectedEventLabel();

  const summaryCards = [
    {
      title: 'Total Recorded',
      value: `PHP ${formatCurrency(summary.total_recorded_amount)}`,
      hint: `All payment amounts currently recorded for ${selectedEventLabel}.`
    },
    {
      title: 'Total Collected',
      value: `PHP ${formatCurrency(summary.total_collected_amount)}`,
      hint: 'Amounts currently treated as fully paid or partially paid.'
    },
    {
      title: 'Total Receivable',
      value: `PHP ${formatCurrency(summary.total_receivable_amount)}`,
      hint: 'Amounts still grouped under receivable or pending payment states.',
      tone: 'is-warning'
    },
    {
      title: 'Payment Records',
      value: summary.payment_record_count,
      hint: 'Number of payment rows currently stored for this event.'
    }
  ];

  cards.innerHTML = summaryCards.map((card) => `
    <article class="payment-report-summary-card ${card.tone || ''}">
      <h3>${escapeHtml(card.title)}</h3>
      <strong>${escapeHtml(card.value)}</strong>
      <p>${escapeHtml(card.hint)}</p>
    </article>
  `).join('');

  const chipDefinitions = [
    { label: 'Fully Paid', count: summary.paid_count, tone: 'is-paid' },
    { label: 'Partially Paid', count: summary.partial_count, tone: 'is-partial' },
    { label: 'Accounts Receivable', count: summary.receivable_count, tone: 'is-receivable' }
  ];

  chips.innerHTML = chipDefinitions.map((chip) => `
    <button
      type="button"
      class="payment-report-status-chip ${chip.tone} ${activeStatus === chip.label ? 'is-active' : ''}"
      data-status="${escapeHtml(chip.label)}"
    >
      <span class="payment-report-status-chip__label">${escapeHtml(chip.label)}</span>
      <span class="payment-report-status-chip__count">${escapeHtml(chip.count)}</span>
    </button>
  `).join('');

  chips.querySelectorAll('[data-status]').forEach((button) => {
    button.addEventListener('click', () => {
      const statusFilter = document.getElementById('statusFilter');
      if (!statusFilter) {
        return;
      }

      statusFilter.value = button.dataset.status || '';
      state.currentPage = 1;
      applyFilters();
    });
  });
}

function renderStatusFilter() {
  const statusFilter = document.getElementById('statusFilter');
  if (!statusFilter) {
    return;
  }

  const previousValue = String(statusFilter.value || '').trim();
  const options = createStatusOptions(state.paymentData);

  statusFilter.innerHTML = '<option value="">All Statuses</option>';
  options.forEach((status) => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    statusFilter.appendChild(option);
  });

  if (previousValue && options.includes(previousValue)) {
    statusFilter.value = previousValue;
  } else {
    statusFilter.value = '';
  }
}

function createSearchHaystack(row) {
  return [
    row.payment_id,
    row.attendee_no,
    row.first_name,
    row.last_name,
    `${row.last_name || ''}, ${row.first_name || ''}`.trim(),
    row.organization,
    row.payment_status,
    getCanonicalPaymentStatus(row.payment_status),
    row.amount,
    row.form_of_payment,
    row.date_full_payment,
    row.date_partial_payment,
    row.account,
    row.or_number,
    row.quickbooks_no,
    row.shipping_tracking_no,
    row.notes,
    row.created_at
  ]
    .map((value) => String(value || '').toLowerCase())
    .join(' ');
}

function applyFilters() {
  const searchValue = String(document.getElementById('paymentSearch')?.value || '').trim().toLowerCase();
  const statusValue = String(document.getElementById('statusFilter')?.value || '').trim();

  state.filteredData = state.paymentData.filter((row) => {
    if (statusValue && getCanonicalPaymentStatus(row.payment_status) !== statusValue) {
      return false;
    }

    if (searchValue && !createSearchHaystack(row).includes(searchValue)) {
      return false;
    }

    return true;
  });

  state.currentPage = 1;
  renderSummary();
  renderResultsSummary();
  renderRecords();
}

function renderResultsSummary() {
  const summary = document.getElementById('paymentResultsSummary');
  const metaRow = document.getElementById('resultsMetaRow');
  const hasEvent = Boolean(state.selectedEventId);

  if (!summary || !metaRow) {
    return;
  }

  metaRow.hidden = !hasEvent;
  if (!hasEvent) {
    summary.textContent = '';
    return;
  }

  summary.textContent = `Showing ${state.filteredData.length} of ${state.paymentData.length} payment rows for ${getSelectedEventLabel()}.`;
}

function renderTableHead() {
  const tableHead = document.getElementById('paymentTableHead');
  if (!tableHead) {
    return;
  }

  tableHead.innerHTML = getVisibleColumns()
    .map((column) => `<th>${escapeHtml(column.label)}</th>`)
    .join('');
}

function renderPagination(totalRows, totalPages) {
  const pagination = document.getElementById('paymentPagination');
  if (!pagination) {
    return;
  }

  if (totalRows === 0) {
    pagination.hidden = true;
    pagination.innerHTML = '';
    return;
  }

  pagination.hidden = false;
  pagination.innerHTML = '';

  const pageInfo = document.createElement('span');
  pageInfo.className = 'payment-reports-pagination__label';
  pageInfo.textContent = `Page ${state.currentPage} of ${totalPages}`;
  pagination.appendChild(pageInfo);

  const pageButtons = document.createElement('div');
  pageButtons.className = 'payment-reports-pagination__buttons';

  const prevButton = document.createElement('button');
  prevButton.type = 'button';
  prevButton.className = 'btn btn-secondary';
  prevButton.textContent = 'Prev';
  prevButton.disabled = state.currentPage <= 1;
  prevButton.addEventListener('click', () => {
    state.currentPage -= 1;
    renderRecords();
  });
  pageButtons.appendChild(prevButton);

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const pageButton = document.createElement('button');
    pageButton.type = 'button';
    pageButton.className = `btn btn-secondary${pageNumber === state.currentPage ? ' is-active' : ''}`;
    pageButton.textContent = pageNumber;
    pageButton.disabled = pageNumber === state.currentPage;
    pageButton.addEventListener('click', () => {
      state.currentPage = pageNumber;
      renderRecords();
    });
    pageButtons.appendChild(pageButton);
  }

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'btn btn-secondary';
  nextButton.textContent = 'Next';
  nextButton.disabled = state.currentPage >= totalPages;
  nextButton.addEventListener('click', () => {
    state.currentPage += 1;
    renderRecords();
  });
  pageButtons.appendChild(nextButton);

  pagination.appendChild(pageButtons);
}

function renderRecords() {
  const tableSection = document.getElementById('tableSection');
  const tableContainer = document.getElementById('paymentTableContainer');
  const tableBody = document.getElementById('paymentTableBody');
  const emptyState = document.getElementById('recordsEmptyState');
  const pagination = document.getElementById('paymentPagination');
  const hasEvent = Boolean(state.selectedEventId);

  if (!tableSection || !tableContainer || !tableBody || !emptyState || !pagination) {
    return;
  }

  tableSection.hidden = !hasEvent;
  if (!hasEvent) {
    emptyState.hidden = true;
    tableContainer.hidden = true;
    pagination.hidden = true;
    tableBody.innerHTML = '';
    return;
  }

  renderTableHead();

  if (state.paymentData.length === 0) {
    emptyState.hidden = false;
    emptyState.innerHTML = `
      <h3>No payment records for ${escapeHtml(getSelectedEventLabel())} yet.</h3>
      <p>This event is loaded, but there are no payment rows to edit or export yet.</p>
    `;
    tableContainer.hidden = true;
    pagination.hidden = true;
    tableBody.innerHTML = '';
    return;
  }

  if (state.filteredData.length === 0) {
    emptyState.hidden = false;
    emptyState.innerHTML = `
      <h3>No payment rows matched the current filters.</h3>
      <p>Adjust the search or payment status filter to see records for ${escapeHtml(getSelectedEventLabel())}.</p>
    `;
    tableContainer.hidden = true;
    pagination.hidden = true;
    tableBody.innerHTML = '';
    return;
  }

  emptyState.hidden = true;
  tableContainer.hidden = false;

  const totalRows = state.filteredData.length;
  const totalPages = state.rowsPerPage === 'all' ? 1 : Math.max(1, Math.ceil(totalRows / state.rowsPerPage));
  state.currentPage = Math.min(state.currentPage, totalPages);
  const startIndex = state.rowsPerPage === 'all' ? 0 : (state.currentPage - 1) * state.rowsPerPage;
  const endIndex = state.rowsPerPage === 'all' ? totalRows : startIndex + state.rowsPerPage;
  const pageRows = state.filteredData.slice(startIndex, endIndex);
  const visibleColumns = getVisibleColumns();

  tableBody.innerHTML = pageRows.map((row) => `
    <tr>
      ${visibleColumns.map((column) => {
        const cellClasses = ['payment-report-cell', column.cellClass].filter(Boolean).join(' ');
        return `<td class="${cellClasses}">${column.render(row)}</td>`;
      }).join('')}
    </tr>
  `).join('');

  renderPagination(totalRows, totalPages);
}

function setSectionsVisible(isVisible) {
  const selectionEmptyState = document.getElementById('selectionEmptyState');
  const filterSection = document.getElementById('filterSection');
  const resultsMetaRow = document.getElementById('resultsMetaRow');
  const summarySection = document.getElementById('eventSummarySection');
  const tableSection = document.getElementById('tableSection');

  if (selectionEmptyState) {
    selectionEmptyState.hidden = isVisible;
  }
  if (filterSection) {
    filterSection.hidden = !isVisible;
  }
  if (resultsMetaRow) {
    resultsMetaRow.hidden = !isVisible;
  }
  if (summarySection) {
    summarySection.hidden = !isVisible;
  }
  if (tableSection) {
    tableSection.hidden = !isVisible;
  }
}

function clearPageForNoSelection() {
  state.paymentData = [];
  state.filteredData = [];
  state.currentPage = 1;
  renderStatusFilter();
  renderEventContext();
  renderSummary();
  renderResultsSummary();
  renderRecords();
  setSectionsVisible(false);
  updatePaymentAuditsLink();
}

function buildPaymentUpdatePayload(form) {
  const formData = new FormData(form);
  const payload = {};
  EDITABLE_PAYMENT_FIELDS.forEach((field) => {
    let value = formData.get(field);
    if (typeof value === 'string') {
      value = value.trim();
    }
    payload[field] = value === '' ? null : value;
  });
  return payload;
}

function setFormValue(form, fieldName, value) {
  const field = form.elements[fieldName];
  if (!field) {
    return;
  }
  field.value = value == null ? '' : value;
}

function populatePaymentStatusSelect(currentValue) {
  const select = document.getElementById('paymentStatusInput');
  if (!select) {
    return;
  }

  const rawValue = String(currentValue || '').trim();
  const canonicalValue = getCanonicalPaymentStatus(rawValue);
  const needsLegacyOption = rawValue && !CANONICAL_PAYMENT_STATUS_OPTIONS.includes(rawValue);

  select.innerHTML = '';

  if (needsLegacyOption) {
    const legacyOption = document.createElement('option');
    legacyOption.value = rawValue;
    legacyOption.textContent = `${rawValue} (Legacy)`;
    select.appendChild(legacyOption);
  }

  CANONICAL_PAYMENT_STATUS_OPTIONS.forEach((status) => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    select.appendChild(option);
  });

  if (needsLegacyOption) {
    select.value = rawValue;
    return;
  }

  select.value = CANONICAL_PAYMENT_STATUS_OPTIONS.includes(rawValue)
    ? rawValue
    : canonicalValue;
}

function closeDetailsModal() {
  const modal = document.getElementById('detailsModal');
  if (modal) {
    modal.hidden = true;
  }
}

function openDetailsModal(row) {
  const modal = document.getElementById('detailsModal');
  const form = document.getElementById('detailsForm');
  const saveButton = document.getElementById('saveDetailsBtn');
  const deleteButton = document.getElementById('deleteDetailsBtn');
  if (!modal || !form || !saveButton || !deleteButton) {
    return;
  }

  form.reset();
  setFormValue(form, 'payment_id_display', row.payment_id || '');
  setFormValue(form, 'attendee_no', row.attendee_no || '');
  setFormValue(form, 'attendee_name_display', [row.last_name, row.first_name].filter(Boolean).join(', '));
  setFormValue(form, 'organization', row.organization || '');
  setFormValue(form, 'created_at_display', formatDateTime(row.created_at));
  setFormValue(form, 'amount', row.amount ?? '');
  setFormValue(form, 'form_of_payment', row.form_of_payment || '');
  setFormValue(form, 'date_full_payment', row.date_full_payment || '');
  setFormValue(form, 'date_partial_payment', row.date_partial_payment || '');
  setFormValue(form, 'account', row.account || '');
  setFormValue(form, 'or_number', row.or_number || '');
  setFormValue(form, 'quickbooks_no', row.quickbooks_no || '');
  setFormValue(form, 'shipping_tracking_no', row.shipping_tracking_no || '');
  setFormValue(form, 'notes', row.notes || '');
  populatePaymentStatusSelect(row.payment_status);

  deleteButton.hidden = !(state.currentUserRole === 'admin' || state.currentUserRole === 'manager');

  saveButton.onclick = async () => {
    if (!await window.crfvDialog.confirm('Save changes to this payment record?', {
      title: 'Confirm action',
      confirmLabel: 'Save'
    })) {
      return;
    }

    try {
      const payload = buildPaymentUpdatePayload(form);
      const response = await fetch(`/api/payments-report/${encodeURIComponent(row.payment_id)}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Error saving changes.');
      }

      await window.crfvDialog.alert('Payment record saved.', { tone: 'success' });
      closeDetailsModal();
      await loadPayments(state.selectedEventId);
    } catch (error) {
      console.error('Failed to save payment report details.', error);
      await window.crfvDialog.alert(error.message || 'Error saving changes.', { tone: 'error' });
    }
  };

  deleteButton.onclick = async () => {
    if (!await window.crfvDialog.confirm('Delete this payment record?', {
      title: 'Confirm action',
      confirmLabel: 'Delete',
      destructive: true
    })) {
      return;
    }

    try {
      const response = await fetch(`/api/payments-report/${encodeURIComponent(row.payment_id)}`, {
        method: 'DELETE',
        credentials: 'same-origin'
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Error deleting record.');
      }

      await window.crfvDialog.alert('Payment record deleted.', { tone: 'success' });
      closeDetailsModal();
      await loadPayments(state.selectedEventId);
    } catch (error) {
      console.error('Failed to delete payment report details.', error);
      await window.crfvDialog.alert(error.message || 'Error deleting record.', { tone: 'error' });
    }
  };

  modal.hidden = false;
}

function setupModalCloseHandlers() {
  const modal = document.getElementById('detailsModal');
  const cancelButton = document.getElementById('cancelDetailsBtn');
  const closeButton = document.getElementById('closeModalBtn');

  cancelButton?.addEventListener('click', closeDetailsModal);
  closeButton?.addEventListener('click', closeDetailsModal);

  modal?.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeDetailsModal();
    }
  });
}

function setupTableActions() {
  const tableBody = document.getElementById('paymentTableBody');
  if (!tableBody) {
    return;
  }

  tableBody.addEventListener('click', (event) => {
    const button = event.target.closest('[data-payment-id]');
    if (!button) {
      return;
    }

    const row = state.filteredData.find((record) => record.payment_id === button.dataset.paymentId);
    if (row) {
      openDetailsModal(row);
    }
  });
}

function setupFilterControls() {
  const eventSelect = document.getElementById('eventSelect');
  const searchInput = document.getElementById('paymentSearch');
  const statusFilter = document.getElementById('statusFilter');
  const rowsPerPageSelect = document.getElementById('rowsPerPageSelect');

  eventSelect?.addEventListener('change', async () => {
    state.selectedEventId = eventSelect.value;
    updateEventQueryParam(state.selectedEventId);
    updatePaymentAuditsLink();

    if (!state.selectedEventId) {
      clearPageForNoSelection();
      return;
    }

    setSectionsVisible(true);

    try {
      await loadPayments(state.selectedEventId);
    } catch (error) {
      console.error('Unable to load payment data.', error);
      await window.crfvDialog.alert('Failed to load payment records for the selected event.', { tone: 'error' });
      clearPageForNoSelection();
    }
  });

  searchInput?.addEventListener('input', () => {
    window.clearTimeout(state.searchDebounceId);
    state.searchDebounceId = window.setTimeout(() => {
      applyFilters();
    }, 200);
  });

  statusFilter?.addEventListener('change', () => {
    applyFilters();
  });

  rowsPerPageSelect?.addEventListener('change', () => {
    state.rowsPerPage = rowsPerPageSelect.value === 'all' ? 'all' : Number.parseInt(rowsPerPageSelect.value, 10);
    state.currentPage = 1;
    renderRecords();
  });
}

function exportRowsToWorksheet(rows, { typed = false } = {}) {
  const exportColumns = getExportColumns();
  const headers = exportColumns.map((column) => column.label);
  const values = rows.map((row) => exportColumns.map((column) => {
    return typed
      ? getTypedExportValue(row, column.key)
      : getDisplayExportValue(row, column.key);
  }));

  return { exportColumns, headers, values };
}

function logAuditTrail(action, details = '') {
  return fetch('/api/audit-trail', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, details })
  }).catch((error) => {
    console.warn('Failed to write payment report audit log.', error);
  });
}

function setupExportButtons() {
  const exportXlsxButton = document.getElementById('exportXLSXBtn');
  const exportPdfButton = document.getElementById('exportPDFBtn');

  exportXlsxButton?.addEventListener('click', async () => {
    const scope = await chooseExportScope('XLSX');
    if (!scope) {
      return;
    }

    if (typeof XLSX === 'undefined' || !XLSX?.utils || typeof XLSX.writeFile !== 'function') {
      await window.crfvDialog.alert('XLSX library not loaded.', { tone: 'error' });
      return;
    }

    const dataToExport = getExportRows(scope);
    if (!dataToExport.length) {
      await window.crfvDialog.alert('No data to export.', { tone: 'info' });
      return;
    }

    try {
      const context = buildExportContext(scope, dataToExport.length);
      const { exportColumns, headers, values } = exportRowsToWorksheet(dataToExport, { typed: true });
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...values], { cellDates: true });
      const workbook = XLSX.utils.book_new();

      applyWorksheetFormats(worksheet, exportColumns, dataToExport.length);
      XLSX.utils.book_append_sheet(workbook, worksheet, context.sheetName || 'Payments');
      XLSX.writeFile(workbook, `${context.fileBase}.xlsx`, { cellDates: true });
      void logAuditTrail(
        'EXPORT_PAYMENT_REPORT_XLSX',
        `${context.eventName} (${context.eventId}) | ${context.scopeLabel} | ${dataToExport.length} row(s)`
      );
    } catch (error) {
      console.error('Failed to export payment report XLSX.', error);
      await window.crfvDialog.alert('Failed to export XLSX payment report.', { tone: 'error' });
    }
  });

  exportPdfButton?.addEventListener('click', async () => {
    const scope = await chooseExportScope('PDF');
    if (!scope) {
      return;
    }

    if (typeof window.jspdf?.jsPDF !== 'function') {
      await window.crfvDialog.alert('PDF library not loaded.', { tone: 'error' });
      return;
    }

    const dataToExport = getExportRows(scope);
    if (!dataToExport.length) {
      await window.crfvDialog.alert('No data to export.', { tone: 'info' });
      return;
    }

    try {
      const context = buildExportContext(scope, dataToExport.length);
      const { headers, values } = exportRowsToWorksheet(dataToExport);
      const { jsPDF } = window.jspdf;
      const documentPdf = new jsPDF({ orientation: 'landscape' });

      if (typeof documentPdf.autoTable !== 'function') {
        await window.crfvDialog.alert('PDF table export is not available.', { tone: 'error' });
        return;
      }

      documentPdf.setFontSize(16);
      documentPdf.text(context.pdfTitle, 14, 14);
      documentPdf.setFontSize(10);
      const subtitleLines = documentPdf.splitTextToSize(context.pdfSubtitle, 265);
      documentPdf.text(subtitleLines, 14, 21);
      documentPdf.autoTable({
        head: [headers],
        body: values,
        startY: 25 + (subtitleLines.length * 5),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [15, 118, 110] }
      });
      documentPdf.save(`${context.fileBase}.pdf`);
      void logAuditTrail(
        'EXPORT_PAYMENT_REPORT_PDF',
        `${context.eventName} (${context.eventId}) | ${context.scopeLabel} | ${dataToExport.length} row(s)`
      );
    } catch (error) {
      console.error('Failed to export payment report PDF.', error);
      await window.crfvDialog.alert('Failed to export PDF payment report.', { tone: 'error' });
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  loadColumnPrefs();
  applyVisibleColumnKeys(state.visibleColumnKeys);
  setupColumnPicker();
  setupFilterControls();
  setupExportButtons();
  setupModalCloseHandlers();
  setupTableActions();
  setSectionsVisible(false);
  updatePaymentAuditsLink();
  await loadCurrentUserRole();
  await loadEvents();

  if (state.selectedEventId) {
    setSectionsVisible(true);

    try {
      await loadPayments(state.selectedEventId);
    } catch (error) {
      console.error('Unable to auto-load requested payment report event.', error);
      clearPageForNoSelection();
    }
    return;
  }

  clearPageForNoSelection();
});
