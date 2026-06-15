const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

module.exports = {
  origin: (origin, cb) => {
    if (!origin || origins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
};
