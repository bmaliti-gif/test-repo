// Money is whole ngwee (K1 = 100 ngwee). Shown as "K 1,800".

/** 180000 → "K 1,800"; 52550 → "K 525.50". */
export function formatKwacha(ngwee: number): string {
  const kwacha = ngwee / 100;
  const whole = Number.isInteger(kwacha);
  return (
    'K ' +
    kwacha.toLocaleString('en-US', {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    })
  );
}

/** Short map-pin label: 180000 → "1.8k", 420000 → "4.2k", 95000 → "950". */
export function formatKwachaShort(ngwee: number): string {
  const kwacha = Math.round(ngwee / 100);
  if (kwacha < 1000) return String(kwacha);
  const k = kwacha / 1000;
  return (Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, '')) + 'k';
}

export const kwachaToNgwee = (kwacha: number) => Math.round(kwacha * 100);
