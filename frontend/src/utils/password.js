export function getStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Very Weak', color: '#f85149', pct: 12 },
    { label: 'Weak',      color: '#f85149', pct: 28 },
    { label: 'Fair',      color: '#d29922', pct: 50 },
    { label: 'Good',      color: '#3fb950', pct: 72 },
    { label: 'Strong',    color: '#00d4aa', pct: 88 },
    { label: 'Very Strong', color: '#00d4aa', pct: 100 },
  ];
  return { score, ...levels[Math.min(score, 5)] };
}

const CHARS = {
  upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower:   'abcdefghijklmnopqrstuvwxyz',
  digits:  '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

export function generatePassword({ length = 20, upper = true, lower = true, digits = true, symbols = true } = {}) {
  let pool = '';
  const required = [];
  if (upper)   { pool += CHARS.upper;   required.push(CHARS.upper[rand(CHARS.upper.length)]); }
  if (lower)   { pool += CHARS.lower;   required.push(CHARS.lower[rand(CHARS.lower.length)]); }
  if (digits)  { pool += CHARS.digits;  required.push(CHARS.digits[rand(CHARS.digits.length)]); }
  if (symbols) { pool += CHARS.symbols; required.push(CHARS.symbols[rand(CHARS.symbols.length)]); }
  if (!pool) pool = CHARS.lower;

  const remaining = Array.from({ length: length - required.length }, () => pool[rand(pool.length)]);
  const all = [...required, ...remaining];
  // Fisher-Yates shuffle using crypto
  for (let i = all.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.join('');
}

function rand(max) {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}
