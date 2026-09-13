import { Check, Minus } from 'lucide-react';
import { plansForProduct, type Plan, type ProductLineId } from '../../../config/plans';

type Row = { label: string; value: (plan: Plan) => string | boolean };

const ROWS: readonly Row[] = [
  { label: 'Photos every month', value: (p) => String(p.monthlyCredits) },
  { label: 'Sets / shop looks', value: (p) => String(p.maxSets) },
  { label: 'All formats (4:5, 9:16, 1:1, 3:4)', value: () => true },
  { label: 'Free redos (2 per photo)', value: () => true },
  { label: 'High-res 2K photos', value: (p) => p.highRes },
  { label: 'Ready-to-post captions', value: (p) => p.captions },
  { label: 'All 6 Studio models', value: (p) => p.allStudioModels },
  { label: 'Priority generation', value: (p) => p.priority },
];

const Cell = ({ value }: { value: string | boolean }) => {
  if (value === true) return <Check aria-label="Included" className="mx-auto h-4 w-4 text-app-accent" />;
  if (value === false) return <Minus aria-label="Not included" className="mx-auto h-4 w-4 text-app-line" />;
  return <span className="font-medium tabular-nums">{value}</span>;
};

export const ComparisonTable = ({ product }: { product: ProductLineId }) => {
  const plans = plansForProduct(product);
  const rows = product === 'brand' ? ROWS.filter((r) => r.label !== 'All 6 Studio models') : ROWS.filter((r) => r.label !== 'Ready-to-post captions');
  return (
    <div className="overflow-x-auto rounded-2xl border border-app-line bg-app-panel">
      <table className="w-full min-w-[480px] text-[14px] text-app-ink">
        <thead>
          <tr className="border-b border-app-line">
            <th scope="col" className="p-4 text-left font-medium text-app-muted">Compare</th>
            {plans.map((plan) => <th key={plan.id} scope="col" className="p-4 text-center font-semibold">{plan.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-app-line last:border-0">
              <th scope="row" className="p-4 text-left font-normal">{row.label}</th>
              {plans.map((plan) => <td key={plan.id} className="p-4 text-center"><Cell value={row.value(plan)} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
