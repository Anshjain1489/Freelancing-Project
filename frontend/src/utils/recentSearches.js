const STORAGE_KEY = 'cks_recent_searches';
const MAX_RECENT = 5;

export const getRecentSearches = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

export const addRecentSearch = (query) => {
  if (!query || typeof query !== 'string') return getRecentSearches();
  const trimmed = query.trim();
  if (!trimmed) return getRecentSearches();

  try {
    const current = getRecentSearches();
    // Filter out case-insensitive duplicate
    const filtered = current.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...filtered].slice(0, MAX_RECENT);
    
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch (e) {
    return [];
  }
};

export const removeRecentSearch = (query) => {
  if (!query || typeof query !== 'string') return getRecentSearches();
  const trimmed = query.trim();

  try {
    const current = getRecentSearches();
    const updated = current.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
    
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch (e) {
    return [];
  }
};

export const clearRecentSearches = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {}
  return [];
};
