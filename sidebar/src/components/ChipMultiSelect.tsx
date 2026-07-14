import { useMemo, useRef, useState } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import type { FieldOption } from '../constants/metaFields';

interface ChipMultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: FieldOption[];
  placeholder?: string;
}

// Selected items render as removable chips; typing filters a searchable
// dropdown of the remaining options to add. Used for Metrics and Dimensions
// in the Template Builder — both are just "pick some fields from a catalog."
export function ChipMultiSelect({ values, onChange, options, placeholder }: ChipMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setOpen(false));

  const labelFor = (key: string) => options.find((o) => o.key === key)?.label ?? key;

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options
      .filter((o) => !values.includes(o.key))
      .filter((o) => !q || o.label.toLowerCase().includes(q));
  }, [options, values, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, FieldOption[]>();
    for (const opt of available) {
      if (!map.has(opt.group)) map.set(opt.group, []);
      map.get(opt.group)!.push(opt);
    }
    return Array.from(map.entries());
  }, [available]);

  const add = (key: string) => {
    onChange([...values, key]);
    setQuery('');
  };
  const remove = (key: string) => {
    onChange(values.filter((v) => v !== key));
  };

  return (
    <div className="chip-multiselect" ref={containerRef}>
      <div className="chip-list">
        {values.map((key) => (
          <span key={key} className="chip">
            {labelFor(key)}
            <button type="button" className="chip-remove" onClick={() => remove(key)} aria-label={`Remove ${labelFor(key)}`}>
              ×
            </button>
          </span>
        ))}
        <input
          className="chip-input-field"
          placeholder={values.length ? '' : (placeholder ?? 'Add…')}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
      </div>
      {open && (
        <div className="chip-multiselect-panel">
          {grouped.map(([group, opts]) => (
            <div key={group}>
              <div className="searchable-select-group">{group}</div>
              {opts.map((opt) => (
                <button
                  type="button"
                  key={opt.key}
                  className="searchable-select-option"
                  onClick={() => add(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ))}
          {available.length === 0 && <p className="muted small searchable-select-empty">No matches.</p>}
        </div>
      )}
    </div>
  );
}
