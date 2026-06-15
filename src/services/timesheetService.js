import apiClient from './apiClient';

export const timesheetService = {
  /**
   * Get timesheets list.
   * Returns { data: [...], count: N } to match what TimesheetList expects.
   */
  async getAll(params = {}) {
    const { data } = await apiClient.get('/timesheets', { params });
    return {
      data:  data.data  ?? [],
      count: data.pagination?.total ?? 0,
    };
  },

  async create(payload) {
    const { data } = await apiClient.post('/timesheets', payload);
    return data.data;
  },

  /**
   * Submit one or more draft timesheets for approval.
   * Called as: timesheetService.submit(ids, firmId)
   * Backend expects POST /timesheets/submit  { ids: [...] }
   */
  async submit(ids) {
    const { data } = await apiClient.post('/timesheets/submit', { ids });
    return data;
  },

  /** Alias kept for backward compat */
  async bulkSubmit(ids) {
    return this.submit(ids);
  },

  /**
   * Delete a draft timesheet entry.
   * Called as: timesheetService.delete(id)
   */
  async delete(id) {
    const { data } = await apiClient.delete(`/timesheets/${id}`);
    return data;
  },

  async approve(id, comment) {
    const { data } = await apiClient.patch(`/timesheets/${id}/approve`, { comment });
    return data;
  },

  async reject(id, comment) {
    const { data } = await apiClient.patch(`/timesheets/${id}/reject`, { comment });
    return data;
  },

  /**
   * Get total hours already logged for a given date by the current user.
   * Called as: timesheetService.getDailySummary(userId, date) in TimesheetEntry
   *            timesheetService.getDailyHours(date) in other places
   * Backend endpoint: GET /timesheets/daily-hours?date=YYYY-MM-DD
   */
  async getDailyHours(date) {
    const { data } = await apiClient.get('/timesheets/daily-hours', { params: { date } });
    return data.data?.total ?? 0;
  },

  /** Alias: TimesheetEntry calls getDailySummary(userId, date) — userId is ignored (JWT handles it) */
  async getDailySummary(_userId, date) {
    return this.getDailyHours(date);
  },

  async getPendingCount() {
    const { data } = await apiClient.get('/timesheets/pending-count');
    return data.data?.count ?? 0;
  },

  /**
   * Fetch all timesheet entries for a date range (used by Weekly View).
   * Called as: timesheetService.getWeeklyView(userId, fromDate, toDate)
   * userId is ignored — the backend scopes by JWT automatically.
   */
  async getWeeklyView(_userId, fromDate, toDate) {
    const { data } = await apiClient.get('/timesheets', {
      params: { fromDate, toDate, pageSize: 100 },
    });
    return data.data ?? [];
  },

  /**
   * Get all timesheet entries for a specific month.
   * Returns a flat array of entry objects with date, hours_worked, status fields.
   * Used by EmployeeDashboard to compute monthly totals and weekly chart data.
   */
  async getMonthlyHours(_userId, year, month) {
    const mm = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const fromDate = `${year}-${mm}-01`;
    const toDate   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;
    const { data } = await apiClient.get('/timesheets', {
      params: { fromDate, toDate, pageSize: 500 },
    });
    return data.data ?? [];
  },
};
