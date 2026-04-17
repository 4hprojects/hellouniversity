const DEFAULT_ATTENDANCE_SCHEDULE = Object.freeze({
  am_in: Object.freeze({
    start: '08:00',
    on_time_until: '09:15'
  }),
  am_out: Object.freeze({
    start: '11:30'
  }),
  pm_in: Object.freeze({
    start: '12:30',
    on_time_until: '13:15'
  }),
  pm_out: Object.freeze({
    start: '16:00'
  })
});

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function cloneAttendanceSchedule(schedule = DEFAULT_ATTENDANCE_SCHEDULE) {
  return JSON.parse(JSON.stringify(schedule));
}

function isValidTimeString(value) {
  return TIME_PATTERN.test(String(value || '').trim());
}

function timeStringToMinutes(value) {
  if (!isValidTimeString(value)) {
    return NaN;
  }
  const [hours, minutes] = String(value).split(':').map(Number);
  return (hours * 60) + minutes;
}

function normalizeTimeString(value, fallback) {
  if (isValidTimeString(value)) {
    return String(value).trim();
  }
  return fallback;
}

function normalizeAttendanceSchedule(input, { fallback = DEFAULT_ATTENDANCE_SCHEDULE } = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const fallbackSchedule = fallback || DEFAULT_ATTENDANCE_SCHEDULE;

  return {
    am_in: {
      start: normalizeTimeString(source?.am_in?.start, fallbackSchedule.am_in.start),
      on_time_until: normalizeTimeString(source?.am_in?.on_time_until, fallbackSchedule.am_in.on_time_until)
    },
    am_out: {
      start: normalizeTimeString(source?.am_out?.start, fallbackSchedule.am_out.start)
    },
    pm_in: {
      start: normalizeTimeString(source?.pm_in?.start, fallbackSchedule.pm_in.start),
      on_time_until: normalizeTimeString(source?.pm_in?.on_time_until, fallbackSchedule.pm_in.on_time_until)
    },
    pm_out: {
      start: normalizeTimeString(source?.pm_out?.start, fallbackSchedule.pm_out.start)
    }
  };
}

function validateAttendanceSchedule(input) {
  const schedule = normalizeAttendanceSchedule(input);
  const errors = [];
  const values = {
    amInStart: timeStringToMinutes(schedule.am_in.start),
    amInOnTimeUntil: timeStringToMinutes(schedule.am_in.on_time_until),
    amOutStart: timeStringToMinutes(schedule.am_out.start),
    pmInStart: timeStringToMinutes(schedule.pm_in.start),
    pmInOnTimeUntil: timeStringToMinutes(schedule.pm_in.on_time_until),
    pmOutStart: timeStringToMinutes(schedule.pm_out.start)
  };

  if (!isFinite(values.amInStart)) {
    errors.push('AM IN start must be a valid time.');
  }
  if (!isFinite(values.amInOnTimeUntil)) {
    errors.push('AM IN on-time cutoff must be a valid time.');
  }
  if (!isFinite(values.amOutStart)) {
    errors.push('AM OUT start must be a valid time.');
  }
  if (!isFinite(values.pmInStart)) {
    errors.push('PM IN start must be a valid time.');
  }
  if (!isFinite(values.pmInOnTimeUntil)) {
    errors.push('PM IN on-time cutoff must be a valid time.');
  }
  if (!isFinite(values.pmOutStart)) {
    errors.push('PM OUT start must be a valid time.');
  }

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

  return {
    schedule,
    errors
  };
}

function parseRecordedTimeToMinutes(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const text = String(value || '').trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/);
  if (!match) {
    return NaN;
  }
  return (Number(match[1]) * 60) + Number(match[2]);
}

function resolveAttendanceSlot(scheduleInput, recordedTime) {
  const schedule = normalizeAttendanceSchedule(scheduleInput);
  const minutes = parseRecordedTimeToMinutes(recordedTime);
  if (!Number.isFinite(minutes)) {
    return 'AM IN';
  }

  const amOutStart = timeStringToMinutes(schedule.am_out.start);
  const pmInStart = timeStringToMinutes(schedule.pm_in.start);
  const pmOutStart = timeStringToMinutes(schedule.pm_out.start);

  if (minutes < amOutStart) {
    return 'AM IN';
  }
  if (minutes < pmInStart) {
    return 'AM OUT';
  }
  if (minutes < pmOutStart) {
    return 'PM IN';
  }
  return 'PM OUT';
}

function calculatePunctuality(scheduleInput, slot, recordedTime) {
  const schedule = normalizeAttendanceSchedule(scheduleInput);
  const minutes = parseRecordedTimeToMinutes(recordedTime);
  if (!Number.isFinite(minutes)) {
    return {
      punctuality_status: 'not_applicable',
      late_minutes: 0
    };
  }

  if (slot === 'AM IN') {
    const cutoff = timeStringToMinutes(schedule.am_in.on_time_until);
    const lateMinutes = Math.max(0, minutes - cutoff);
    return {
      punctuality_status: lateMinutes > 0 ? 'late' : 'on_time',
      late_minutes: lateMinutes
    };
  }

  if (slot === 'PM IN') {
    const cutoff = timeStringToMinutes(schedule.pm_in.on_time_until);
    const lateMinutes = Math.max(0, minutes - cutoff);
    return {
      punctuality_status: lateMinutes > 0 ? 'late' : 'on_time',
      late_minutes: lateMinutes
    };
  }

  return {
    punctuality_status: 'not_applicable',
    late_minutes: 0
  };
}

function describeAttendanceSchedule(scheduleInput) {
  const schedule = normalizeAttendanceSchedule(scheduleInput);
  return [
    `AM IN ${schedule.am_in.start} to ${schedule.am_out.start} (on time until ${schedule.am_in.on_time_until})`,
    `AM OUT from ${schedule.am_out.start}`,
    `PM IN ${schedule.pm_in.start} to ${schedule.pm_out.start} (on time until ${schedule.pm_in.on_time_until})`,
    `PM OUT from ${schedule.pm_out.start}`
  ].join(' | ');
}

module.exports = {
  DEFAULT_ATTENDANCE_SCHEDULE,
  cloneAttendanceSchedule,
  validateAttendanceSchedule,
  normalizeAttendanceSchedule,
  timeStringToMinutes,
  parseRecordedTimeToMinutes,
  resolveAttendanceSlot,
  calculatePunctuality,
  describeAttendanceSchedule
};
