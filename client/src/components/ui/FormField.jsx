import { forwardRef, useState, useRef, useEffect } from 'react';

export default function FormField({ label, error, required, children, hint }) {
  return (
    <div>
      {label && (
        <label className="label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export const TextField = forwardRef(function TextField({ label, error, required, hint, className = '', ...props }, ref) {
  return (
    <FormField label={label} error={error} required={required} hint={hint}>
      <input ref={ref} className={`input ${error ? 'border-red-400 focus:ring-red-400' : ''} ${className}`} {...props} />
    </FormField>
  );
});

export const TextareaField = forwardRef(function TextareaField({ label, error, required, rows = 3, ...props }, ref) {
  return (
    <FormField label={label} error={error} required={required}>
      <textarea ref={ref} rows={rows} className={`input resize-none ${error ? 'border-red-400 focus:ring-red-400' : ''}`} {...props} />
    </FormField>
  );
});

export const SelectField = forwardRef(function SelectField({ label, error, required, options = [], placeholder = 'Select...', ...props }, ref) {
  return (
    <FormField label={label} error={error} required={required}>
      <select ref={ref} className={`input ${error ? 'border-red-400 focus:ring-red-400' : ''}`} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FormField>
  );
});

export function SearchableSelectField({ label, error, required, options = [], value, onChange, disabled, placeholder = 'Select...' }) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const containerRef        = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = (opt) => {
    onChange(opt.value);
    setOpen(false);
  };

  return (
    <FormField label={label} error={error} required={required}>
      <div ref={containerRef} className="relative">
        <div
          onClick={() => { if (!disabled) setOpen(o => !o); }}
          className={`input flex items-center justify-between cursor-pointer select-none
            ${error ? 'border-red-400' : ''}
            ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' : ''}`}
        >
          <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
            {selected ? selected.label : placeholder}
          </span>
          <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
        {open && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:border-primary-400"
              />
            </div>
            <ul className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-400 text-center">No results</li>
              ) : filtered.map(opt => (
                <li
                  key={opt.value}
                  onMouseDown={() => handleSelect(opt)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-primary-50 hover:text-primary-700
                    ${String(opt.value) === String(value) ? 'bg-primary-50 font-medium text-primary-700' : 'text-gray-800'}`}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </FormField>
  );
}

export const CheckboxField = forwardRef(function CheckboxField({ label, error, ...props }, ref) {
  return (
    <FormField error={error}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input ref={ref} type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" {...props} />
        <span className="text-sm text-gray-700">{label}</span>
      </label>
    </FormField>
  );
});
