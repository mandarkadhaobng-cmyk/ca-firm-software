const router = require('express').Router();

router.use('/public',        require('./public.routes'));   // no auth — for login-page branding
router.use('/auth',          require('./auth.routes'));
router.use('/firms',         require('./firm.routes'));
router.use('/employees',     require('./employee.routes'));
router.use('/partners',      require('./partner.routes'));
router.use('/clients',       require('./client.routes'));
router.use('/assignments',   require('./assignment.routes'));
router.use('/timesheets',    require('./timesheet.routes'));
router.use('/leaves',        require('./leave.routes'));
router.use('/holidays',      require('./holiday.routes'));
router.use('/notices',       require('./notice.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/reports',       require('./report.routes'));
router.use('/settings',      require('./settings.routes'));
router.use('/banners',        require('./banner.routes'));
router.use('/upload',         require('./upload.routes'));
router.use('/daily-logs',     require('./dailyLog.routes'));
router.use('/weekly-reports', require('./weeklyReport.routes'));
router.use('/payroll',        require('../payroll/payroll.routes'));
router.use('/organization',   require('../organization/organization.routes'));

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'ca-firm-backend' });
});

module.exports = router;
