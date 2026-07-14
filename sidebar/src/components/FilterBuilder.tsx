import { SearchableSelect } from './SearchableSelect';
import { ALL_FIELD_OPTIONS, FILTER_OPERATORS } from '../constants/metaFields';

export interface FilterRow {
  field: string;
  operator: string;
  value: string;
}

interface FilterBuilderProps {
  filters: FilterRow[];
  onChange: (filters: FilterRow[]) => void;
}

// Scalable filter builder — Field / Operator / Value per row, multiple rows.
// Maps directly to Template.filters: Json? ([{field, operator, value}]),
// already in the schema — no backend change needed.
export function FilterBuilder({ filters, onChange }: FilterBuilderProps) {
  const updateRow = (index: number, patch: Partial<FilterRow>) => {
    const next = filters.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  };
  const removeRow = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };
  const addRow = () => {
    onChange([...filters, { field: '', operator: 'equal', value: '' }]);
  };

  return (
    <div className="filter-builder">
      {filters.map((row, index) => (
        <div key={index} className="filter-row">
          <SearchableSelect
            value={row.field}
            onChange={(field) => updateRow(index, { field })}
            options={ALL_FIELD_OPTIONS}
            placeholder="Field"
          />
          <SearchableSelect
            value={row.operator}
            onChange={(operator) => updateRow(index, { operator })}
            options={FILTER_OPERATORS}
            placeholder="Operator"
          />
          <input
            className="filter-value-input"
            value={row.value}
            onChange={(e) => updateRow(index, { value: e.target.value })}
            placeholder="Value"
          />
          <button
            type="button"
            className="btn btn-link danger"
            onClick={() => removeRow(index)}
            aria-label="Remove filter"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary" onClick={addRow}>
        + Add Filter
      </button>
    </div>
  );
}
