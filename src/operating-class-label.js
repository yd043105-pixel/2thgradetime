export function formatOperatingClass(code) {
  const match = String(code || '').match(/^(\d+)[a-z](\d+)$/i);
  return match ? `${match[1]}학년 ${match[2]}반` : '';
}
