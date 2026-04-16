const { getMongoClient } = require('./mongoClient');
const {
  DEFAULT_ATTENDANCE_SCHEDULE,
  cloneAttendanceSchedule,
  normalizeAttendanceSchedule
} = require('./crfvAttendanceSchedule');

const SETTINGS_COLLECTION = 'crfv_settings';
const EVENT_SCHEDULES_COLLECTION = 'crfv_event_schedules';
const ATTENDANCE_METADATA_COLLECTION = 'crfv_attendance_metadata';
const DEFAULTS_KEY = 'attendance-defaults';

const memoryState = {
  attendanceDefaults: cloneAttendanceSchedule(DEFAULT_ATTENDANCE_SCHEDULE),
  eventSchedules: new Map(),
  attendanceMetadata: new Map()
};

function useMemoryStore() {
  return process.env.NODE_ENV === 'test' || !process.env.MONGODB_URI;
}

async function getDb() {
  const client = await getMongoClient();
  return client.db('myDatabase');
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

async function getAttendanceDefaults() {
  if (useMemoryStore()) {
    return cloneValue(memoryState.attendanceDefaults);
  }

  const db = await getDb();
  const doc = await db.collection(SETTINGS_COLLECTION).findOne({ key: DEFAULTS_KEY });
  if (!doc?.attendance_schedule) {
    return cloneAttendanceSchedule(DEFAULT_ATTENDANCE_SCHEDULE);
  }
  return normalizeAttendanceSchedule(doc.attendance_schedule);
}

async function updateAttendanceDefaults(attendanceSchedule, actor = {}) {
  const nextSchedule = normalizeAttendanceSchedule(attendanceSchedule);

  if (useMemoryStore()) {
    memoryState.attendanceDefaults = cloneValue(nextSchedule);
    return cloneValue(nextSchedule);
  }

  const db = await getDb();
  await db.collection(SETTINGS_COLLECTION).updateOne(
    { key: DEFAULTS_KEY },
    {
      $set: {
        key: DEFAULTS_KEY,
        attendance_schedule: nextSchedule,
        updatedAt: new Date(),
        updatedBy: {
          userId: actor.userId || null,
          studentIDNumber: actor.studentIDNumber || null,
          role: actor.role || null
        }
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );

  return cloneValue(nextSchedule);
}

async function getEventSchedule(eventId) {
  if (!eventId) {
    return null;
  }

  if (useMemoryStore()) {
    const schedule = memoryState.eventSchedules.get(String(eventId));
    return schedule ? cloneValue(schedule) : null;
  }

  const db = await getDb();
  const doc = await db.collection(EVENT_SCHEDULES_COLLECTION).findOne({ eventId: String(eventId) });
  if (!doc?.attendance_schedule) {
    return null;
  }
  return normalizeAttendanceSchedule(doc.attendance_schedule);
}

async function getEventSchedulesMap(eventIds = []) {
  const uniqueIds = Array.from(new Set(eventIds.filter(Boolean).map(String)));
  const schedules = new Map();

  if (uniqueIds.length === 0) {
    return schedules;
  }

  if (useMemoryStore()) {
    uniqueIds.forEach(eventId => {
      if (memoryState.eventSchedules.has(eventId)) {
        schedules.set(eventId, cloneValue(memoryState.eventSchedules.get(eventId)));
      }
    });
    return schedules;
  }

  const db = await getDb();
  const docs = await db.collection(EVENT_SCHEDULES_COLLECTION)
    .find({ eventId: { $in: uniqueIds } })
    .toArray();

  docs.forEach(doc => {
    if (doc?.eventId && doc?.attendance_schedule) {
      schedules.set(String(doc.eventId), normalizeAttendanceSchedule(doc.attendance_schedule));
    }
  });

  return schedules;
}

async function getEffectiveAttendanceScheduleForEvent(eventId) {
  const eventSchedule = await getEventSchedule(eventId);
  if (eventSchedule) {
    return eventSchedule;
  }
  return getAttendanceDefaults();
}

async function getEffectiveAttendanceSchedulesMap(eventIds = []) {
  const defaults = await getAttendanceDefaults();
  const schedules = await getEventSchedulesMap(eventIds);
  const result = new Map();

  Array.from(new Set(eventIds.filter(Boolean).map(String))).forEach(eventId => {
    result.set(eventId, schedules.get(eventId) || cloneValue(defaults));
  });

  return result;
}

async function upsertEventSchedule(eventId, attendanceSchedule, actor = {}) {
  if (!eventId) {
    return null;
  }

  const nextSchedule = normalizeAttendanceSchedule(attendanceSchedule);
  const normalizedEventId = String(eventId);

  if (useMemoryStore()) {
    memoryState.eventSchedules.set(normalizedEventId, cloneValue(nextSchedule));
    return cloneValue(nextSchedule);
  }

  const db = await getDb();
  await db.collection(EVENT_SCHEDULES_COLLECTION).updateOne(
    { eventId: normalizedEventId },
    {
      $set: {
        eventId: normalizedEventId,
        attendance_schedule: nextSchedule,
        updatedAt: new Date(),
        updatedBy: {
          userId: actor.userId || null,
          studentIDNumber: actor.studentIDNumber || null,
          role: actor.role || null
        }
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );

  return cloneValue(nextSchedule);
}

async function getAttendanceMetadataMap(recordIds = []) {
  const uniqueIds = Array.from(new Set(recordIds.filter(id => id !== undefined && id !== null).map(String)));
  const metadata = new Map();

  if (uniqueIds.length === 0) {
    return metadata;
  }

  if (useMemoryStore()) {
    uniqueIds.forEach(id => {
      if (memoryState.attendanceMetadata.has(id)) {
        metadata.set(id, cloneValue(memoryState.attendanceMetadata.get(id)));
      }
    });
    return metadata;
  }

  const db = await getDb();
  const docs = await db.collection(ATTENDANCE_METADATA_COLLECTION)
    .find({ attendanceRecordId: { $in: uniqueIds } })
    .toArray();

  docs.forEach(doc => {
    if (doc?.attendanceRecordId) {
      metadata.set(String(doc.attendanceRecordId), cloneValue(doc));
    }
  });

  return metadata;
}

async function upsertAttendanceMetadata(recordId, metadata, actor = {}) {
  if (recordId === undefined || recordId === null) {
    return null;
  }

  const attendanceRecordId = String(recordId);
  const doc = {
    attendanceRecordId,
    punctuality_status: metadata.punctuality_status || 'not_applicable',
    late_minutes: Number.isFinite(Number(metadata.late_minutes)) ? Number(metadata.late_minutes) : 0,
    event_id: metadata.event_id || null,
    slot: metadata.slot || null,
    time: metadata.time || null,
    schedule_snapshot: normalizeAttendanceSchedule(metadata.schedule_snapshot || DEFAULT_ATTENDANCE_SCHEDULE),
    updatedAt: new Date(),
    updatedBy: {
      userId: actor.userId || null,
      studentIDNumber: actor.studentIDNumber || null,
      role: actor.role || null
    }
  };

  if (useMemoryStore()) {
    memoryState.attendanceMetadata.set(attendanceRecordId, cloneValue(doc));
    return cloneValue(doc);
  }

  const db = await getDb();
  await db.collection(ATTENDANCE_METADATA_COLLECTION).updateOne(
    { attendanceRecordId },
    {
      $set: doc,
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );

  return cloneValue(doc);
}

function __resetTestState() {
  memoryState.attendanceDefaults = cloneAttendanceSchedule(DEFAULT_ATTENDANCE_SCHEDULE);
  memoryState.eventSchedules = new Map();
  memoryState.attendanceMetadata = new Map();
}

module.exports = {
  getAttendanceDefaults,
  updateAttendanceDefaults,
  getEventSchedule,
  getEventSchedulesMap,
  getEffectiveAttendanceScheduleForEvent,
  getEffectiveAttendanceSchedulesMap,
  upsertEventSchedule,
  getAttendanceMetadataMap,
  upsertAttendanceMetadata,
  __resetTestState
};
