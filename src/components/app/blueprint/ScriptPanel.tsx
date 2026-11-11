'use client';

import { Copy, Loader2, Mic, RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { INSTRUCTION_MAX, type PlanDay } from '../../../lib/blueprint/schema';
import { scriptText } from '../../../lib/blueprint/text';
import { scriptPlaceholders, type HookOption } from '../../../lib/scriptGenerator/types';
import { AppButton } from '../../ui/AppButton';
import { TextInput } from '../../ui/TextInput';
import { CopyFallback } from './CopyFallback';
import { HookOptions } from './HookOptions';
import { SCRIPT_UI } from './planCopy';
import { ScriptBody } from './ScriptBody';
import { Teleprompter } from './Teleprompter';
import { useCopy } from './useCopy';
import type { DayRun } from './useScriptGeneration';

type Actions = { write: (hook?: HookOption) => void; change: (instruction: string) => void; loadHooks: () => void; hideHooks: () => void; stop: () => void };

const Progress = ({ text, onStop }: { text: string; onStop: () => void }) => (
  <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl bg-app-sunken p-3 text-[14px] text-app-muted">
    <Loader2 aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" />
    <span className="flex-1">{text}</span>
    <AppButton size="lg" variant="secondary" onClick={onStop}>{SCRIPT_UI.stop}</AppButton>
  </div>
);

const ChangeIt = ({ onSend, disabled }: { onSend: (instruction: string) => void; disabled: boolean }) => {
  const [value, setValue] = useState('');
  const send = () => {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue('');
  };
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
      <TextInput aria-label={SCRIPT_UI.changeLabel} value={value} maxLength={INSTRUCTION_MAX} placeholder={SCRIPT_UI.changePlaceholder} onChange={(e) => setValue(e.target.value)} className="min-h-11 flex-1 text-[16px] sm:text-[14px]" />
      <AppButton type="submit" size="lg" variant="secondary" disabled={disabled || !value.trim()}>{SCRIPT_UI.changeSend}</AppButton>
    </form>
  );
};

const ScriptActions = ({ day, run, actions }: { day: PlanDay; run: DayRun; actions: Actions }) => {
  const [recording, setRecording] = useState(false);
  const { state, copy } = useCopy();
  if (!day.script) return null;
  const text = scriptText(day.script, day.format);
  const busy = run.busy !== null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <AppButton size="lg" onClick={() => setRecording(true)} iconLeft={<Mic className="h-4 w-4" />}>{SCRIPT_UI.record}</AppButton>
        <AppButton size="lg" variant="secondary" onClick={() => void copy(text)} iconLeft={<Copy className="h-4 w-4" />}>{state === 'copied' ? SCRIPT_UI.copied : SCRIPT_UI.copy}</AppButton>
        <AppButton size="lg" variant="ghost" disabled={busy} onClick={() => actions.write()} iconLeft={<RefreshCw className="h-4 w-4" />}>{SCRIPT_UI.rewrite}</AppButton>
      </div>
      {state === 'failed' && <CopyFallback text={text} note={SCRIPT_UI.copyFallback} />}
      <ChangeIt disabled={busy} onSend={actions.change} />
      {run.message && <p role="status" className="text-[13px] text-app-muted">{run.message}</p>}
      {recording && <Teleprompter script={day.script} format={day.format} onClose={() => setRecording(false)} />}
    </div>
  );
};

/** Everything about one day's script: write, hook options, progress with Stop, errors, the script and its actions. */
export const ScriptPanel = ({ day, run, actions }: { day: PlanDay; run: DayRun; actions: Actions }) => {
  const hasTopic = Boolean(day.topic.trim());
  const busy = run.busy !== null;
  const placeholders = day.script ? scriptPlaceholders(day.script) : [];
  return (
    <div className="flex flex-col gap-3">
      {!day.script && !busy && (
        <div className="flex flex-wrap items-center gap-3">
          <AppButton size="lg" disabled={!hasTopic} onClick={() => actions.write()} iconLeft={<Sparkles className="h-4 w-4" />}>{SCRIPT_UI.write}</AppButton>
          <button type="button" disabled={!hasTopic} onClick={run.hooks ? actions.hideHooks : actions.loadHooks} className="min-h-11 px-1 text-[14px] font-medium text-app-accent underline underline-offset-4 disabled:opacity-40">
            {run.hooks ? SCRIPT_UI.hideHooks : SCRIPT_UI.hookOptions}
          </button>
          {!hasTopic && <span className="text-[13px] text-app-muted">{SCRIPT_UI.needTopic}</span>}
        </div>
      )}
      {run.busy === 'writing' && <Progress text={SCRIPT_UI.writing} onStop={actions.stop} />}
      {run.busy === 'changing' && <Progress text={SCRIPT_UI.changing} onStop={actions.stop} />}
      {run.busy === 'hooks' && <Progress text={SCRIPT_UI.hooksLoading} onStop={actions.stop} />}
      {run.hooks && !busy && <HookOptions hooks={run.hooks} disabled={busy} onPick={(hook) => actions.write(hook)} />}
      {run.error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-app-danger/30 bg-app-danger/5 p-3 text-[14px] text-app-ink">
          <span className="flex-1">{run.error}</span>
          {hasTopic && <AppButton size="lg" variant="secondary" onClick={() => actions.write()}>{SCRIPT_UI.tryAgain}</AppButton>}
        </div>
      )}
      {day.script && (
        <div className="flex flex-col gap-3 rounded-2xl bg-app-sunken p-3 sm:p-4">
          {placeholders.length > 0 && <p role="note" className="rounded-xl bg-app-warning/15 p-3 text-[13px] text-app-ink">{SCRIPT_UI.placeholders}</p>}
          <ScriptBody script={day.script} format={day.format} />
          <ScriptActions day={day} run={run} actions={actions} />
        </div>
      )}
    </div>
  );
};
