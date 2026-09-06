const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const db = require('./config/database');
const seedDatabase = require('./database/seed');

// Import Controllers & Middleware
const authController = require('./controllers/authController');
const buildingController = require('./controllers/buildingController');
const surveyController = require('./controllers/surveyController');
const apiController = require('./controllers/apiController');
const heatmapController = require('./controllers/heatmapController');
const reportController = require('./controllers/reportController');
const userController = require('./controllers/userController');

const { ensureAuthenticated, forwardAuthenticated } = require('./middleware/authMiddleware');
const { checkRole } = require('./middleware/roleMiddleware');
const { upload, uploadToCloudinary } = require('./middleware/uploadMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// EJS View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body Parser & Static Files
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'juba_wifi_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Flash Notification Banners & Global View Variables
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success_msg = req.session.success_msg || null;
  res.locals.error_msg = req.session.error_msg || null;
  
  delete req.session.success_msg;
  delete req.session.error_msg;

  req.flash = (type, msg) => {
    req.session[type === 'success_msg' ? 'success_msg' : 'error_msg'] = msg;
  };

  next();
});

// -------------------------------------------------------------
// ROUTES MAP
// -------------------------------------------------------------

// Root redirect
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/auth/login');
  }
});

// A. Authentication Routes
app.get('/auth/login', forwardAuthenticated, authController.getLogin);
app.post('/auth/login', forwardAuthenticated, authController.postLogin);
app.get('/auth/register', authController.getRegister);
app.post('/auth/register', authController.postRegister);
app.get('/auth/logout', authController.logout);

// B. Executive Dashboard Overview Route
app.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    const Building = require('./models/Building');
    const Floor = require('./models/Floor');
    const SurveySession = require('./models/SurveySession');
    const MeasurementPoint = require('./models/MeasurementPoint');

    const buildings = await Building.getAll();
    const sessions = await SurveySession.getAll();
    
    let totalFloors = 0;
    buildings.forEach(b => totalFloors += (b.floors || []).length);

    let totalPoints = 0;
    let deadZones = 0;
    const globalQuality = { excellent: 0, good: 0, acceptable: 0, poor: 0 };

    for (const session of sessions) {
      const pts = await MeasurementPoint.getBySession(session.session_id);
      totalPoints += pts.length;
      pts.forEach(pt => {
        const val = pt.rssi_value;
        if (val >= -50) globalQuality.excellent++;
        else if (val >= -60) globalQuality.good++;
        else if (val >= -70) globalQuality.acceptable++;
        else {
          globalQuality.poor++;
          deadZones++;
        }
      });
    }

    res.render('dashboard/index', {
      title: 'Dashboard - Wi-Fi Mapping Tool',
      buildingCount: buildings.length,
      floorCount: totalFloors,
      sessionCount: sessions.length,
      activeSessionCount: sessions.filter(s => s.status === 'Completed' || s.status === 'Draft').length,
      totalPointCount: totalPoints,
      deadZoneCount: deadZones,
      globalQuality,
      recentSessions: sessions.slice(0, 5),
      user: req.session.user
    });
  } catch (err) {
    console.error('Dashboard route error:', err);
    res.status(500).render('500', { title: 'Server Error' });
  }
});

// C. Building & Floor Management Routes
app.get('/buildings', ensureAuthenticated, buildingController.index);
app.get('/buildings/create', ensureAuthenticated, checkRole(['Admin', 'Surveyor']), buildingController.create);
app.post('/buildings', ensureAuthenticated, checkRole(['Admin', 'Surveyor']), buildingController.store);
app.get('/buildings/:id', ensureAuthenticated, buildingController.show);
app.post('/buildings/:id/floors', ensureAuthenticated, checkRole(['Admin', 'Surveyor']), upload.single('floor_image'), uploadToCloudinary, buildingController.addFloor);
app.post('/buildings/:id/delete', ensureAuthenticated, checkRole(['Admin']), buildingController.delete);
app.post('/floors/:id', ensureAuthenticated, checkRole(['Admin']), buildingController.deleteFloor);
app.delete('/floors/:id', ensureAuthenticated, checkRole(['Admin']), buildingController.deleteFloor);

// D. Survey Session & Workspace Routes
app.get('/surveys', ensureAuthenticated, surveyController.index);
app.get('/surveys/new', ensureAuthenticated, checkRole(['Admin', 'Surveyor']), surveyController.createView);
app.post('/surveys', ensureAuthenticated, checkRole(['Admin', 'Surveyor']), surveyController.store);
app.get('/surveys/:id/workspace', ensureAuthenticated, surveyController.workspace);
app.post('/surveys/:id/complete', ensureAuthenticated, checkRole(['Admin', 'Surveyor']), surveyController.complete);
app.post('/surveys/:id/delete', ensureAuthenticated, checkRole(['Admin']), surveyController.delete);

// E. RESTful API Endpoints (Used by Canvas Workspace & IDW Engine)
app.get('/api/surveys/:sessionId/points', ensureAuthenticated, apiController.getPoints);
app.post('/api/surveys/:sessionId/points', ensureAuthenticated, checkRole(['Admin', 'Surveyor']), apiController.addPoint);
app.delete('/api/points/:pointId', ensureAuthenticated, checkRole(['Admin', 'Surveyor']), apiController.deletePoint);

app.get('/api/floors/:floorId/aps', ensureAuthenticated, apiController.getAPs);
app.post('/api/floors/:floorId/aps', ensureAuthenticated, checkRole(['Admin', 'Surveyor']), apiController.addAP);
app.delete('/api/aps/:apId', ensureAuthenticated, checkRole(['Admin', 'Surveyor']), apiController.deleteAP);

app.post('/api/surveys/:sessionId/interpolate', ensureAuthenticated, heatmapController.interpolate);
app.get('/api/surveys/:sessionId/interpolate', ensureAuthenticated, heatmapController.interpolate);

// F. Analytics & PDF Report Export Routes
app.get('/surveys/:id/report', ensureAuthenticated, reportController.getReportView);
app.get('/surveys/:id/report/pdf', ensureAuthenticated, reportController.exportPDF);

// G. Admin User Management Routes
app.get('/admin/users', ensureAuthenticated, checkRole(['Admin']), userController.index);
app.post('/admin/users/:id/role', ensureAuthenticated, checkRole(['Admin']), userController.updateRole);
app.post('/admin/users/:id/delete', ensureAuthenticated, checkRole(['Admin']), userController.deleteUser);

// 404 Error Handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// 500 Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled application error:', err);
  res.status(500).render('500', { title: 'Server Error' });
});

// Auto-seed database & start Express server
seedDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` Wi-Fi Signal Strength Mapping Tool (University of Juba)`);
    console.log(` Server running on http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
