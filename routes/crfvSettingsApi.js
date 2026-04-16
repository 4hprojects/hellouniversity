const express = require('express');
const { isAdminOrManager } = require('../middleware/routeAuthGuards');
const { logAuditTrail } = require('../utils/auditTrail');
const { describeAttendanceSchedule, validateAttendanceSchedule } = require('../utils/crfvAttendanceSchedule');
const {
  getAttendanceDefaults,
  updateAttendanceDefaults
} = require('../utils/crfvAttendanceStore');

const router = express.Router();

router.get('/crfv/settings/attendance-defaults', isAdminOrManager, async (_req, res) => {
  try {
    const attendanceSchedule = await getAttendanceDefaults();
    return res.json({
      success: true,
      attendance_schedule: attendanceSchedule
    });
  } catch (error) {
    console.error('Error in GET /api/crfv/settings/attendance-defaults:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load attendance defaults.'
    });
  }
});

router.put('/crfv/settings/attendance-defaults', isAdminOrManager, async (req, res) => {
  const { schedule, errors } = validateAttendanceSchedule(req.body?.attendance_schedule);
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors.join(' ')
    });
  }

  try {
    const previousSchedule = await getAttendanceDefaults();
    const updatedSchedule = await updateAttendanceDefaults(schedule, req.user || req.session || {});

    await logAuditTrail({
      req,
      action: 'UPDATE_CRFV_ATTENDANCE_DEFAULTS',
      userNameFallback: req.session?.studentIDNumber || 'CRFV admin',
      details: [
        `Previous: ${describeAttendanceSchedule(previousSchedule)}`,
        `Updated: ${describeAttendanceSchedule(updatedSchedule)}`
      ].join(' | ')
    });

    return res.json({
      success: true,
      attendance_schedule: updatedSchedule
    });
  } catch (error) {
    console.error('Error in PUT /api/crfv/settings/attendance-defaults:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save attendance defaults.'
    });
  }
});

module.exports = router;
