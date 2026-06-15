const today = () => new Date().toISOString().split('T')[0];
const monthStart = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-01`;
const monthEnd   = (date = new Date()) => {
  const d = new Date(date.getFullYear(), date.getMonth()+1, 0);
  return d.toISOString().split('T')[0];
};
const addDays = (date, days) => {
  const d = new Date(date); d.setDate(d.getDate() + days); return d.toISOString().split('T')[0];
};
const diffDays = (d1, d2) =>
  Math.round((new Date(d2) - new Date(d1)) / 86400000);

module.exports = { today, monthStart, monthEnd, addDays, diffDays };
