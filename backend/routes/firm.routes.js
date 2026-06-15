const router  = require('express').Router();
const ctrl    = require('../controllers/firm.controller');
const auth    = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const multer  = require('multer');

// Use memory storage so we can forward the buffer to R2
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.use(auth);

router.get  ('/me',       ctrl.getFirm);
router.put  ('/me',       requireRole('super_admin'), ctrl.updateFirm);
router.post ('/me/logo',  requireRole('super_admin'), upload.single('logo'), ctrl.uploadLogo);

module.exports = router;
