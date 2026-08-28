const User = require('../models/User');

module.exports = {
  getLogin: (req, res) => {
    res.render('auth/login', {
      title: 'Login - Wi-Fi Mapping Tool',
      error_msg: req.flash('error_msg'),
      success_msg: req.flash('success_msg')
    });
  },

  postLogin: async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        req.flash('error_msg', 'Please enter both username and password');
        return res.redirect('/auth/login');
      }

      const user = await User.findByUsername(username);
      if (!user) {
        req.flash('error_msg', 'Invalid username or password');
        return res.redirect('/auth/login');
      }

      const isMatch = await User.verifyPassword(user, password);
      if (!isMatch) {
        req.flash('error_msg', 'Invalid username or password');
        return res.redirect('/auth/login');
      }

      req.session.user = {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role
      };

      req.flash('success_msg', `Welcome back, ${user.username}!`);
      res.redirect('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      req.flash('error_msg', 'An error occurred during authentication');
      res.redirect('/auth/login');
    }
  },

  getRegister: (req, res) => {
    res.render('auth/register', {
      title: 'User Registration - Wi-Fi Mapping Tool',
      error_msg: req.flash('error_msg'),
      success_msg: req.flash('success_msg')
    });
  },

  postRegister: async (req, res) => {
    try {
      const { username, email, password, confirm_password } = req.body;

      if (!username || !email || !password) {
        req.flash('error_msg', 'Please fill in all required fields');
        return res.redirect('/auth/register');
      }

      if (password !== confirm_password) {
        req.flash('error_msg', 'Passwords do not match');
        return res.redirect('/auth/register');
      }

      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        req.flash('error_msg', 'Username already exists');
        return res.redirect('/auth/register');
      }

      // New registrations are always created as Viewer; an Admin can upgrade the role later.
      await User.create({
        username,
        email,
        password,
        role: 'Viewer'
      });

      req.flash('success_msg', 'Registration successful as a Viewer! An administrator can upgrade your role.');
      res.redirect('/auth/login');
    } catch (err) {
      console.error('Registration error:', err);
      req.flash('error_msg', 'An error occurred during registration');
      res.redirect('/auth/register');
    }
  },

  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err) console.error('Logout error:', err);
      res.redirect('/auth/login');
    });
  }
};
