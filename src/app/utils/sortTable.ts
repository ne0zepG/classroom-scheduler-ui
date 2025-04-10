/**
 * Utility for sorting table data
 */

export interface SortColumn {
  column: string;
  direction: 'asc' | 'desc';
}

export function sortData<T>(data: T[], sortColumn: SortColumn): T[] {
  if (!sortColumn.column) {
    return data;
  }

  return [...data].sort((a, b) => {
    const valueA = getNestedValue(a, sortColumn.column);
    const valueB = getNestedValue(b, sortColumn.column);

    if (valueA === valueB) {
      return 0;
    }

    // Handle string comparison
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      const comparison = valueA.localeCompare(valueB);
      return sortColumn.direction === 'asc' ? comparison : -comparison;
    }

    // Handle number and other types
    const comparison = valueA < valueB ? -1 : 1;
    return sortColumn.direction === 'asc' ? comparison : -comparison;
  });
}

// Helper function to access nested properties (e.g. "room.building")
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  return keys.reduce(
    (acc, key) => (acc && acc[key] !== undefined ? acc[key] : null),
    obj
  );
}
