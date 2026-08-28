// Authentication & Role-Based Access Control Configuration
module.exports = {
  roles: {
    ADMIN: 'Admin',
    SURVEYOR: 'Surveyor',
    VIEWER: 'Viewer'
  },
  
  hasRole: (user, allowedRoles) => {
    if (!user) return false;
    if (typeof allowedRoles === 'string') {
      allowedRoles = [allowedRoles];
    }
    return allowedRoles.includes(user.role);
  }
};
