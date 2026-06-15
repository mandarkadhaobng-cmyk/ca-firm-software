const multer = require('multer');
const path   = require('path');

const storage = multer.memoryStorage(); // keep in memory → upload to R2

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg','.jpeg','.png','.svg','.pdf','.doc','.docx','.xls','.xlsx'];
  const ext = path.extname(file.originalname).toLowerCase();
  allowed.includes(ext) ? cb(null, true) : cb(new Error('File type not allowed'), false);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});
