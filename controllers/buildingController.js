const Building = require('../models/Building');
const Floor = require('../models/Floor');

module.exports = {
  index: async (req, res) => {
    try {
      const buildings = await Building.getAll();
      res.render('buildings/index', {
        title: 'Campus Buildings - Wi-Fi Mapping Tool',
        buildings,
        user: req.session.user,
        error_msg: req.flash('error_msg'),
        success_msg: req.flash('success_msg')
      });
    } catch (err) {
      console.error('Error fetching buildings:', err);
      res.status(500).render('500', { title: 'Server Error' });
    }
  },

  create: (req, res) => {
    res.render('buildings/create', {
      title: 'Add Campus Building',
      user: req.session.user,
      error_msg: req.flash('error_msg'),
      success_msg: req.flash('success_msg')
    });
  },

  store: async (req, res) => {
    try {
      const { name, code, location, total_floors } = req.body;
      if (!name || !code) {
        req.flash('error_msg', 'Building Name and Code are required');
        return res.redirect('/buildings/create');
      }

      await Building.create({
        name,
        code,
        location,
        total_floors: parseInt(total_floors || 1)
      });

      req.flash('success_msg', 'Building created successfully');
      res.redirect('/buildings');
    } catch (err) {
      console.error('Error creating building:', err);
      req.flash('error_msg', 'Failed to create building. Code may already exist.');
      res.redirect('/buildings/create');
    }
  },

  show: async (req, res) => {
    try {
      const building = await Building.findById(req.params.id);
      if (!building) {
        return res.status(404).render('404', { title: 'Building Not Found' });
      }

      res.render('buildings/show', {
        title: `${building.name} - Floor Plans`,
        building,
        user: req.session.user,
        error_msg: req.flash('error_msg'),
        success_msg: req.flash('success_msg')
      });
    } catch (err) {
      console.error('Error fetching building details:', err);
      res.status(500).render('500', { title: 'Server Error' });
    }
  },

  addFloor: async (req, res) => {
    try {
      const building_id = req.params.id;
      const { floor_number, scale_factor } = req.body;

      if (!req.file) {
        req.flash('error_msg', 'Please upload a floor plan image file');
        return res.redirect(`/buildings/${building_id}`);
      }

      const image_path = req.file.path;

      await Floor.create({
        building_id,
        floor_number: parseInt(floor_number || 1),
        image_path,
        scale_factor: parseFloat(scale_factor || 1.0)
      });

      req.flash('success_msg', 'Floor plan uploaded successfully');
      res.redirect(`/buildings/${building_id}`);
    } catch (err) {
      console.error('Error adding floor plan:', err);
      req.flash('error_msg', 'Failed to upload floor plan');
      res.redirect(`/buildings/${req.params.id}`);
    }
  },

  deleteFloor: async (req, res) => {
    try {
      const floor = await Floor.findById(req.params.id);
      if (!floor) {
        req.flash('error_msg', 'Floor plan not found');
        return res.redirect('/buildings');
      }

      const building_id = floor.building_id;
      await Floor.delete(req.params.id);
      req.flash('success_msg', 'Floor plan deleted');
      res.redirect(`/buildings/${building_id}`);
    } catch (err) {
      console.error('Error deleting floor:', err);
      req.flash('error_msg', 'Error deleting floor plan');
      res.redirect('/buildings');
    }
  },

  delete: async (req, res) => {
    try {
      const building = await Building.findById(req.params.id);
      if (!building) {
        req.flash('error_msg', 'Building not found');
        return res.redirect('/buildings');
      }

      await Building.delete(req.params.id);
      req.flash('success_msg', `Building "${building.name}" and all associated floors & surveys deleted`);
      res.redirect('/buildings');
    } catch (err) {
      console.error('Error deleting building:', err);
      req.flash('error_msg', 'Failed to delete building');
      res.redirect('/buildings');
    }
  }
};
