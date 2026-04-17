(function attachAttendanceScheduleUi(global) {
  const FALLBACK_ATTENDANCE_SCHEDULE = Object.freeze({
    am_in: { start: '08:00', on_time_until: '09:15' },
    am_out: { start: '11:30' },
    pm_in: { start: '12:30', on_time_until: '13:15' },
    pm_out: { start: '16:00' }
  });

  const EVENT_SCHEDULE_TITLE = 'This Event Attendance Schedule';
  const EVENT_SCHEDULE_DESCRIPTION = 'This schedule is what attendance and punctuality will use for this event. AM IN stays active until AM OUT begins. PM IN stays active until PM OUT begins. "On time until" is the punctuality cutoff.';
  const DEFAULT_TEMPLATE_TITLE = 'Default Attendance Template';
  const DEFAULT_TEMPLATE_DESCRIPTION = 'Seeds future events and Reset to current default. It does not automatically change schedules already saved on events.';

  const SLOT_HELP = Object.freeze({
    am_in: Object.freeze({
      label: 'AM IN',
      description: 'Morning arrival check-in; used to determine morning punctuality.'
    }),
    am_out: Object.freeze({
      label: 'AM OUT',
      description: 'Morning departure or end-of-morning attendance checkpoint.'
    }),
    pm_in: Object.freeze({
      label: 'PM IN',
      description: 'Afternoon return check-in; used to determine afternoon punctuality.'
    }),
    pm_out: Object.freeze({
      label: 'PM OUT',
      description: 'End-of-day attendance checkpoint.'
    })
  });

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function cloneSchedule(schedule) {
    return JSON.parse(JSON.stringify(schedule || FALLBACK_ATTENDANCE_SCHEDULE));
  }

  function normalizeSchedule(schedule) {
    const source = schedule && typeof schedule === 'object' ? schedule : {};
    return {
      am_in: {
        start: source?.am_in?.start || FALLBACK_ATTENDANCE_SCHEDULE.am_in.start,
        on_time_until: source?.am_in?.on_time_until || FALLBACK_ATTENDANCE_SCHEDULE.am_in.on_time_until
      },
      am_out: {
        start: source?.am_out?.start || FALLBACK_ATTENDANCE_SCHEDULE.am_out.start
      },
      pm_in: {
        start: source?.pm_in?.start || FALLBACK_ATTENDANCE_SCHEDULE.pm_in.start,
        on_time_until: source?.pm_in?.on_time_until || FALLBACK_ATTENDANCE_SCHEDULE.pm_in.on_time_until
      },
      pm_out: {
        start: source?.pm_out?.start || FALLBACK_ATTENDANCE_SCHEDULE.pm_out.start
      }
    };
  }

  function buildScheduleField(prefix, slotKey, fieldKey, label, value) {
    return `
      <label class="schedule-input">
        <span>${label}</span>
        <input type="time" name="${prefix}_${slotKey}_${fieldKey}" value="${value}">
      </label>
    `;
  }

  function buildScheduleHelpMarkup(prefix, slotKey) {
    const slotHelp = SLOT_HELP[slotKey];
    if (!slotHelp) {
      return '';
    }

    const tooltipId = `${prefix}_${slotKey}_tooltip`;
    return `
      <span class="slot-help" data-slot-help>
        <button
          type="button"
          class="slot-help-trigger"
          aria-label="What does ${escapeHtml(slotHelp.label)} mean?"
          aria-describedby="${tooltipId}"
          aria-expanded="false"
        >
          <span class="material-icons" aria-hidden="true">help_outline</span>
        </button>
        <span id="${tooltipId}" class="slot-help-tooltip" role="tooltip">${escapeHtml(slotHelp.description)}</span>
      </span>
    `;
  }

  function buildScheduleCardMarkup(prefix, slotKey, fieldsMarkup) {
    const slotHelp = SLOT_HELP[slotKey];
    return `
      <article class="schedule-card">
        <div class="schedule-card-title">
          <h4>${slotHelp?.label || slotKey}</h4>
          ${buildScheduleHelpMarkup(prefix, slotKey)}
        </div>
        ${fieldsMarkup}
      </article>
    `;
  }

  function buildScheduleSectionMarkup(prefix, options = {}) {
    const {
      title = EVENT_SCHEDULE_TITLE,
      description = EVENT_SCHEDULE_DESCRIPTION,
      resetLabel = '',
      sectionClass = '',
      collapsible = false,
      expanded = true,
      collapsibleLabel = title,
      collapsibleDescription = '',
      collapsibleTooltip = ''
    } = options;
    const sectionClassName = ['schedule-section', sectionClass].filter(Boolean).join(' ');
    const sectionInnerMarkup = `
      <section class="${sectionClassName}" data-prefix="${prefix}">
        <div class="schedule-section-header">
          <div>
            <h3>${title}</h3>
            <p>${description}</p>
          </div>
          ${resetLabel ? `<button type="button" class="btn btn-secondary schedule-reset-btn" data-schedule-prefix="${prefix}">${resetLabel}</button>` : ''}
        </div>
        <div class="schedule-grid">
          ${buildScheduleCardMarkup(prefix, 'am_in', `
            ${buildScheduleField(prefix, 'am_in', 'start', 'Slot starts', FALLBACK_ATTENDANCE_SCHEDULE.am_in.start)}
            ${buildScheduleField(prefix, 'am_in', 'on_time_until', 'On time until', FALLBACK_ATTENDANCE_SCHEDULE.am_in.on_time_until)}
          `)}
          ${buildScheduleCardMarkup(prefix, 'am_out', `
            ${buildScheduleField(prefix, 'am_out', 'start', 'Slot starts', FALLBACK_ATTENDANCE_SCHEDULE.am_out.start)}
          `)}
          ${buildScheduleCardMarkup(prefix, 'pm_in', `
            ${buildScheduleField(prefix, 'pm_in', 'start', 'Slot starts', FALLBACK_ATTENDANCE_SCHEDULE.pm_in.start)}
            ${buildScheduleField(prefix, 'pm_in', 'on_time_until', 'On time until', FALLBACK_ATTENDANCE_SCHEDULE.pm_in.on_time_until)}
          `)}
          ${buildScheduleCardMarkup(prefix, 'pm_out', `
            ${buildScheduleField(prefix, 'pm_out', 'start', 'Slot starts', FALLBACK_ATTENDANCE_SCHEDULE.pm_out.start)}
          `)}
        </div>
      </section>
    `;

    if (!collapsible) {
      return sectionInnerMarkup;
    }

    const bodyId = `${prefix}_schedule_body`;
    const expandedFlag = Boolean(expanded);
    return `
      <section class="settings-card settings-card-collapsible schedule-section-card ${expandedFlag ? 'is-expanded' : ''}" data-schedule-card="${prefix}">
        <button
          type="button"
          class="settings-card-toggle schedule-section-toggle"
          data-schedule-toggle="${prefix}"
          aria-expanded="${expandedFlag ? 'true' : 'false'}"
          aria-controls="${bodyId}"
          ${collapsibleTooltip ? `title="${escapeHtml(collapsibleTooltip)}"` : ''}
        >
          <span class="settings-card-toggle-copy">
            <span class="settings-card-title">${collapsibleLabel}</span>
            ${collapsibleDescription ? `<span class="settings-card-description">${collapsibleDescription}</span>` : ''}
          </span>
          <span class="settings-card-toggle-icon" aria-hidden="true">${expandedFlag ? 'v' : '>'}</span>
        </button>
        <div id="${bodyId}" class="settings-card-body" ${expandedFlag ? '' : 'hidden'}>
          ${sectionInnerMarkup}
        </div>
      </section>
    `;
  }

  function ensureScheduleSection(form, prefix, options = {}) {
    if (!form || form.querySelector(`.schedule-section[data-prefix="${prefix}"]`)) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildScheduleSectionMarkup(prefix, options);
    const section = wrapper.firstElementChild;
    const submitButton = form.querySelector('button[type="submit"]');
    const formActions = submitButton ? submitButton.closest('.form-actions') : null;

    if (formActions) {
      form.insertBefore(section, formActions);
    } else if (submitButton) {
      form.insertBefore(section, submitButton);
    } else {
      form.appendChild(section);
    }

    bindCollapsibleScheduleSections(form);
  }

  function applyScheduleToForm(form, prefix, scheduleInput) {
    const schedule = normalizeSchedule(scheduleInput);
    const fieldMap = [
      ['am_in', 'start'],
      ['am_in', 'on_time_until'],
      ['am_out', 'start'],
      ['pm_in', 'start'],
      ['pm_in', 'on_time_until'],
      ['pm_out', 'start']
    ];

    fieldMap.forEach(([slotKey, fieldKey]) => {
      const input = form?.querySelector(`input[name="${prefix}_${slotKey}_${fieldKey}"]`);
      if (input) {
        input.value = schedule[slotKey][fieldKey];
      }
    });
  }

  function readScheduleFromForm(form, prefix) {
    return normalizeSchedule({
      am_in: {
        start: form.querySelector(`input[name="${prefix}_am_in_start"]`)?.value,
        on_time_until: form.querySelector(`input[name="${prefix}_am_in_on_time_until"]`)?.value
      },
      am_out: {
        start: form.querySelector(`input[name="${prefix}_am_out_start"]`)?.value
      },
      pm_in: {
        start: form.querySelector(`input[name="${prefix}_pm_in_start"]`)?.value,
        on_time_until: form.querySelector(`input[name="${prefix}_pm_in_on_time_until"]`)?.value
      },
      pm_out: {
        start: form.querySelector(`input[name="${prefix}_pm_out_start"]`)?.value
      }
    });
  }

  function timeToMinutes(value) {
    const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
    if (!match) {
      return NaN;
    }
    return (Number(match[1]) * 60) + Number(match[2]);
  }

  function validateSchedule(scheduleInput) {
    const schedule = normalizeSchedule(scheduleInput);
    const errors = [];
    const values = {
      amInStart: timeToMinutes(schedule.am_in.start),
      amInOnTimeUntil: timeToMinutes(schedule.am_in.on_time_until),
      amOutStart: timeToMinutes(schedule.am_out.start),
      pmInStart: timeToMinutes(schedule.pm_in.start),
      pmInOnTimeUntil: timeToMinutes(schedule.pm_in.on_time_until),
      pmOutStart: timeToMinutes(schedule.pm_out.start)
    };

    Object.entries(values).forEach(([field, value]) => {
      if (!Number.isFinite(value)) {
        errors.push(`Invalid time supplied for ${field}.`);
      }
    });

    if (errors.length === 0) {
      if (values.amInStart > values.amInOnTimeUntil) {
        errors.push('AM IN start cannot be later than its on-time cutoff.');
      }
      if (values.amInOnTimeUntil >= values.amOutStart) {
        errors.push('AM IN on-time cutoff must be earlier than AM OUT start.');
      }
      if (values.amOutStart > values.pmInStart) {
        errors.push('AM OUT start cannot be later than PM IN start.');
      }
      if (values.pmInStart > values.pmInOnTimeUntil) {
        errors.push('PM IN start cannot be later than its on-time cutoff.');
      }
      if (values.pmInOnTimeUntil >= values.pmOutStart) {
        errors.push('PM IN on-time cutoff must be earlier than PM OUT start.');
      }
    }

    return errors;
  }

  function bindScheduleResetButtons(container, state, onReset) {
    if (!container) {
      return;
    }

    container.querySelectorAll('.schedule-reset-btn').forEach(button => {
      if (button.dataset.bound === 'true') {
        return;
      }

      button.dataset.bound = 'true';
      button.addEventListener('click', () => {
        const prefix = button.dataset.schedulePrefix;
        if (!prefix) {
          return;
        }

        applyScheduleToForm(container, prefix, state.attendanceDefaults);
        if (typeof onReset === 'function') {
          onReset();
        }
      });
    });
  }

  function closeScheduleHelpTooltips(exceptNode = null) {
    document.querySelectorAll('.slot-help.is-open').forEach(helpNode => {
      if (helpNode === exceptNode) {
        return;
      }

      helpNode.classList.remove('is-open');
      resetScheduleHelpTooltipPosition(helpNode);
      const trigger = helpNode.querySelector('.slot-help-trigger');
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function resetScheduleHelpTooltipPosition(helpNode) {
    void helpNode;
  }

  function positionScheduleHelpTooltip(helpNode) {
    void helpNode;
  }

  function bindScheduleHelpTooltips() {
    if (document.body.dataset.scheduleHelpBound === 'true') {
      return;
    }

    document.body.dataset.scheduleHelpBound = 'true';

    document.addEventListener('mouseover', event => {
      const helpNode = event.target.closest('.slot-help');
      if (helpNode) {
        positionScheduleHelpTooltip(helpNode);
      }
    });

    document.addEventListener('focusin', event => {
      const helpNode = event.target.closest('.slot-help');
      if (helpNode) {
        positionScheduleHelpTooltip(helpNode);
      }
    });

    document.addEventListener('click', event => {
      const trigger = event.target.closest('.slot-help-trigger');
      if (trigger) {
        const helpNode = trigger.closest('.slot-help');
        const isOpen = helpNode?.classList.contains('is-open');
        closeScheduleHelpTooltips(helpNode);

        if (helpNode && !isOpen) {
          positionScheduleHelpTooltip(helpNode);
          helpNode.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
        } else if (helpNode) {
          helpNode.classList.remove('is-open');
          resetScheduleHelpTooltipPosition(helpNode);
          trigger.setAttribute('aria-expanded', 'false');
          trigger.blur();
        }
        return;
      }

      if (!event.target.closest('.slot-help')) {
        closeScheduleHelpTooltips();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeScheduleHelpTooltips();
        if (document.activeElement?.classList?.contains('slot-help-trigger')) {
          document.activeElement.blur();
        }
      }
    });
  }

  function bindCollapsibleScheduleSections(container = document) {
    container.querySelectorAll('.schedule-section-toggle').forEach(toggle => {
      if (toggle.dataset.bound === 'true') {
        return;
      }

      toggle.dataset.bound = 'true';
      toggle.addEventListener('click', () => {
        const prefix = toggle.dataset.scheduleToggle;
        const card = toggle.closest(`[data-schedule-card="${prefix}"]`);
        const bodyId = toggle.getAttribute('aria-controls');
        const body = bodyId ? document.getElementById(bodyId) : null;
        const icon = toggle.querySelector('.settings-card-toggle-icon');
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        const nextExpanded = !isExpanded;

        toggle.setAttribute('aria-expanded', String(nextExpanded));
        if (card) {
          card.classList.toggle('is-expanded', nextExpanded);
        }
        if (body) {
          body.hidden = !nextExpanded;
        }
        if (icon) {
          icon.textContent = nextExpanded ? 'v' : '>';
        }
      });
    });
  }

  global.CRFVAttendanceScheduleUI = Object.freeze({
    FALLBACK_ATTENDANCE_SCHEDULE,
    EVENT_SCHEDULE_TITLE,
    EVENT_SCHEDULE_DESCRIPTION,
    DEFAULT_TEMPLATE_TITLE,
    DEFAULT_TEMPLATE_DESCRIPTION,
    cloneSchedule,
    normalizeSchedule,
    buildScheduleSectionMarkup,
    ensureScheduleSection,
    applyScheduleToForm,
    readScheduleFromForm,
    validateSchedule,
    bindScheduleResetButtons,
    bindCollapsibleScheduleSections,
    bindScheduleHelpTooltips
  });
})(window);
