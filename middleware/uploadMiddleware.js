const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
  const extName = allowedTypes.test(require('path').extname(file.originalname).toLowerCase());
  const mimeType = allowedTypes.test(file.mimetype) || file.mimetype === 'image/svg+xml';

  if (extName && mimeType) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, SVG, WebP) are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter
});

// Middleware to upload buffer to Cloudinary after multer processes the file
function uploadToCloudinary(req, res, next) {
  if (!req.file) return next();

  const publicId = 'floor-' + Date.now() + '-' + Math.round(Math.random() * 1e9);

  const stream = cloudinary.uploader.upload_stream(
    {
      folder: 'wifi-mapping-tool/floor-plans',
      public_id: publicId,
      resource_type: 'image',
      format: req.file.originalname.split('.').pop()
    },
    (error, result) => {
      if (error) {
        console.error('Cloudinary upload error:', error);
        return res.status(500).render('500', { title: 'Image upload failed' });
      }
      // Attach Cloudinary URL to req.file so the controller can use it
      req.file.path = result.secure_url;
      req.file.filename = result.public_id;
      next();
    }
  );

  streamifier.createReadStream(req.file.buffer).pipe(stream);
}

module.exports = { upload, uploadToCloudinary };
