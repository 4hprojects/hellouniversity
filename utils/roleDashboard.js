function getDashboardPathForRole(role) {
  switch (role) {
    case 'admin':
      return '/admin_dashboard';
    case 'teacher':
      return '/teacher/dashboard';
    case 'teacher_pending':
      return '/approval-pending';
    case 'manager':
      return '/crfv';
    case 'student':
    default:
      return '/dashboard';
  }
}

module.exports = {
  getDashboardPathForRole
};
