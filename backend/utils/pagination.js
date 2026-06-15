const paginate = (query = {}) => {
  const page     = Math.max(1, parseInt(query.page)     || 1);
  const pageSize = Math.min(100, parseInt(query.pageSize) || 15);
  const offset   = (page - 1) * pageSize;
  return { page, pageSize, offset, limit: pageSize };
};

module.exports = { paginate };
