/**
 * Local file upload endpoint (dev/on-premise).
 * Files are saved to backend/uploads/<subfolder>/ and served as static assets.
 * In production replace this with an R2/S3 upload handler.
 */
const router   = require('express').Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const auth     = require('../middleware/auth');
const { success } = require('../utils/response');

// ── Disk storage ──────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.params.folder || 'general';
    const dir = path.join(__dirname, '..', 'uploads', folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const ext = path.extname(file.originalname).toLowerCase();
  allowed.includes(ext) ? cb(null, true) : cb(new Error('Only image files are allowed'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ── POST /api/upload/:folder ─────────────────────────────────────────────────
// :folder  → subfolder name, e.g. "banners", "avatars", "branding"
// Returns   → { url: "/uploads/banners/filename.jpg" }
router.post('/:folder', auth, upload.single('file'), (req, res) => {
  if (!req.file) throw Object.assign(new Error('No file uploaded'), { statusCode: 400 });

  const folder = req.params.folder || 'general';
  const url = `/uploads/${folder}/${req.file.filename}`;
  success(res, { url }, 'File uploaded');
});

module.exports = router;
