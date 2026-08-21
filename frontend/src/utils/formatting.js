export const formatCurrency = (amount) => {
  const numericAmount = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(numericAmount);
};

export const calculateDiscountPercentage = (mrp, selling) => {
  if (!mrp || !selling || mrp <= selling) return 0;
  return Math.round(((mrp - selling) / mrp) * 100);
};
