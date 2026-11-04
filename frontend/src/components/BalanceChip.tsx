import Chip from '@mui/material/Chip';
import { formatCurrency } from '@/utils/formatCurrency';

export function balanceRank(balance: number | null | undefined): number {
  const value = balance ?? 0;
  if (value > 0.01) return 0;
  if (value < -0.01) return 1;
  return 2;
}

export function isSettledBalance(balance: number | null | undefined): boolean {
  return balanceRank(balance) === 2;
}

/** Deuda primero (mayor monto arriba), después saldo a favor, ceros al final. */
export function compareBalances(
  a: number | null | undefined,
  b: number | null | undefined
): number {
  const rank = balanceRank(a) - balanceRank(b);
  if (rank !== 0) return rank;
  const va = a ?? 0;
  const vb = b ?? 0;
  if (balanceRank(a) === 0 && Math.abs(va - vb) > 0.01) return vb - va;
  if (balanceRank(a) === 1 && Math.abs(va - vb) > 0.01) return va - vb;
  return 0;
}

export default function BalanceChip({ balance }: { balance: number | null | undefined }) {
  const value = balance ?? 0;
  if (value > 0.01) {
    return (
      <Chip size="small" color="error" label={`Debe ${formatCurrency(value)}`} sx={{ flexShrink: 0 }} />
    );
  }
  if (value < -0.01) {
    return (
      <Chip
        size="small"
        color="success"
        label={`A favor ${formatCurrency(Math.abs(value))}`}
        sx={{ flexShrink: 0 }}
      />
    );
  }
  return (
    <Chip size="small" variant="outlined" label="Sin saldo" sx={{ flexShrink: 0 }} />
  );
}
