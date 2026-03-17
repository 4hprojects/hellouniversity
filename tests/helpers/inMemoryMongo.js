const { ObjectId } = require('mongodb');

function toIdString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.toHexString === 'function') return value.toHexString();
  return String(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item));
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (value && typeof value.toHexString === 'function') {
    return new ObjectId(value.toHexString());
  }
  if (value && typeof value === 'object') {
    const next = {};
    Object.entries(value).forEach(([key, item]) => {
      next[key] = cloneValue(item);
    });
    return next;
  }
  return value;
}

function getFieldValue(row, key) {
  return row[key];
}

function matchValue(actual, expected) {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    if ('$exists' in expected) {
      return expected.$exists ? actual !== undefined : actual === undefined;
    }
    if ('$regex' in expected) {
      const pattern = expected.$regex instanceof RegExp
        ? expected.$regex
        : new RegExp(expected.$regex, expected.$options || '');
      return pattern.test(String(actual || ''));
    }
    if ('$elemMatch' in expected) {
      if (!Array.isArray(actual)) return false;
      return actual.some((item) => matchQuery(item, expected.$elemMatch));
    }
    if ('$in' in expected) {
      return expected.$in.some((item) => matchValue(actual, item));
    }
    if ('$ne' in expected) {
      return !matchValue(actual, expected.$ne);
    }
  }

  if (Array.isArray(actual)) {
    return actual.some((item) => matchValue(item, expected));
  }

  if (actual instanceof Date || expected instanceof Date) {
    const actualTime = actual instanceof Date ? actual.getTime() : new Date(actual).getTime();
    const expectedTime = expected instanceof Date ? expected.getTime() : new Date(expected).getTime();
    return actualTime === expectedTime;
  }

  return toIdString(actual) === toIdString(expected);
}

function matchQuery(row, query = {}) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '$or') {
      return expected.some((part) => matchQuery(row, part));
    }
    if (key === '$and') {
      return expected.every((part) => matchQuery(row, part));
    }
    return matchValue(getFieldValue(row, key), expected);
  });
}

function createCursor(rows) {
  return {
    sort(sortSpec = {}) {
      const entries = Object.entries(sortSpec);
      const sortedRows = [...rows].sort((left, right) => {
        for (const [key, direction] of entries) {
          const leftValue = getFieldValue(left, key) || 0;
          const rightValue = getFieldValue(right, key) || 0;
          if (leftValue < rightValue) return direction < 0 ? 1 : -1;
          if (leftValue > rightValue) return direction < 0 ? -1 : 1;
        }
        return 0;
      });
      return createCursor(sortedRows);
    },
    project(projection = {}) {
      const projectedRows = rows.map((row) => {
        const next = {};
        Object.entries(projection).forEach(([key, include]) => {
          if (include) {
            next[key] = row[key];
          }
        });
        return next;
      });
      return createCursor(projectedRows);
    },
    async toArray() {
      return rows.map((row) => cloneValue(row));
    }
  };
}

function applyUpdate(target, update = {}) {
  if (update.$set) {
    Object.entries(update.$set).forEach(([key, value]) => {
      target[key] = cloneValue(value);
    });
  }
}

function createCollection(initialRows = []) {
  const rows = initialRows.map((row) => cloneValue(row));

  return {
    _rows: rows,
    find(query = {}) {
      return createCursor(rows.filter((row) => matchQuery(row, query)));
    },
    async findOne(query = {}) {
      const row = rows.find((candidate) => matchQuery(candidate, query));
      return row ? cloneValue(row) : null;
    },
    async insertOne(doc) {
      const insertedId = doc._id || new ObjectId();
      rows.push({ ...cloneValue(doc), _id: insertedId });
      return { acknowledged: true, insertedId };
    },
    async updateOne(query = {}, update = {}, options = {}) {
      const index = rows.findIndex((row) => matchQuery(row, query));
      if (index >= 0) {
        applyUpdate(rows[index], update);
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedId: null };
      }

      if (!options.upsert) {
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedId: null };
      }

      const baseDoc = {};
      Object.entries(query).forEach(([key, value]) => {
        const isOperatorObject = value
          && typeof value === 'object'
          && !Array.isArray(value)
          && !(value instanceof Date)
          && !(typeof value.toHexString === 'function')
          && Object.keys(value).some((innerKey) => innerKey.startsWith('$'));

        if (!key.startsWith('$') && !isOperatorObject) {
          baseDoc[key] = cloneValue(value);
        }
      });

      const insertedId = baseDoc._id || new ObjectId();
      const nextRow = { ...baseDoc, _id: insertedId };
      if (update.$setOnInsert) {
        Object.entries(update.$setOnInsert).forEach(([key, value]) => {
          nextRow[key] = cloneValue(value);
        });
      }
      applyUpdate(nextRow, update);
      rows.push(nextRow);
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedId: insertedId };
    },
    async deleteMany(query = {}) {
      const before = rows.length;
      const remaining = rows.filter((row) => !matchQuery(row, query));
      rows.splice(0, rows.length, ...remaining);
      return { acknowledged: true, deletedCount: before - rows.length };
    },
    async countDocuments(query = {}) {
      return rows.filter((row) => matchQuery(row, query)).length;
    }
  };
}

module.exports = {
  createCollection,
  createCursor,
  matchQuery,
  toIdString
};
