const User = require('../models/User');

const VALID_ROLES = ['Admin', 'Surveyor', 'Viewer'];

module.exports = {
  index: async (req, res) => {
    try {
      const users = await User.getAll();
      res.render('admin/users', {
        title: 'User Management - Wi-Fi Mapping Tool',
        users,
        user: req.session.user,
        error_msg: req.flash('error_msg'),
        success_msg: req.flash('success_msg')
      });
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).render('500', { title: 'Server Error' });
    }
  },

  updateRole: async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!VALID_ROLES.includes(role)) {
        req.flash('error_msg', 'Invalid role selected');
        return res.redirect('/admin/users');
      }

      const target = await User.findById(id);
      if (!target) {
        req.flash('error_msg', 'User not found');
        return res.redirect('/admin/users');
      }

      // Prevent an admin from demoting themselves (would lock themselves out)
      if (req.session.user.user_id === parseInt(id, 10)) {
        req.flash('error_msg', 'You cannot change your own role');
        return res.redirect('/admin/users');
      }

      // Prevent removing the last active admin
      if (target.role === 'Admin' && role !== 'Admin') {
        const adminCount = (await User.getAll()).filter(u => u.role === 'Admin').length;
        if (adminCount <= 1) {
          req.flash('error_msg', 'Cannot demote the last remaining Admin');
          return res.redirect('/admin/users');
        }
      }

      await User.updateRole(id, role);
      req.flash('success_msg', `Role for "${target.username}" updated to ${role}`);
      res.redirect('/admin/users');
    } catch (err) {
      console.error('Error updating user role:', err);
      req.flash('error_msg', 'Failed to update user role');
      res.redirect('/admin/users');
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent an admin from deleting their own account
      if (req.session.user.user_id === parseInt(id, 10)) {
        req.flash('error_msg', 'You cannot delete your own account');
        return res.redirect('/admin/users');
      }

      const target = await User.findById(id);
      if (!target) {
        req.flash('error_msg', 'User not found');
        return res.redirect('/admin/users');
      }

      if (target.role === 'Admin') {
        const adminCount = (await User.getAll()).filter(u => u.role === 'Admin').length;
        if (adminCount <= 1) {
          req.flash('error_msg', 'Cannot delete the last remaining Admin');
          return res.redirect('/admin/users');
        }
      }

      await User.delete(id);
      req.flash('success_msg', `User "${target.username}" deleted`);
      res.redirect('/admin/users');
    } catch (err) {
      console.error('Error deleting user:', err);
      req.flash('error_msg', 'Failed to delete user');
      res.redirect('/admin/users');
    }
  }
};