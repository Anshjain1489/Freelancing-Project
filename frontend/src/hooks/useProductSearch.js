import { useState, useEffect, useRef, useCallback } from 'react';
import { productService } from '../services/product.service';
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches
} from '../utils/recentSearches';

export const POPULAR_SEARCH_CHIPS = [
  { label: 'Atta', icon: '🥖', query: 'Atta' },
  { label: 'Rice', icon: '🍚', query: 'Rice' },
  { label: 'Milk', icon: '🥛', query: 'Milk' },
  { label: 'Maggi', icon: '🍜', query: 'Maggi' },
  { label: 'Biscuits', icon: '🍪', query: 'Biscuits' },
  { label: 'Tea', icon: '🍵', query: 'Tea' },
  { label: 'Oil', icon: '🛢', query: 'Oil' },
  { label: 'Salt', icon: '🧂', query: 'Salt' }
];

export const useProductSearch = (initialQuery = '', limit = 8) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearchesState] = useState(getRecentSearches());

  const abortControllerRef = useRef(null);

  const performSearch = useCallback(async (searchQuery, signal) => {
    const clean = (searchQuery || '').trim();
    if (!clean) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await productService.searchProducts(clean, { limit, signal });
      if (!signal || !signal.aborted) {
        setProducts(res.data?.products || []);
      }
    } catch (err) {
      // Ignore CanceledError / AbortError
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }
      if (!signal || !signal.aborted) {
        console.error('Search request failed:', err);
        setError('Search query could not be completed.');
        setProducts([]);
      }
    } finally {
      if (!signal || !signal.aborted) {
        setLoading(false);
      }
    }
  }, [limit]);

  useEffect(() => {
    const clean = query.trim();
    if (!clean) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setProducts([]);
      setLoading(false);
      return;
    }

    // Cancel prior in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 300ms Debounce
    const timer = setTimeout(() => {
      performSearch(clean, controller.signal);
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, performSearch]);

  const clearSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setQuery('');
    setProducts([]);
    setLoading(false);
    setError(null);
  }, []);

  const saveRecent = useCallback((searchQuery) => {
    const updated = addRecentSearch(searchQuery);
    setRecentSearchesState(updated);
  }, []);

  const removeRecent = useCallback((searchQuery) => {
    const updated = removeRecentSearch(searchQuery);
    setRecentSearchesState(updated);
  }, []);

  const clearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearchesState([]);
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    recentSearches,
    popularSearches: POPULAR_SEARCH_CHIPS,
    clearSearch,
    saveRecent,
    removeRecent,
    clearRecent,
    executeSearch: (searchQuery) => {
      setQuery(searchQuery);
      saveRecent(searchQuery);
    }
  };
};
