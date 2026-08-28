module.exports = {
  ensureAuthenticated: (req, res, next) => {
    if (req.session && req.session.user) {
      return next();
    }
    req.flash('error_msg', 'Please log in to access this resource');
    res.redirect('/auth/login');
  },

  forwardAuthenticated: (req, res, next) => {
    if (req.session && req.session.user) {
      return res.redirect('/dashboard');
    }
    next();
  }
};
