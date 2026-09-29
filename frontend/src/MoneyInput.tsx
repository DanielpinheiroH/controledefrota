// Keep API values as decimal strings; the visible input shifts digits into cents.
export function MoneyInput({ id, value, onChange, required = false }: {
  id?: string;
  value: string | number;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [whole, fraction = ''] = String(value || '0').split('.');
  const display = value === '' ? '' : `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${fraction.padEnd(2, '0')}`;
  return <input id={id} type="text" inputMode="numeric" required={required}
    value={display}
    onChange={event => {
      const digits = event.target.value.replace(/\D/g, '').replace(/^0+/, '');
      if (!event.target.value) { onChange(''); return; }
      const cents = digits.padStart(3, '0');
      onChange(`${cents.slice(0, -2)}.${cents.slice(-2)}`);
    }} />;
}
