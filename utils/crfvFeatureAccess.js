const CRFV_FEATURES = Object.freeze([
  {
    key: 'event_create',
    label: 'Create Event',
    href: '/crfv/event-create',
    roles: ['admin', 'manager'],
  },
  {
    key: 'admin_register',
    label: 'Registration',
    href: '/crfv/admin-register',
    roles: ['admin', 'manager', 'staff'],
  },
  {
    key: 'attendance',
    label: 'Attendance',
    href: '/crfv/attendance',
    roles: ['admin', 'manager', 'staff'],
  },
  {
    key: 'reports',
    label: 'Reports',
    href: '/crfv/reports',
    roles: ['admin', 'manager', 'staff'],
  },
  {
    key: 'attendance_summary',
    label: 'Attendance Summary',
    href: '/crfv/attendanceSummary',
    roles: ['admin', 'manager', 'staff'],
  },
  {
    key: 'payment_reports',
    label: 'Payment Reports',
    href: '/crfv/payment-reports',
    roles: ['admin', 'manager'],
  },
  {
    key: 'payment_audits',
    label: 'Payment Audits',
    href: '/crfv/payment-audits',
    roles: ['admin', 'manager'],
  },
  {
    key: 'audit_trail',
    label: 'Audit Trail',
    href: '/crfv/audittrail',
    roles: ['admin', 'manager'],
  },
  {
    key: 'system_settings',
    label: 'System Settings',
    href: '/crfv/system-settings',
    roles: ['admin', 'manager'],
  },
  {
    key: 'account_management',
    label: 'Account Management',
    href: '/crfv/account-management',
    roles: ['admin', 'manager'],
  },
]);

const CRFV_FEATURE_KEYS = Object.freeze(CRFV_FEATURES.map((feature) => feature.key));
const CRFV_FEATURE_KEY_SET = new Set(CRFV_FEATURE_KEYS);

const ROLE_DEFAULTS = Object.freeze({
  admin: CRFV_FEATURE_KEYS,
  manager: CRFV_FEATURE_KEYS,
  staff: ['admin_register', 'attendance', 'reports', 'attendance_summary'],
});

function normalizeRole(role) {
  return String(role || '')
    .trim()
    .toLowerCase();
}

function normalizeFeatureList(features) {
  if (!Array.isArray(features)) {
    return [];
  }

  return Array.from(
    new Set(
      features
        .map((feature) =>
          String(feature || '')
            .trim()
            .toLowerCase(),
        )
        .filter((feature) => CRFV_FEATURE_KEY_SET.has(feature)),
    ),
  );
}

function getDefaultCrfvFeaturesForRole(role) {
  const normalizedRole = normalizeRole(role);
  return [...(ROLE_DEFAULTS[normalizedRole] || [])];
}

function getEffectiveCrfvFeatures(userOrSession = {}) {
  const role = normalizeRole(userOrSession.role);
  if (role === 'admin') {
    return getDefaultCrfvFeaturesForRole('admin');
  }

  const explicitFeatures = normalizeFeatureList(userOrSession.crfvFeatureAccess);
  if (explicitFeatures.length > 0) {
    return explicitFeatures;
  }

  return getDefaultCrfvFeaturesForRole(role);
}

function hasCrfvFeature(userOrSession, featureKey) {
  const role = normalizeRole(userOrSession?.role);
  if (role === 'admin') {
    return true;
  }

  return getEffectiveCrfvFeatures(userOrSession).includes(featureKey);
}

function validateCrfvFeatures(features) {
  if (!Array.isArray(features)) {
    return {
      valid: false,
      features: [],
      invalidFeatures: [],
      message: 'Features must be an array.',
    };
  }

  const normalized = features.map((feature) =>
    String(feature || '')
      .trim()
      .toLowerCase(),
  );
  const invalidFeatures = normalized.filter(
    (feature) => !CRFV_FEATURE_KEY_SET.has(feature),
  );

  return {
    valid: invalidFeatures.length === 0,
    features: normalizeFeatureList(normalized),
    invalidFeatures,
    message: invalidFeatures.length
      ? `Invalid CRFV feature(s): ${invalidFeatures.join(', ')}.`
      : '',
  };
}

function serializeCrfvFeatureCatalog() {
  return CRFV_FEATURES.map((feature) => ({
    key: feature.key,
    label: feature.label,
    href: feature.href,
    roles: [...feature.roles],
  }));
}

module.exports = {
  CRFV_FEATURES,
  CRFV_FEATURE_KEYS,
  getDefaultCrfvFeaturesForRole,
  getEffectiveCrfvFeatures,
  hasCrfvFeature,
  normalizeFeatureList,
  serializeCrfvFeatureCatalog,
  validateCrfvFeatures,
};
