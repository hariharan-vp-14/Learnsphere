export function getDashboardPath(user, preferredRole) {
  const roles = user?.roles || (user?.role ? [user.role] : [])
  if (roles.includes('ADMIN') || user?.role === 'ADMIN') return '/admin/dashboard'
  if (
    user?.instructorProfile
    && user.instructorProfile.applicationStatus !== 'APPROVED'
    && preferredRole !== 'STUDENT'
    && (preferredRole === 'INSTRUCTOR' || !roles.includes('INSTRUCTOR'))
  ) {
    return '/teacher/application'
  }
  if (preferredRole === 'STUDENT' && roles.includes('STUDENT')) return '/dashboard'
  if (preferredRole === 'INSTRUCTOR' && roles.includes('INSTRUCTOR')) return '/instructor/courses'
  return roles.some((role) => ['INSTRUCTOR', 'ADMIN'].includes(role))
    ? '/instructor/courses'
    : '/dashboard'
}
