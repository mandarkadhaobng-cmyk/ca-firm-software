const reportService = require('../services/report.service');
const { success } = require('../utils/response');
const { today, monthStart } = require('../utils/dateHelper');

exports.dashboard = async (req, res) => {
  const stats = await reportService.dashboardStats(req.user.firm_id);
  success(res, stats);
};

exports.utilization = async (req, res) => {
  const { fromDate = monthStart(), toDate = today(), departmentId } = req.query;
  const data = await reportService.utilizationReport({ firmId: req.user.firm_id, fromDate, toDate, departmentId });
  success(res, data);
};

exports.clientHours = async (req, res) => {
  const { fromDate = monthStart(), toDate = today(), clientId } = req.query;
  const data = await reportService.clientHoursReport({ firmId: req.user.firm_id, fromDate, toDate, clientId });
  success(res, data);
};

exports.billable = async (req, res) => {
  const { fromDate = monthStart(), toDate = today() } = req.query;
  const data = await reportService.billableReport({ firmId: req.user.firm_id, fromDate, toDate });
  success(res, data);
};

exports.departments = async (req, res) => {
  const data = await reportService.departmentStats(req.user.firm_id);
  success(res, data);
};

exports.leaveReport = async (req, res) => {
  const { fromDate = monthStart(), toDate = today() } = req.query;
  const data = await reportService.leaveReport({ firmId: req.user.firm_id, fromDate, toDate });
  success(res, data);
};
