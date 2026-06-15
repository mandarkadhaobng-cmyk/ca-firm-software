const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');
const auth   = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

router.post('/login',           authLimiter, ctrl.login);
router.post('/refresh',         ctrl.refreshToken);
router.post('/logout',          ctrl.logout);
router.post('/forgot-password', authLimiter, ctrl.forgotPassword);
router.post('/reset-password',  ctrl.resetPassword);
router.get ('/me',              auth, ctrl.me);
router.put ('/change-password', auth, ctrl.changePassword);
router.get ('/login-history',   auth, ctrl.loginHistory);

module.exports = router;
