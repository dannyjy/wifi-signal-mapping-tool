const SurveySession = require('../models/SurveySession');
const { calculateMetrics } = require('../utils/idwCalculator');
const { generatePDFReport } = require('../utils/pdfGenerator');

module.exports = {
  getReportView: async (req, res) => {
    try {
      const session = await SurveySession.findById(req.params.id);
      if (!session) {
        return res.status(404).render('404', { title: 'Survey Report Not Found' });
      }

      const metrics = calculateMetrics(session.points);

      res.render('surveys/report', {
        title: `${session.session_name} - Executive Audit Report`,
        session,
        metrics,
        user: req.session.user,
        error_msg: req.flash('error_msg'),
        success_msg: req.flash('success_msg')
      });
    } catch (err) {
      console.error('Error generating report view:', err);
      res.status(500).render('500', { title: 'Server Error' });
    }
  },

  exportPDF: async (req, res) => {
    try {
      const session = await SurveySession.findById(req.params.id);
      if (!session) {
        return res.status(404).send('Survey session not found');
      }

      generatePDFReport(session, res);
    } catch (err) {
      console.error('Error generating PDF export:', err);
      res.status(500).send('Error generating PDF report');
    }
  }
};
