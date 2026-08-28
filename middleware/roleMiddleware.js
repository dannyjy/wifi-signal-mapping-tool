const { hasRole } = require('../config/passport');

module.exports = {
  checkRole: (roles) => {
    return (req, res, next) => {
      if (!req.session || !req.session.user) {
        req.flash('error_msg', 'Unauthorized access');
        return res.redirect('/auth/login');
      }

      if (hasRole(req.session.user, roles)) {
        return next();
      }

      req.flash('error_msg', 'Access denied: Insufficient permissions');
      return res.redirect('/dashboard');
    };
  }
};
