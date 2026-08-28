const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');

/**
 * Get current date parts in Asia/Kolkata (IST: UTC+5:30)
 */
const getIstDateParts = (dateObj = new Date()) => {
  // IST offset in ms = +5.5 hours * 3600 * 1000
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(dateObj.getTime() + istOffsetMs);

  return {
    year: istDate.getUTCFullYear(),
    month: istDate.getUTCMonth(), // 0-indexed
    day: istDate.getUTCDate()
  };
};

/**
 * Convert IST local date components (year, month, day, hour, min, sec, ms) to a UTC Date object
 */
const createIstUtcDate = (year, month, day, hour = 0, minute = 0, second = 0, ms = 0) => {
  // Construct UTC time for specified IST components then subtract 5.5 hours
  const utcEquivalentMs = Date.UTC(year, month, day, hour, minute, second, ms);
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  return new Date(utcEquivalentMs - istOffsetMs);
};

const parseDateRange = (range = '30days', startDate = null, endDate = null) => {
  const now = new Date();
  const istNow = getIstDateParts(now);

  let start;
  let end;

  const normalizedRange = String(range || '30days').toLowerCase();

  switch (normalizedRange) {
    case 'today':
      start = createIstUtcDate(istNow.year, istNow.month, istNow.day, 0, 0, 0, 0);
      end = createIstUtcDate(istNow.year, istNow.month, istNow.day, 23, 59, 59, 999);
      break;

    case 'yesterday': {
      const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const istYest = getIstDateParts(yesterdayDate);
      start = createIstUtcDate(istYest.year, istYest.month, istYest.day, 0, 0, 0, 0);
      end = createIstUtcDate(istYest.year, istYest.month, istYest.day, 23, 59, 59, 999);
      break;
    }

    case '7days': {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const ist7 = getIstDateParts(past7);
      start = createIstUtcDate(ist7.year, ist7.month, ist7.day, 0, 0, 0, 0);
      end = createIstUtcDate(istNow.year, istNow.month, istNow.day, 23, 59, 59, 999);
      break;
    }

    case '30days': {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ist30 = getIstDateParts(past30);
      start = createIstUtcDate(ist30.year, ist30.month, ist30.day, 0, 0, 0, 0);
      end = createIstUtcDate(istNow.year, istNow.month, istNow.day, 23, 59, 59, 999);
      break;
    }

    case 'this_month':
    case 'thismonth': {
      start = createIstUtcDate(istNow.year, istNow.month, 1, 0, 0, 0, 0);
      // Last ms of current month
      const nextMonthFirst = createIstUtcDate(istNow.year, istNow.month + 1, 1, 0, 0, 0, 0);
      end = new Date(nextMonthFirst.getTime() - 1);
      break;
    }

    case 'last_month':
    case 'lastmonth': {
      const lmMonth = istNow.month === 0 ? 11 : istNow.month - 1;
      const lmYear = istNow.month === 0 ? istNow.year - 1 : istNow.year;
      start = createIstUtcDate(lmYear, lmMonth, 1, 0, 0, 0, 0);
      const thisMonthFirst = createIstUtcDate(istNow.year, istNow.month, 1, 0, 0, 0, 0);
      end = new Date(thisMonthFirst.getTime() - 1);
      break;
    }

    case 'custom': {
      if (!startDate || !endDate) {
        throw new AppError('Both startDate and endDate are required for custom date range', HTTP_STATUS.BAD_REQUEST);
      }

      start = new Date(startDate);
      end = new Date(endDate);

      // If user passed YYYY-MM-DD string without time, default start to 00:00:00 and end to 23:59:59
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(startDate))) {
        const [y, m, d] = startDate.split('-').map(Number);
        start = createIstUtcDate(y, m - 1, d, 0, 0, 0, 0);
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(endDate))) {
        const [y, m, d] = endDate.split('-').map(Number);
        end = createIstUtcDate(y, m - 1, d, 23, 59, 59, 999);
      }

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new AppError('Invalid date format specified', HTTP_STATUS.BAD_REQUEST);
      }

      if (start.getTime() > end.getTime()) {
        throw new AppError('End date cannot precede start date in custom date range', HTTP_STATUS.BAD_REQUEST);
      }
      break;
    }

    default: {
      const defaultPast = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const istDefault = getIstDateParts(defaultPast);
      start = createIstUtcDate(istDefault.year, istDefault.month, istDefault.day, 0, 0, 0, 0);
      end = createIstUtcDate(istNow.year, istNow.month, istNow.day, 23, 59, 59, 999);
      break;
    }
  }

  return {
    startDateISO: start.toISOString(),
    endDateISO: end.toISOString(),
    startDateObj: start,
    endDateObj: end,
    timezone: 'Asia/Kolkata (IST)'
  };
};

module.exports = { parseDateRange, getIstDateParts, createIstUtcDate };
