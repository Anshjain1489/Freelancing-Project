const getPaginationParams = (queryPage, queryLimit, defaultLimit = 20) => {
  const page = Math.max(1, parseInt(queryPage, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryLimit, 10) || defaultLimit));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

const formatPaginatedResponse = (items, page, limit, totalItems) => {
  const totalPages = Math.ceil(totalItems / limit) || 1;
  return {
    items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  };
};

module.exports = { getPaginationParams, formatPaginatedResponse };
