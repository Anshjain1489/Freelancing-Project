import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Grid } from 'lucide-react';
import { useProductSearch } from '../../hooks/useProductSearch';
import { SearchSuggestions } from './SearchSuggestions';
import { PopularSearches } from './PopularSearches';
import { RecentSearches } from './RecentSearches';
import { SearchSkeleton } from './SearchSkeleton';

export const MobileSearchModal = ({ isOpen, onClose, triggerRef }) => {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const {
    query,
    setQuery,
    results,
    loading,
    recentSearches,
    clearSearch,
    saveRecent,
    removeRecent,
    clearRecent,
    executeSearch
  } = useProductSearch('', 8);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 60);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = '';
      clearSearch();
      if (triggerRef && triggerRef.current) {
        try { triggerRef.current.focus(); } catch (e) {}
      }
    }
  }, [isOpen, clearSearch, triggerRef]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectProduct = (product) => {
    if (query.trim()) {
      saveRecent(query.trim());
    }
    onClose();
    navigate(`/products/${product.slug}`);
  };

  const handleSelectChipOrRecent = (selectedQuery) => {
    executeSearch(selectedQuery);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    saveRecent(query.trim());
    onClose();
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const isQueryTyped = query.trim().length > 0;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1100,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '0'
      }}
    >
      {/* Modal Card Box: Fullscreen on mobile (< 640px), Spotlight Container on Desktop (>= 640px) */}
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          height: '100%',
          maxHeight: '100vh',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        className="search-modal-container"
      >
        {/* Sticky Mobile/Desktop Search Header */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {/* Back / Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            style={{
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            <ArrowLeft size={20} />
          </button>

          {/* Input Bar */}
          <form onSubmit={handleFormSubmit} style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', color: '#64748B', pointerEvents: 'none' }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search groceries (e.g. Atta, Oil, Milk)..."
              aria-label="Search groceries"
              style={{
                width: '100%',
                minHeight: '44px',
                paddingLeft: '40px',
                paddingRight: isQueryTyped ? '42px' : '14px',
                paddingTop: '8px',
                paddingBottom: '8px',
                borderRadius: '22px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                fontSize: '0.94rem',
                color: '#0F172A',
                outline: 'none'
              }}
            />
            {isQueryTyped && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: '10px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                <X size={16} />
              </button>
            )}
          </form>
        </div>

        {/* Scrollable Suggestions / Content Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '16px',
          paddingBottom: '100px', // Safe padding from bottom navigation bar
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {loading ? (
            <SearchSkeleton count={5} />
          ) : isQueryTyped ? (
            results.length > 0 ? (
              <SearchSuggestions products={results} onSelectProduct={handleSelectProduct} />
            ) : (
              /* No Results Empty State */
              <div style={{
                padding: '36px 16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: '#F8FAFC',
                borderRadius: '16px',
                border: '1px dashed #CBD5E1'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#FEF3C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem'
                }}>
                  🔎
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  No products found
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, maxWidth: '280px' }}>
                  We couldn't find any groceries matching <strong>"{query}"</strong>. Try searching for Atta, Rice, Milk, or Oil.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/categories');
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    backgroundColor: '#06C167',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Grid size={16} /> Browse Categories
                </button>
              </div>
            )
          ) : (
            /* Empty Input Default State */
            <>
              <PopularSearches onSelectChip={handleSelectChipOrRecent} />
              <RecentSearches
                items={recentSearches}
                onSelectRecent={handleSelectChipOrRecent}
                onRemoveRecent={removeRecent}
                onClearAll={clearRecent}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
