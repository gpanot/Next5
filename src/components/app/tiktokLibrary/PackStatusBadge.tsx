import type { PackStatusDto } from '../../../types/business/shop';
import { Badge, type BadgeTone } from '../../ui/Badge';

const LABEL: Record<PackStatusDto, { text: string; tone: BadgeTone }> = {
  draft: { text: 'Draft', tone: 'neutral' },
  ready: { text: 'Ready to list', tone: 'accent' },
  uploaded: { text: 'Uploaded', tone: 'success' },
};

export const PackStatusBadge = ({ status }: { status: PackStatusDto }) => <Badge tone={LABEL[status].tone}>{LABEL[status].text}</Badge>;
