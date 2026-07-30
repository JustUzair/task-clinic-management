export function titleCaseLabel(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function professionLabel(value: string): string {
  return titleCaseLabel(value);
}

export function coverageStatusLabel(value: string): string {
  return titleCaseLabel(value);
}

export function importTypeLabel(value: string): string {
  return titleCaseLabel(value);
}
