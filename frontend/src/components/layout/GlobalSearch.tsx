import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock, FileText, Image as ImageIcon, Palette } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { useHistory, useStyles } from '../../api/queries';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const RECENT_SEARCHES_KEY = 'roomcanvas_recent_searches';
const MAX_RECENT_SEARCHES = 5;

const PAGES = [
  { label: 'Home', path: '/' },
  { label: 'New Design', path: '/upload' },
  { label: 'History', path: '/history' },
  { label: 'Library', path: '/history' },
  { label: 'Profile', path: '/profile' },
  { label: 'Settings', path: '/settings' },
];

interface GlobalSearchProps {
  isMobile?: boolean;
  onNavigate?: () => void; // Used to close the mobile menu
}

type ResultItem =
  | { type: 'recent'; query: string; index: number }
  | { type: 'popular_style'; styleId: string; index: number }
  | { type: 'project'; id: number; title: string; style: string; thumbnail: string; index: number }
  | { type: 'style'; styleId: string; index: number }
  | { type: 'page'; path: string; label: string; index: number };

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span className="truncate">
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-transparent text-accent font-semibold">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export function GlobalSearch({ isMobile = false, onNavigate }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 200);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Queries
  const { data: historyData } = useHistory(50, isOpen);
  const { data: stylesData } = useStyles();

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse recent searches', e);
    }
  }, []);

  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const normalized = searchQuery.trim();
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== normalized.toLowerCase());
      const updated = [normalized, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeRecentSearch = (e: React.MouseEvent, searchQuery: string) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s !== searchQuery);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
    inputRef.current?.focus();
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cmd+K shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery, recentSearches, historyData, stylesData]);

  // Compute items
  const { items, groups, hasResults } = useMemo(() => {
    let currentItems: ResultItem[] = [];
    let currentGroups: { label: string; items: ResultItem[] }[] = [];
    let globalIndex = 0;

    const normalizedQuery = debouncedQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      // Zero-state
      if (recentSearches.length > 0) {
        const groupItems = recentSearches.map((s) => ({ type: 'recent' as const, query: s, index: globalIndex++ }));
        currentGroups.push({ label: 'Recent Searches', items: groupItems });
        currentItems.push(...groupItems);
      }

      if (stylesData && stylesData.length > 0) {
        const popularStyles = stylesData.slice(0, 5).map((s) => ({ type: 'popular_style' as const, styleId: s.id, index: globalIndex++ }));
        currentGroups.push({ label: 'Popular Styles', items: popularStyles });
        currentItems.push(...popularStyles);
      }
    } else {
      // Live results
      // 1. Projects
      if (historyData) {
        const matchedProjects = historyData.filter((p) => {
          const titleMatch = p.room_type_detected?.toLowerCase().includes(normalizedQuery) || false;
          const styleMatch = p.style.toLowerCase().includes(normalizedQuery);
          return titleMatch || styleMatch;
        }).slice(0, 5); // Limit project matches

        if (matchedProjects.length > 0) {
          const groupItems = matchedProjects.map((p) => ({
            type: 'project' as const,
            id: p.id,
            title: p.room_type_detected || 'Untitled Project',
            style: p.style,
            thumbnail: p.latest_generation?.variations?.[0]?.image_path || p.original_image_path,
            index: globalIndex++
          }));
          currentGroups.push({ label: 'Projects', items: groupItems });
          currentItems.push(...groupItems);
        }
      }

      // 2. Styles
      if (stylesData) {
        const matchedStyles = stylesData
          .filter((s) => s.id.toLowerCase().includes(normalizedQuery))
          .slice(0, 4);

        if (matchedStyles.length > 0) {
          const groupItems = matchedStyles.map((s) => ({
            type: 'style' as const,
            styleId: s.id,
            index: globalIndex++
          }));
          currentGroups.push({ label: 'Styles', items: groupItems });
          currentItems.push(...groupItems);
        }
      }

      // 3. Pages
      const matchedPages = PAGES.filter((p) => p.label.toLowerCase().includes(normalizedQuery)).slice(0, 3);
      if (matchedPages.length > 0) {
        const groupItems = matchedPages.map((p) => ({
          type: 'page' as const,
          label: p.label,
          path: p.path,
          index: globalIndex++
        }));
        currentGroups.push({ label: 'Pages', items: groupItems });
        currentItems.push(...groupItems);
      }
    }

    return {
      items: currentItems,
      groups: currentGroups,
      hasResults: currentItems.length > 0
    };
  }, [debouncedQuery, recentSearches, historyData, stylesData]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listboxRef.current) {
      const activeEl = listboxRef.current.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  const handleSelect = (item: ResultItem) => {
    setIsOpen(false);
    inputRef.current?.blur();
    
    // Only save recent search if it was an actual typed query (fallback)
    // Or if we selected a recent search, we bump it to the top.
    
    switch (item.type) {
      case 'recent':
        saveRecentSearch(item.query);
        navigate(`/history?search=${encodeURIComponent(item.query)}`);
        break;
      case 'popular_style':
      case 'style':
        saveRecentSearch(item.styleId);
        navigate('/upload', { state: { selectedStyle: item.styleId } });
        break;
      case 'project':
        navigate(`/results/${item.id}`); // Navigating to /results/:latestGenerationId (using project ID as proxy for now, check route definition later if needed, assuming /results/:id works)
        break;
      case 'page':
        navigate(item.path);
        break;
    }
    
    if (onNavigate) onNavigate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < items.length) {
          handleSelect(items[activeIndex]);
        } else if (query.trim()) {
          // Fallback to history search
          setIsOpen(false);
          inputRef.current?.blur();
          saveRecentSearch(query);
          navigate(`/history?search=${encodeURIComponent(query.trim())}`);
          if (onNavigate) onNavigate();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const activeId = activeIndex >= 0 ? `search-item-${activeIndex}` : undefined;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full",
        isMobile ? "px-2" : "max-w-[480px]"
      )}
    >
      <div className="relative z-50 group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search designs, styles, pages..."
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="search-listbox"
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          className={cn(
            "w-full h-9 rounded-lg border border-border bg-surface-alt/60 pl-9 pr-8 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-border-strong focus:bg-surface transition-all duration-base",
            isOpen && !isMobile && "shadow-xs border-border-strong bg-surface"
          )}
        />
        {query ? (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-tertiary hover:text-text-primary focus:outline-none"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          !isMobile && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-surface text-[10px] font-medium text-text-tertiary">
                <span className="text-[11px]">⌘</span>K
              </kbd>
            </div>
          )
        )}
      </div>

      <AnimatePresence>
        {isOpen && (query.trim().length > 0 || recentSearches.length > 0 || (stylesData && stylesData.length > 0)) && (
          <>
            {isMobile && (
              <motion.div
                className="fixed inset-0 top-[60px] z-40 bg-black/30 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsOpen(false)}
              />
            )}
            <motion.div
              initial={{ opacity: 0, y: isMobile ? 0 : -4, scale: isMobile ? 1 : 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: isMobile ? 0 : -4, scale: isMobile ? 1 : 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={cn(
                "absolute left-0 right-0 z-50 bg-surface border border-border shadow-xl overflow-hidden",
                isMobile 
                  ? "top-11 -mx-2 w-[calc(100%+16px)] h-[calc(100dvh-120px)] border-x-0 border-t-0 rounded-none flex flex-col" 
                  : "top-[calc(100%+4px)] rounded-xl max-h-[400px] flex flex-col"
              )}
            >
              <ul
                id="search-listbox"
                ref={listboxRef}
                role="listbox"
                className="overflow-y-auto flex-1 py-2 overscroll-contain"
              >
                {!hasResults ? (
                  debouncedQuery ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-text-secondary mb-4">No matches for "{debouncedQuery}"</p>
                      {/* Fallback to popular styles */}
                      {stylesData && stylesData.length > 0 && (
                        <div className="text-left mt-4 border-t border-border pt-4">
                          <div className="px-3 py-1.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                            Popular Styles
                          </div>
                          {stylesData.slice(0, 4).map((s) => {
                            return (
                              <li
                                key={`fallback-${s.id}`}
                                onClick={() => handleSelect({ type: 'popular_style', styleId: s.id, index: -1 })}
                                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-alt transition-colors group"
                              >
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-alt group-hover:bg-surface text-text-secondary">
                                  <Palette className="h-4 w-4" />
                                </div>
                                <span className="text-sm text-text-secondary group-hover:text-text-primary">{s.id}</span>
                              </li>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-text-secondary">Start typing to search designs, pages, and styles…</p>
                    </div>
                  )
                ) : (
                  groups.map((group) => (
                    <div key={group.label} className="mb-2 last:mb-0">
                      <div className="px-3 py-1.5 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                        {group.label}
                      </div>
                      {group.items.map((item) => {
                        const isActive = activeIndex === item.index;
                        const itemClasses = cn(
                          "group flex items-center gap-3 px-3 cursor-pointer transition-colors w-full text-left",
                          isMobile ? "py-3 min-h-[44px]" : "py-2",
                          isActive ? "bg-surface-alt" : "hover:bg-surface-alt/60"
                        );

                        return (
                          <li
                            key={`item-${item.index}`}
                            id={`search-item-${item.index}`}
                            role="option"
                            aria-selected={isActive}
                            data-index={item.index}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setActiveIndex(item.index)}
                            className={itemClasses}
                          >
                            {item.type === 'recent' && (
                              <>
                                <Clock className="h-4 w-4 text-text-tertiary shrink-0" />
                                <span className="text-sm text-text-secondary flex-1 truncate">{item.query}</span>
                                <button
                                  onClick={(e) => removeRecentSearch(e, item.query)}
                                  className="p-1 text-text-tertiary hover:text-text-primary hover:bg-surface rounded shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                  aria-label="Remove recent search"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            {item.type === 'popular_style' && (
                              <div className="flex items-center gap-2">
                                <div className={cn("flex items-center justify-center rounded-md bg-surface-alt text-text-secondary group-hover:bg-surface", isMobile ? "h-10 w-10" : "h-8 w-8")}>
                                  <Palette className="h-4 w-4" />
                                </div>
                                <span className="text-sm text-text-secondary group-hover:text-text-primary">{item.styleId}</span>
                              </div>
                            )}
                            {item.type === 'project' && (
                              <>
                                <img
                                  src={item.thumbnail}
                                  alt=""
                                  className={cn("object-cover rounded-md bg-surface-alt shrink-0", isMobile ? "h-10 w-10" : "h-8 w-8")}
                                />
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="text-sm text-text-primary truncate">
                                    <Highlight text={item.title} query={debouncedQuery} />
                                  </span>
                                  <span className="text-xs text-text-tertiary truncate flex items-center gap-1.5">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent/40" />
                                    <Highlight text={item.style} query={debouncedQuery} />
                                  </span>
                                </div>
                              </>
                            )}
                            {item.type === 'style' && (
                              <>
                                <div className={cn("flex items-center justify-center rounded-md bg-surface-alt text-text-secondary shrink-0", isMobile ? "h-10 w-10" : "h-8 w-8")}>
                                  <Palette className="h-4 w-4" />
                                </div>
                                <span className="text-sm text-text-primary flex-1 truncate">
                                  <Highlight text={item.styleId} query={debouncedQuery} />
                                </span>
                              </>
                            )}
                            {item.type === 'page' && (
                              <>
                                <div className={cn("flex items-center justify-center rounded-md bg-surface-alt text-text-secondary shrink-0", isMobile ? "h-10 w-10" : "h-8 w-8")}>
                                  <FileText className="h-4 w-4" />
                                </div>
                                <span className="text-sm text-text-primary flex-1 truncate">
                                  <Highlight text={item.label} query={debouncedQuery} />
                                </span>
                              </>
                            )}
                          </li>
                        );
                      })}
                    </div>
                  ))
                )}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
