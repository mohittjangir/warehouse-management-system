import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, X, Package, MapPin, Building2, Truck, 
  Users, Briefcase, ArrowRight, Loader2 
} from 'lucide-react';
import { searchService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface SearchResult {
  products: any[];
  inventory: any[];
  warehouses: any[];
  locations: any[];
  stockMovements: any[];
  suppliers: any[];
  customers: any[];
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Keyboard shortcut Ctrl/Cmd + K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await searchService.global(query);
        setResults(res.data);
      } catch (err) {
        setError(true);
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const hasResults = results && (
    results.products.length > 0 ||
    results.inventory.length > 0 ||
    results.warehouses.length > 0 ||
    results.locations.length > 0 ||
    results.stockMovements.length > 0 ||
    results.suppliers.length > 0 ||
    results.customers.length > 0
  );

  const getBaseRoute = () => user?.role === 'ADMIN' ? '/admin' : '/inventory';

  // Highlight helper
  const highlightMatch = (text: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <span key={i} className="text-indigo-400 bg-indigo-400/10 rounded px-0.5">{part}</span> 
            : part
        )}
      </>
    );
  };

  return (
    <>
      {/* Desktop Search Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-900/50 hover:bg-white/5 border border-white/10 rounded-xl text-sm text-slate-400 transition-all w-64 xl:w-80 group"
      >
        <Search size={16} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
        <span className="flex-1 text-left">Search everything...</span>
        <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 text-xs font-mono text-slate-500 border border-white/5">
          <span className="text-[10px]">⌘</span>K
        </kbd>
      </button>

      {/* Mobile Search Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="md:hidden w-10 h-10 rounded-full flex items-center justify-center glass hover:bg-white/10 transition-colors"
      >
        <Search size={18} className="text-slate-400" />
      </button>

      {/* Search Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-0 md:pt-[10vh] px-0 md:px-4 bg-slate-950/80 backdrop-blur-sm">
          {/* Modal Container */}
          <div 
            ref={modalRef}
            className="w-full md:max-w-2xl bg-slate-900 md:border border-white/10 md:rounded-2xl shadow-2xl flex flex-col h-full md:h-auto max-h-screen md:max-h-[80vh] overflow-hidden"
          >
            {/* Search Input Area */}
            <div className="relative flex items-center px-4 border-b border-white/10 bg-slate-900/50">
              <Search size={20} className="text-indigo-400 absolute left-4" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, SKU, batch, location, order..."
                className="w-full bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 py-5 pl-10 pr-10 outline-none text-base md:text-lg"
              />
              {loading && <Loader2 size={20} className="text-indigo-400 animate-spin absolute right-12" />}
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute right-4 p-1 text-slate-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto p-2">
              {!query && (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Search size={20} className="text-slate-400" />
                  </div>
                  <p className="text-slate-300 font-medium mb-1">Search the warehouse</p>
                  <p className="text-sm text-slate-500">
                    Find products, stock levels, locations, and transactions instantly.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {['SKU-1024', 'Packaging Box', 'WH-A'].map(s => (
                      <button key={s} onClick={() => setQuery(s)} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-400 transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {query.length > 0 && query.length < 2 && (
                <div className="p-6 text-center text-slate-500 text-sm">
                  Type at least 2 characters to search...
                </div>
              )}

              {error && (
                <div className="p-6 text-center text-red-400 text-sm">
                  Unable to search right now. Please try again.
                </div>
              )}

              {query.length >= 2 && !loading && !hasResults && !error && (
                <div className="p-8 text-center">
                  <p className="text-slate-300 font-medium mb-2">No results found for "{query}"</p>
                  <p className="text-slate-500 text-sm">
                    Try searching by Product Name, SKU, Batch Number, Warehouse Code, or Order Number.
                  </p>
                </div>
              )}

              {hasResults && results && (
                <div className="space-y-4 p-2">
                  
                  {results.products.length > 0 && (
                    <div className="search-section">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Products</h3>
                      {results.products.map((p) => (
                        <button 
                          key={`prod-${p.id}`} 
                          onClick={() => handleNavigate(`${getBaseRoute()}/products?search=${p.sku}`)}
                          className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 mt-0.5 group-hover:bg-indigo-500/30">
                            <Package size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{highlightMatch(p.name)}</p>
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                              <span>SKU: {highlightMatch(p.sku)}</span>
                              {p.category && <><span className="w-1 h-1 rounded-full bg-slate-600" /><span>{p.category}</span></>}
                            </p>
                          </div>
                          <ArrowRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}

                  {results.inventory.length > 0 && (
                    <div className="search-section">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Inventory</h3>
                      {results.inventory.map((i) => (
                        <button 
                          key={`inv-${i.id}`}
                          onClick={() => handleNavigate(`${getBaseRoute()}/current-stock?search=${i.batch_number}`)}
                          className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5 group-hover:bg-emerald-500/30">
                            <MapPin size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{highlightMatch(i.product_name)}</p>
                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 truncate">
                              <span>Batch: {highlightMatch(i.batch_number)}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-600" />
                              <span className="truncate">{highlightMatch(i.warehouse)} {i.location ? `> ${highlightMatch(i.location)}` : ''}</span>
                            </div>
                          </div>
                          <div className="text-right ml-2">
                            <span className="inline-block px-2 py-1 rounded bg-slate-800 text-emerald-400 text-xs font-medium border border-white/5">
                              {i.available} left
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.stockMovements.length > 0 && (
                    <div className="search-section">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Movements</h3>
                      {results.stockMovements.map((m) => (
                        <button 
                          key={`mov-${m.id}`}
                          onClick={() => handleNavigate(`${getBaseRoute()}/movements?search=${m.txn_number}`)}
                          className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 mt-0.5 group-hover:bg-sky-500/30">
                            <Truck size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{highlightMatch(m.product_name)}</p>
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                              <span>{highlightMatch(m.txn_number)}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-600" />
                              <span className="capitalize">{m.type.replace('_', ' ')}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-600" />
                              <span>{new Date(m.date).toLocaleDateString()}</span>
                            </p>
                          </div>
                          <div className="text-right ml-2">
                            <span className={`text-sm font-semibold ${m.type === 'STOCK_IN' ? 'text-emerald-400' : m.type === 'STOCK_OUT' ? 'text-red-400' : 'text-amber-400'}`}>
                              {m.type === 'STOCK_IN' ? '+' : m.type === 'STOCK_OUT' ? '-' : ''}{m.quantity}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.warehouses.length > 0 && (
                    <div className="search-section">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Warehouses</h3>
                      {results.warehouses.map((w) => (
                        <button 
                          key={`wh-${w.id}`}
                          onClick={() => handleNavigate('/admin/masters')}
                          className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 mt-0.5 group-hover:bg-purple-500/30">
                            <Building2 size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{highlightMatch(w.name)}</p>
                            <p className="text-xs text-slate-400 mt-1">Code: {highlightMatch(w.code)}</p>
                          </div>
                          <ArrowRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}

                  {results.locations.length > 0 && (
                    <div className="search-section">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Locations</h3>
                      {results.locations.map((l) => (
                        <button 
                          key={`loc-${l.id}`}
                          onClick={() => handleNavigate('/admin/masters')}
                          className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <div className="p-2 rounded-lg bg-slate-500/20 text-slate-400 mt-0.5 group-hover:bg-slate-500/30">
                            <MapPin size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{highlightMatch(l.name)}</p>
                            <p className="text-xs text-slate-400 mt-1">{highlightMatch(l.warehouse)} • Code: {highlightMatch(l.code)}</p>
                          </div>
                          <ArrowRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}

                  {results.suppliers.length > 0 && (
                    <div className="search-section">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Suppliers</h3>
                      {results.suppliers.map((s) => (
                        <button 
                          key={`sup-${s.id}`}
                          onClick={() => handleNavigate('/admin/masters')}
                          className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400 mt-0.5 group-hover:bg-orange-500/30">
                            <Briefcase size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{highlightMatch(s.name)}</p>
                            <p className="text-xs text-slate-400 mt-1">{highlightMatch(s.email || s.phone || 'No contact info')}</p>
                          </div>
                          <ArrowRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}

                  {results.customers.length > 0 && (
                    <div className="search-section">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Customers</h3>
                      {results.customers.map((c) => (
                        <button 
                          key={`cus-${c.id}`}
                          onClick={() => handleNavigate('/admin/masters')}
                          className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <div className="p-2 rounded-lg bg-pink-500/20 text-pink-400 mt-0.5 group-hover:bg-pink-500/30">
                            <Users size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{highlightMatch(c.name)}</p>
                            <p className="text-xs text-slate-400 mt-1">{highlightMatch(c.email || c.phone || 'No contact info')}</p>
                          </div>
                          <ArrowRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/10 bg-slate-900/50 flex justify-between items-center text-xs text-slate-500">
              <div className="flex gap-4">
                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded">↑↓</kbd> to navigate</span>
                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded">↵</kbd> to select</span>
                <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded">esc</kbd> to close</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
