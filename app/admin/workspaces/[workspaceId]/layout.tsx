import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workspace · Admin',
  robots: { index: false, follow: false },
};

export default function AdminWorkspaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
