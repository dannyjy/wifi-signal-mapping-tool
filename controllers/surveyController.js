const SurveySession = require('../models/SurveySession');
const Building = require('../models/Building');
const Floor = require('../models/Floor');
const { calculateMetrics } = require('../utils/idwCalculator');

module.exports = {
  index: async (req, res) => {
    try {
      const sessions = await SurveySession.getAll();
      res.render('surveys/index', {
        title: 'Survey Sessions - Wi-Fi Mapping Tool',
        sessions,
        user: req.session.user,
        error_msg: req.flash('error_msg'),
        success_msg: req.flash('success_msg')
      });
    } catch (err) {
      console.error('Error fetching survey sessions:', err);
      res.status(500).render('500', { title: 'Server Error' });
    }
  },

  createView: async (req, res) => {
    try {
      const buildings = await Building.getAll();
      res.render('surveys/create', {
        title: 'Initialize Survey Session',
        buildings,
        user: req.session.user,
        error_msg: req.flash('error_msg'),
        success_msg: req.flash('success_msg')
      });
    } catch (err) {
      console.error('Error loading survey creation form:', err);
      res.status(500).render('500', { title: 'Server Error' });
    }
  },

  store: async (req, res) => {
    try {
      const { floor_id, session_name, notes } = req.body;
      if (!floor_id || !session_name) {
        req.flash('error_msg', 'Floor plan and Session Name are required');
        return res.redirect('/surveys/new');
      }

      const session = await SurveySession.create({
        floor_id,
        user_id: req.session.user.user_id,
        session_name,
        notes,
        status: 'Draft'
      });

      req.flash('success_msg', 'Survey session initialized');
      res.redirect(`/surveys/${session.session_id}/workspace`);
    } catch (err) {
      console.error('Error initializing survey session:', err);
      req.flash('error_msg', 'Failed to create survey session');
      res.redirect('/surveys/new');
    }
  },

  workspace: async (req, res) => {
    try {
      const session = await SurveySession.findById(req.params.id);
      if (!session) {
        return res.status(404).render('404', { title: 'Survey Session Not Found' });
      }

      const metrics = calculateMetrics(session.points);

      res.render('surveys/workspace', {
        title: `${session.session_name} - Workspace`,
        session,
        metrics,
        user: req.session.user,
        error_msg: req.flash('error_msg'),
        success_msg: req.flash('success_msg')
      });
    } catch (err) {
      console.error('Error loading workspace:', err);
      res.status(500).render('500', { title: 'Server Error' });
    }
  },

  complete: async (req, res) => {
    try {
      await SurveySession.updateStatus(req.params.id, 'Completed');
      req.flash('success_msg', 'Survey session marked as Completed');
      res.redirect(`/surveys/${req.params.id}/report`);
    } catch (err) {
      console.error('Error completing survey:', err);
      req.flash('error_msg', 'Failed to complete survey session');
      res.redirect(`/surveys/${req.params.id}/workspace`);
    }
  },

  delete: async (req, res) => {
    try {
      const session = await SurveySession.findById(req.params.id);
      if (!session) {
        req.flash('error_msg', 'Survey session not found');
        return res.redirect('/surveys');
      }

      await SurveySession.delete(req.params.id);
      req.flash('success_msg', `Survey session "${session.session_name}" deleted`);
      res.redirect('/surveys');
    } catch (err) {
      console.error('Error deleting survey session:', err);
      req.flash('error_msg', 'Failed to delete survey session');
      res.redirect('/surveys');
    }
  }
};
