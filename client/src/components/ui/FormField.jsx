import { forwardRef } from 'react';

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
