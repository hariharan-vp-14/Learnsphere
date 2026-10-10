export function getDashboardPath(user, preferredRole) {
  const roles = user?.roles || (user?.role ? [user.role] : [])
  if (preferredRole === 'STUDENT' && roles.includes('STUDENT')) return '/dashboard'
  if (preferredRole === 'INSTRUCTOR' && roles.includes('INSTRUCTOR')) return '/instructor/courses'
  return roles.some((role) => ['INSTRUCTOR', 'ADMIN'].includes(role))
    ? '/instructor/courses'
    : '/dashboard'
}
