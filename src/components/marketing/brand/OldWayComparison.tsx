import { BRAND } from '../../../content/business/marketing';

export const OldWayComparison = () => (
  <div className="overflow-hidden rounded-2xl border border-app-line bg-app-panel">
    <div className="grid grid-cols-[1fr_1fr] border-b border-app-line text-[13px] font-semibold sm:grid-cols-[180px_1fr_1fr]">
      <span className="hidden p-4 sm:block" />
      <span className="p-4 text-app-muted">A photographer</span>
      <span className="bg-app-accent-soft p-4 text-app-accent">Next5 Brand Studio</span>
    </div>
    {BRAND.comparison.rows.map((row) => (
      <div key={row.label} className="grid grid-cols-[1fr_1fr] border-b border-app-line last:border-0 sm:grid-cols-[180px_1fr_1fr]">
        <span className="label-caps col-span-2 px-4 pt-4 text-[10px] font-medium text-app-muted sm:col-span-1 sm:p-4 sm:text-[11px]">{row.label}</span>
        <span className="p-4 pt-2 text-[15px] text-app-muted sm:pt-4">{row.old}</span>
        <span className="bg-app-accent-soft/50 p-4 pt-2 text-[15px] font-medium text-app-ink sm:pt-4">{row.next5}</span>
      </div>
    ))}
  </div>
);
