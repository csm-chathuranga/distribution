import { Search, Plus } from 'lucide-react';

export default function PageHeader({ title, onNew, newLabel = 'New', canCreate = true, search, onSearch, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
      <h1 className="text-lg font-bold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3 flex-wrap">
        {onSearch !== undefined && (
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9 w-56 text-sm"
              placeholder="Search..."
              value={search}
              onChange={e => onSearch(e.target.value)}
            />
          </div>
        )}
        {children}
        {onNew && canCreate && (
          <button onClick={onNew} className="btn btn-primary btn-sm gap-1.5">
            <Plus size={15} /> {newLabel}
          </button>
        )}
      </div>
    </div>
  );
}
