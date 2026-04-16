const {
  DEFAULT_ATTENDANCE_SCHEDULE,
  calculatePunctuality,
  resolveAttendanceSlot,
  validateAttendanceSchedule
} = require('../../utils/crfvAttendanceSchedule');

describe('crfvAttendanceSchedule', () => {
  test('accepts the default attendance schedule', () => {
    const result = validateAttendanceSchedule(DEFAULT_ATTENDANCE_SCHEDULE);
    expect(result.errors).toEqual([]);
  });

  test('rejects invalid schedule ordering', () => {
    const result = validateAttendanceSchedule({
      am_in: { start: '10:00', on_time_until: '09:00' },
      am_out: { start: '12:00' },
      pm_in: { start: '13:00', on_time_until: '13:00' },
      pm_out: { start: '17:00' }
    });

    expect(result.errors).toContain('AM IN start cannot be later than its on-time cutoff.');
  });

  test('classifies attendance slots from configured boundaries', () => {
    expect(resolveAttendanceSlot(DEFAULT_ATTENDANCE_SCHEDULE, '08:45:00.000')).toBe('AM IN');
    expect(resolveAttendanceSlot(DEFAULT_ATTENDANCE_SCHEDULE, '12:15:00.000')).toBe('AM OUT');
    expect(resolveAttendanceSlot(DEFAULT_ATTENDANCE_SCHEDULE, '13:00:00.000')).toBe('PM IN');
    expect(resolveAttendanceSlot(DEFAULT_ATTENDANCE_SCHEDULE, '18:30:00.000')).toBe('PM OUT');
  });

  test('computes punctuality for AM IN and PM IN only', () => {
    expect(calculatePunctuality(DEFAULT_ATTENDANCE_SCHEDULE, 'AM IN', '08:45:00.000')).toEqual({
      punctuality_status: 'on_time',
      late_minutes: 0
    });

    expect(calculatePunctuality(DEFAULT_ATTENDANCE_SCHEDULE, 'AM IN', '10:00:00.000')).toEqual({
      punctuality_status: 'late',
      late_minutes: 60
    });

    expect(calculatePunctuality(DEFAULT_ATTENDANCE_SCHEDULE, 'PM IN', '13:20:00.000')).toEqual({
      punctuality_status: 'late',
      late_minutes: 20
    });

    expect(calculatePunctuality(DEFAULT_ATTENDANCE_SCHEDULE, 'PM OUT', '17:20:00.000')).toEqual({
      punctuality_status: 'not_applicable',
      late_minutes: 0
    });
  });
});
