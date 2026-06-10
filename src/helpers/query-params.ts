export type QueryParamValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | (string | number | boolean)[];

export function buildQueryString(queryParams: Record<string, QueryParamValue>): string {
  return new URLSearchParams(
    Object.entries(queryParams).flatMap(([key, value]) => {
      if (value == null) {
        return [];
      }

      if (Array.isArray(value)) {
        return value.map((item) => [
          key,
          typeof item === "string" ? item : JSON.stringify(item),
        ] as [string, string]);
      }

      const stringValue = typeof value === "string"
        ? value
        : typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : JSON.stringify(value);

      return [[key, stringValue] as [string, string]];
    })
  ).toString();
}

export function appendQueryParams(path: string, queryParams: Record<string, QueryParamValue>): string {
  const queryString = buildQueryString(queryParams);
  if (!queryString) {
    return path;
  }

  return `${path}?${queryString}`;
}
