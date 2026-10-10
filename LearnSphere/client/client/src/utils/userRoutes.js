export function getDashboardPath(user) {
  const roles = user?.roles || (user?.role ? [user.role] : [])
  return roles.some((role) => ['INSTRUCTOR', 'ADMIN'].includes(role))
    ? '/instructor/courses'
    : '/dashboard'
}
