import toast from 'react-hot-toast';

export const showSuccess = (message, options = {}) => {
  return toast.success(message, {
    duration: 3000,
    style: {
      borderRadius: '12px',
      background: '#E8F7F0',
      color: '#049B53',
      fontWeight: 700,
      border: '1px solid #C2EBD6'
    },
    iconTheme: {
      primary: '#06C167',
      secondary: '#FFFFFF'
    },
    ...options
  });
};

export const showError = (message, options = {}) => {
  return toast.error(message, {
    duration: 4000,
    style: {
      borderRadius: '12px',
      background: '#FEE2E2',
      color: '#DC2626',
      fontWeight: 700,
      border: '1px solid #FCA5A5'
    },
    iconTheme: {
      primary: '#DC2626',
      secondary: '#FFFFFF'
    },
    ...options
  });
};

export const showWarning = (message, options = {}) => {
  return toast(message, {
    icon: '⚠️',
    duration: 3500,
    style: {
      borderRadius: '12px',
      background: '#FFF0E6',
      color: '#FF6B00',
      fontWeight: 700,
      border: '1px solid #FFD8BE'
    },
    ...options
  });
};

export const showInfo = (message, options = {}) => {
  return toast(message, {
    icon: 'ℹ️',
    duration: 3000,
    style: {
      borderRadius: '12px',
      background: '#EFF6FF',
      color: '#2563EB',
      fontWeight: 600,
      border: '1px solid #BFDBFE'
    },
    ...options
  });
};

export const showLoading = (message, options = {}) => {
  return toast.loading(message, {
    style: {
      borderRadius: '12px',
      background: '#FFFFFF',
      color: '#1F2937',
      fontWeight: 600,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    ...options
  });
};
