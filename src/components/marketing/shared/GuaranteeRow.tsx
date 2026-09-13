import { BadgeCheck, CalendarCheck, ShieldCheck, Tag } from 'lucide-react';

const ICONS = [BadgeCheck, CalendarCheck, ShieldCheck, Tag] as const;

type GuaranteeRowProps = { items: readonly { title: string; body: string }[] };

export const GuaranteeRow = ({ items }: GuaranteeRowProps) => (
  <ul className="grid gap-px overflow-hidden rounded-2xl border border-app-line bg-app-line sm:grid-cols-2 lg:grid-cols-4">
    {items.map((item, index) => {
      const Icon = ICONS[index % ICONS.length] ?? BadgeCheck;
      return (
        <li key={item.title} className="flex gap-3 bg-app-panel p-5">
          <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
          <div>
            <p className="text-[15px] font-semibold text-app-ink">{item.title}</p>
            <p className="mt-1 text-[14px] text-app-muted">{item.body}</p>
          </div>
        </li>
      );
    })}
  </ul>
);
