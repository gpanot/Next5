'use client';

import { HeartIcon, SparkleIcon, ChatIcon } from '../../ui/Icons';

export const NOT_ME_REASONS = [
  { id: 'look',       label: 'The way I look' },
  { id: 'pose',       label: 'The pose' },
  { id: 'styling',    label: 'The styling' },
  { id: 'background', label: 'The background' },
  { id: 'vibe',       label: "It's not my vibe" },
] as const;

export const LIKE_BUT_REASONS = [
  { id: 'more_first',   label: 'I want to see more first' },
  { id: 'not_sure_5',   label: "I'm not sure I need 5 photos" },
  { id: 'too_expensive', label: "It's more than I expected" },
  { id: 'think',        label: 'I want to think about it' },
] as const;

// ── Feedback widget ──────────────────────────────────────────────────────────

type FeedbackWidgetProps = {
  value: 'love' | 'not_me' | 'like_but' | null;
  onLove: () => void;
  onNotMe: () => void;
  onLikeBut: () => void;
};

export const FeedbackWidget = ({ value, onLove, onNotMe, onLikeBut }: FeedbackWidgetProps) => (
  <div className="mb-5">
    <p className="label-caps mb-3 text-center text-[9px] font-medium tracking-[0.18em] text-muted">How does this feel?</p>
    <div className="grid grid-cols-3 gap-2">
      <FeedbackCard
        icon={<HeartIcon filled={value === 'love'} className="h-5 w-5" />}
        label="I love it"
        selected={value === 'love'}
        onClick={onLove}
      />
      <FeedbackCard
        icon={<SparkleIcon className="h-5 w-5" />}
        label={<>It&apos;s not<br />quite me</>}
        selected={value === 'not_me'}
        onClick={onNotMe}
      />
      <FeedbackCard
        icon={<ChatIcon className="h-5 w-5" />}
        label="I like it, but…"
        selected={value === 'like_but'}
        onClick={onLikeBut}
      />
    </div>
  </div>
);

// ── Primitives ───────────────────────────────────────────────────────────────

type FeedbackCardProps = { icon: React.ReactNode; label: React.ReactNode; selected: boolean; onClick: () => void };

const FeedbackCard = ({ icon, label, selected, onClick }: FeedbackCardProps) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-[12px] leading-tight transition-colors',
      selected
        ? 'border-accent bg-accent/10 text-accent-strong'
        : 'border-line bg-surface text-ink hover:border-accent/40 hover:bg-accent/5',
    ].join(' ')}
  >
    <span className={selected ? 'text-accent-strong' : 'text-muted'}>{icon}</span>
    <span>{label}</span>
  </button>
);

type FeedbackPopupProps = { children: React.ReactNode; onClose: () => void };

export const FeedbackPopup = ({ children, onClose }: FeedbackPopupProps) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
    <div className="relative w-full max-w-sm rounded-2xl bg-page px-6 py-6 shadow-2xl">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 text-muted transition-opacity hover:opacity-60"
      >
        <span className="text-[18px] leading-none">×</span>
      </button>
      {children}
    </div>
  </div>
);

type RadioRowProps = { label: string; selected: boolean; onSelect: () => void };

export const RadioRow = ({ label, selected, onSelect }: RadioRowProps) => (
  <button
    type="button"
    onClick={onSelect}
    className="flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 text-left text-[13px] text-ink transition-colors hover:border-accent/40 hover:bg-accent/5"
  >
    <span className={[
      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
      selected ? 'border-accent-strong bg-accent-strong' : 'border-muted/50',
    ].join(' ')}>
      {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
    </span>
    {label}
  </button>
);
