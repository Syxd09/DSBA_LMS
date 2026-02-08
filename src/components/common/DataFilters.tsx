import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface DataFiltersProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: {
    key: string;
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
  }[];
  onClearAll?: () => void;
}

export function DataFilters({
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  filters = [],
  onClearAll,
}: DataFiltersProps) {
  const hasActiveFilters = searchValue || filters.some(f => f.value && f.value !== 'all');

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-secondary/30 rounded-lg">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter Dropdowns */}
      {filters.map((filter) => (
        <Select key={filter.key} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className="w-40">
            <div className="flex items-center gap-2">
              <Filter className="w-3 h-3" />
              <SelectValue placeholder={filter.label} />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {filter.label}</SelectItem>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          {searchValue && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: {searchValue.slice(0, 15)}...
              <X className="w-3 h-3 cursor-pointer" onClick={() => onSearchChange('')} />
            </Badge>
          )}
          {filters.filter(f => f.value && f.value !== 'all').map((f) => (
            <Badge key={f.key} variant="secondary" className="flex items-center gap-1">
              {f.label}: {f.options.find(o => o.value === f.value)?.label}
              <X className="w-3 h-3 cursor-pointer" onClick={() => f.onChange('all')} />
            </Badge>
          ))}
          {onClearAll && (
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              Clear All
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
