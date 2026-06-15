import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

export const formatDate = (date, fmt = 'dd MMM yyyy') => {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, fmt) : '—';
};

export const formatDateTime = (date) => formatDate(date, 'dd MMM yyyy, hh:mm a');

export const formatTimeAgo = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '';
};

export const formatHours = (hours) => {
  if (hours === null || hours === undefined) return '0h';
  const h = parseFloat(hours);
  return `${h.toFixed(1)}h`;
};

export const formatCurrency = (amount, currency = 'INR') => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
};

export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
};

export const formatPercentage = (value, total) => {
  if (!total || total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

export const fullName = (user) => {
  if (!user) return '—';
  // Handle both camelCase (API response) and snake_case (DB row) shapes
  const first = user.firstName || user.first_name || '';
  const last  = user.lastName  || user.last_name  || '';
  return `${first} ${last}`.trim() || user.email || '—';
};

export const getInitials = (name) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const truncate = (text, length = 50) => {
  if (!text) return '';
  return text.length > length ? `${text.slice(0, length)}...` : text;
};

export const getWeekDates = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(d.setDate(diff));
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    dates.push(current);
  }
  return dates;
};

export const isoDate = (date = new Date()) => {
  return format(date, 'yyyy-MM-dd');
};
