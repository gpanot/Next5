'use client';

/** Step 1 — what this campaign is for, where it posts, and what it sells. */
import { TextInput } from '../../../ui/TextInput';
import type { CampaignGoalDto } from '../../../../types/business/campaigns';

const GOALS: { value: CampaignGoalDto; label: string; sub: string }[] = [
  { value: 'leads', label: 'Get leads', sub: 'People who might buy later' },
  { value: 'enquiries', label: 'Get enquiries', sub: 'Calls, DMs and quote requests' },
  { value: 'sell', label: 'Sell something', sub: 'One product or offer this week' },
];

const CHANNELS = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
];

export type SellTarget =
  | { kind: 'product'; options: { id: string; name: string }[] }
  | { kind: 'listing'; options: { id: string; name: string }[] }
  | { kind: 'text' };

type Props = {
  goal: CampaignGoalDto;
  channels: string[];
  sellTarget: SellTarget;
  targetId: string | null;
  subject: string;
  onChange: (patch: { goal?: CampaignGoalDto; channels?: string[]; targetId?: string | null; subject?: string }) => void;
};

export function GoalStep({ goal, channels, sellTarget, targetId, subject, onChange }: Props) {
  const toggleChannel = (value: string) =>
    onChange({ channels: channels.includes(value) ? channels.filter((c) => c !== value) : [...channels, value] });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-[15px] font-medium text-app-ink">What is this week for?</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {GOALS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => onChange({ goal: g.value })}
              className={[
                'flex flex-col gap-0.5 rounded-xl border p-4 text-left transition-colors duration-200',
                goal === g.value ? 'border-app-ink bg-app-surface' : 'border-app-line hover:border-app-ink/40',
              ].join(' ')}
            >
              <span className="text-[14px] font-medium text-app-ink">{g.label}</span>
              <span className="text-[12px] text-app-muted">{g.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {goal === 'sell' && (
        <div className="flex flex-col gap-2">
          <p className="text-[15px] font-medium text-app-ink">What are you selling?</p>
          {sellTarget.kind === 'text' ? (
            <TextInput
              value={subject}
              onChange={(e) => onChange({ subject: e.target.value })}
              placeholder="10mm steel plate, this month's service special…"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {sellTarget.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onChange({ targetId: targetId === o.id ? null : o.id })}
                  className={[
                    'rounded-xl border px-3 py-2 text-[13px] transition-colors duration-200',
                    targetId === o.id ? 'border-app-ink bg-app-surface text-app-ink' : 'border-app-line text-app-muted',
                  ].join(' ')}
                >
                  {o.name}
                </button>
              ))}
              {sellTarget.options.length === 0 && (
                <p className="text-[13px] text-app-muted">
                  Nothing to pick yet — describe it instead in the next step.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-[15px] font-medium text-app-ink">Where does it post?</p>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => toggleChannel(c.value)}
              className={[
                'rounded-xl border px-4 py-2.5 text-[13px] transition-colors duration-200',
                channels.includes(c.value) ? 'border-app-ink bg-app-surface text-app-ink' : 'border-app-line text-app-muted',
              ].join(' ')}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-app-muted">
          {channels.length > 1
            ? 'The same post goes to both. One piece of content, posted twice.'
            : 'Every post is 9:16, made for full-screen feeds.'}
        </p>
      </div>
    </div>
  );
}
