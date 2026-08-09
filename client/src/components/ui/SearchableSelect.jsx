import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';

export default function SearchableSelect({ value, onChange, options = [], placeholder = 'Select...', error, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState({});
  const triggerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target) &&
          !document.getElementById('ss-portal')?.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Recalculate position on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = (opt) => {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  const dropdown = open && createPortal(
    <div
      id="ss-portal"
      style={dropdownStyle}
      className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
    >
      {filtered.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-400">No results</div>
      ) : (
        filtered.map(opt => (
          <div
            key={opt.value}
            onMouseDown={() => handleSelect(opt)}
            className={`px-3 py-2 text-sm cursor-pointer hover:bg-primary-50 hover:text-primary-700 ${
              String(opt.value) === String(value) ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-700'
            }`}
          >
            {opt.label}
          </div>
        ))
      )}
    </div>,
    document.body
  );

  return (
    <div ref={triggerRef} className="relative">
      <div
        onClick={handleOpen}
        className={`input flex items-center gap-2 cursor-pointer min-h-[38px] ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${error ? 'border-red-400' : ''}`}
      >
        {open ? (
          <div className="flex items-center gap-1.5 flex-1">
            <Search size={13} className="text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="Search..."
              className="flex-1 outline-none bg-transparent text-sm"
            />
          </div>
        ) : (
          <span className={`flex-1 text-sm truncate ${selected ? 'text-gray-900' : 'text-gray-400'}`}>
            {selected ? selected.label : placeholder}
          </span>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected && !open && (
            <button type="button" onClick={handleClear} className="text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          )}
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {dropdown}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
