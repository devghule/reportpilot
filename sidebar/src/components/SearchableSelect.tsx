import { useMemo, useRef, useState } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';

export interface SelectOption {
  key: string;
  label: string;
  group?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (key: string) => void;
  options: SelectOption[];
  placeholder?: string;
}

// Plain-React searchable dropdown — no external select library, per the
// project's "no UI library" constraint. Groups options by `.group` when set.
export function SearchableSelect({ value, onChange, options, placeholder }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setOpen(false));

  const selected = options.find((o) => o.key === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, SelectOption[]>();
    for (const opt of filtered) {
      const group = opt.group ?? '';
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(opt);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="searchable-select" ref={containerRef}>
      <button
        type="button"
        className="searchable-select-trigger"
        onClick={() => setOpen((o) => !o)}
      >
        {selected?.label ?? placeholder ?? 'Select…'}
        <span className="searchable-select-caret">▾</span>
      </button>
      {open && (
        <div className="searchable-select-panel">
          <input
            autoFocus
            className="searchable-select-search"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="searchable-select-list">
            {grouped.map(([group, opts]) => (
              <div key={group || 'default'}>
                {group && <div className="searchable-select-group">{group}</div>}
                {opts.map((opt) => (
                  <button
                    type="button"
                    key={opt.key}
                    className={`searchable-select-option${opt.key === value ? ' selected' : ''}`}
                    onClick={() => {
                      onChange(opt.key);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && <p className="muted small searchable-select-empty">No matches.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
