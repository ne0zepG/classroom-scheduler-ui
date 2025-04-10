/**
 * Utility for searching table data
 */

export function searchData<T>(
  data: T[],
  searchTerm: string,
  searchColumns: string[]
): T[] {
  if (!searchTerm || !searchTerm.trim()) {
    return data;
  }

  const lowercasedTerm = searchTerm.toLowerCase();

  return data.filter((item) => {
    return searchColumns.some((column) => {
      const value = getNestedValue(item, column);
      if (value === null || value === undefined) {
        return false;
      }

      // Convert value to string and search
      const stringValue = String(value).toLowerCase();
      return stringValue.includes(lowercasedTerm);
    });
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
