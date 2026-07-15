import { IconSearch, IconFilter } from '../icons';

export function SearchBar({
  value,
  onChange,
  placeholder = 'Поиск смен',
  onFilter,
  filterLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onFilter?: () => void;
  filterLabel?: string;
}) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input !pl-10"
          placeholder={placeholder}
        />
      </div>
      {onFilter !== undefined && (
        <button
          type="button"
          onClick={onFilter}
          className="shrink-0 px-3.5 rounded-[14px] border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 shadow-sc-card flex items-center gap-1.5"
        >
          <IconFilter className="w-4 h-4" />
          {filterLabel ?? 'Сбросить'}
        </button>
      )}
    </div>
  );
}
