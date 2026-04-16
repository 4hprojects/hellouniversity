const {
  calculatePunctuality
} = require('./crfvAttendanceSchedule');
const {
  getAttendanceMetadataMap,
  getEffectiveAttendanceSchedulesMap
} = require('./crfvAttendanceStore');

async function enrichAttendanceRecords(records = []) {
  const normalizedRecords = Array.isArray(records) ? records.map(record => ({ ...record })) : [];
  if (normalizedRecords.length === 0) {
    return [];
  }

  const metadataMap = await getAttendanceMetadataMap(normalizedRecords.map(record => record.id));
  const schedulesByEventId = await getEffectiveAttendanceSchedulesMap(
    normalizedRecords.map(record => record.event_id)
  );

  return normalizedRecords.map(record => {
    const metadata = metadataMap.get(String(record.id));
    if (metadata) {
      return {
        ...record,
        punctuality_status: metadata.punctuality_status || 'not_applicable',
        late_minutes: Number.isFinite(Number(metadata.late_minutes)) ? Number(metadata.late_minutes) : 0
      };
    }

    const schedule = schedulesByEventId.get(String(record.event_id));
    const punctuality = calculatePunctuality(schedule, record.slot, record.time);
    return {
      ...record,
      ...punctuality
    };
  });
}

module.exports = {
  enrichAttendanceRecords
};
