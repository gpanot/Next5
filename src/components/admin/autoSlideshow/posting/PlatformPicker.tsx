'use client';

import { useState } from 'react';
import { PLATFORM_LABELS, POST_PLATFORMS, type PostPlatform, type RunAccountsDto } from '../../../../types/admin/autoSlideshow';
import { ChannelList } from '../../../labs/blitzLab/schedule/ChannelList';
import { InstagramTypeDialog } from '../settings/InstagramTypeDialog';
import { startConnect } from '../settings/AccountsSection';

type Props = {
  accounts: RunAccountsDto;
  value: PostPlatform[];
  onChange: (v: PostPlatform[]) => void;
  /** Platforms this slideshow is already live on: shown, not pickable. */
  live?: PostPlatform[];
  tone?: 'light' | 'dark';
  /** Signed-in token: a platform not connected yet gets a Connect button (it comes back to this page, then can be ticked). */
  token?: string;
};

/** "Post to" for slideshows: tick any connected platforms (the same rows as a Blitz video's approval). */
export function PlatformPicker({ accounts, value, onChange, live = [], tone = 'light', token }: Props) {
  // Instagram asks the account type first: only Business and Creator accounts can be connected.
  const [askingType, setAskingType] = useState(false);
  const workspace = accounts.workspaceId;
  const rows = POST_PLATFORMS.map((p) => {
    const account = accounts.accounts[p];
    return { id: p, label: PLATFORM_LABELS[p], username: account?.username ?? null, connected: Boolean(account), available: accounts.configured[p] };
  });
  const connect = token && workspace
    ? (p: PostPlatform) => (p === 'instagram' ? setAskingType(true) : startConnect(token, workspace, p))
    : undefined;
  return (
    <>
      <ChannelList rows={rows} value={value} onChange={onChange} live={live} tone={tone} connect={connect} />
      {askingType && token && workspace && (
        <InstagramTypeDialog onClose={() => setAskingType(false)} onBusiness={() => { setAskingType(false); void startConnect(token, workspace, 'instagram'); }} />
      )}
    </>
  );
}

/** Connected platforms not yet live, in display order: the default selection. */
export const defaultPlatforms = (accounts: RunAccountsDto, live: PostPlatform[] = []) => POST_PLATFORMS.filter((p) => accounts.accounts[p] && !live.includes(p));
