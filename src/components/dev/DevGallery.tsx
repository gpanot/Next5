'use client';

import { useState } from 'react';
import { BusinessSurface } from '../ui/BusinessSurface';
import { AppButton } from '../ui/AppButton';
import { Card, CardHeader, CardBody, CardFooter } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ChipGroup } from '../ui/Chip';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Tabs } from '../ui/Tabs';
import { Field } from '../ui/Field';
import { TextInput } from '../ui/TextInput';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { ColorInput } from '../ui/ColorInput';
import { Checkbox } from '../ui/Checkbox';
import { RadioGroup } from '../ui/Radio';
import { Switch } from '../ui/Switch';
import { Stepper } from '../ui/Stepper';
import { ProgressMeter } from '../ui/ProgressMeter';
import { SkeletonText, SkeletonCard, SkeletonGrid } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Dialog } from '../ui/Dialog';
import { Sheet } from '../ui/Sheet';
import { ToastContainer } from '../ui/Toast';
import { FileDrop } from '../ui/FileDrop';
import { ImageTile } from '../ui/ImageTile';
import { ImageGrid } from '../ui/ImageGrid';
import { CompareRow } from '../ui/CompareRow';
import { PriceTag } from '../ui/PriceTag';
import { Tooltip } from '../ui/Tooltip';
import { Kbd } from '../ui/Kbd';
import { Avatar } from '../ui/Avatar';
import { Divider } from '../ui/Divider';
import { useToast } from '../../hooks/useToast';
import { Search } from 'lucide-react';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-4">
    <h2 className="text-[18px] font-semibold text-app-ink border-b border-app-line pb-2">{title}</h2>
    {children}
  </section>
);

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center gap-3">{children}</div>
);

export const DevGallery = () => {
  const { toasts, toast, dismiss } = useToast();

  const [seg, setSeg]           = useState('1mo');
  const [tab, setTab]           = useState('brand');
  const [chip, setChip]         = useState<string[]>([]);
  const [checked, setChecked]   = useState(false);
  const [radio, setRadio]       = useState('a');
  const [on, setOn]             = useState(false);
  const [color, setColor]       = useState('#b8683f');
  const [dialogOpen, setDialog] = useState(false);
  const [sheetOpen, setSheet]   = useState(false);
  const [stepperStep, setStep]  = useState(2);

  return (
    <BusinessSurface>
      <div className="mx-auto max-w-3xl px-5 py-12 space-y-12">
        <div>
          <h1 className="text-[28px] font-semibold text-app-ink">Dev UI Gallery</h1>
          <p className="mt-1 text-[14px] text-app-muted">
            All business-surface primitives — light and dark mode (toggle OS appearance).
          </p>
        </div>

        {/* AppButton */}
        <Section title="AppButton">
          <Row>
            <AppButton variant="primary">Primary</AppButton>
            <AppButton variant="secondary">Secondary</AppButton>
            <AppButton variant="ghost">Ghost</AppButton>
            <AppButton variant="danger">Danger</AppButton>
            <AppButton variant="primary" loading>Loading</AppButton>
            <AppButton variant="primary" disabled>Disabled</AppButton>
          </Row>
          <Row>
            <AppButton variant="primary" size="sm">Small</AppButton>
            <AppButton variant="primary" size="md">Medium</AppButton>
            <AppButton variant="primary" size="lg">Large</AppButton>
            <AppButton variant="primary" iconLeft={<Search className="h-4 w-4" />}>With icon</AppButton>
          </Row>
        </Section>

        {/* Card */}
        <Section title="Card">
          <Card className="max-w-xs">
            <CardHeader><span className="text-[15px] font-semibold text-app-ink">Card title</span></CardHeader>
            <CardBody><p className="text-[13px] text-app-muted">Body content goes here.</p></CardBody>
            <CardFooter><p className="text-[12px] text-app-muted">Footer</p></CardFooter>
          </Card>
        </Section>

        {/* Badge */}
        <Section title="Badge">
          <Row>
            {(['neutral', 'accent', 'success', 'warning', 'danger', 'info'] as const).map((t) => (
              <Badge key={t} tone={t}>{t}</Badge>
            ))}
          </Row>
        </Section>

        {/* Chip */}
        <Section title="Chip / ChipGroup">
          <ChipGroup
            options={[
              { value: 'real-estate', label: 'Real estate' },
              { value: 'coaching', label: 'Coaching' },
              { value: 'beauty', label: 'Beauty & wellness' },
            ]}
            value={chip}
            onChange={(v) => setChip(v as string[])}
            multi
          />
        </Section>

        {/* SegmentedControl */}
        <Section title="SegmentedControl">
          <SegmentedControl
            options={[{ value: '1mo', label: '1 mo' }, { value: '3mo', label: '3 mo −10%' }, { value: '6mo', label: '6 mo −20%' }]}
            value={seg}
            onChange={setSeg}
          />
        </Section>

        {/* Tabs */}
        <Section title="Tabs">
          <Tabs
            tabs={[{ value: 'brand', label: 'Brand' }, { value: 'shop', label: 'Shop' }]}
            value={tab}
            onChange={setTab}
          />
          <p className="text-[13px] text-app-muted">Active: {tab}</p>
        </Section>

        {/* Form fields */}
        <Section title="Form fields">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="email-demo" required helper="We'll never share your email.">
              <TextInput id="email-demo" type="email" placeholder="you@example.com" />
            </Field>
            <Field label="Studio" htmlFor="studio-demo">
              <Select id="studio-demo">
                <option>Brand Studio</option>
                <option>Shop Studio</option>
              </Select>
            </Field>
            <Field label="Bio" htmlFor="bio-demo">
              <Textarea id="bio-demo" rows={3} placeholder="A few words about you…" />
            </Field>
            <Field label="Brand colour" htmlFor="color-demo">
              <ColorInput value={color} onChange={setColor} label="Choose brand colour" />
            </Field>
            <Field label="Error state" htmlFor="err-demo" error="This field is required.">
              <TextInput id="err-demo" error placeholder="…" />
            </Field>
          </div>
        </Section>

        {/* Checkbox / Radio / Switch */}
        <Section title="Checkbox · Radio · Switch">
          <Row>
            <Checkbox label="I agree to the terms" checked={checked} onChange={setChecked} />
            <Switch label="Notifications" checked={on} onChange={setOn} />
          </Row>
          <RadioGroup
            name="demo-radio"
            options={[{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }, { value: 'c', label: 'Option C' }]}
            value={radio}
            onChange={setRadio}
          />
        </Section>

        {/* Stepper */}
        <Section title="Stepper">
          <Stepper steps={['Account', 'Consent', 'Identity', 'Set', 'Trial', 'Plan']} current={stepperStep} />
          <Row>
            <AppButton variant="secondary" size="sm" onClick={() => setStep((s) => Math.max(1, s - 1))}>Back</AppButton>
            <AppButton variant="primary"   size="sm" onClick={() => setStep((s) => Math.min(6, s + 1))}>Next</AppButton>
          </Row>
        </Section>

        {/* ProgressMeter */}
        <Section title="ProgressMeter">
          <ProgressMeter used={24} total={90} label="Photos this month" />
          <ProgressMeter used={76} total={90} label="Nearly full (warning)" />
        </Section>

        {/* Skeleton */}
        <Section title="Skeleton">
          <SkeletonText lines={3} className="max-w-xs" />
          <SkeletonCard className="max-w-xs" />
          <SkeletonGrid count={3} cols={3} />
        </Section>

        {/* EmptyState / ErrorState */}
        <Section title="EmptyState · ErrorState">
          <EmptyState title="No batches yet" body="Create your first batch — it takes about 5 minutes." action={{ label: '+ Create batch', variant: 'primary' }} />
          <ErrorState message="Failed to load batches." onRetry={() => {}} />
        </Section>

        {/* Dialog / Sheet */}
        <Section title="Dialog · Sheet">
          <Row>
            <AppButton variant="secondary" onClick={() => setDialog(true)}>Open Dialog</AppButton>
            <AppButton variant="secondary" onClick={() => setSheet(true)}>Open Sheet</AppButton>
          </Row>
        </Section>

        {/* Toast */}
        <Section title="Toast">
          <Row>
            <AppButton variant="secondary" onClick={() => toast('Photo saved successfully!', 'success')}>Success toast</AppButton>
            <AppButton variant="secondary" onClick={() => toast('Something went wrong.', 'error')}>Error toast</AppButton>
          </Row>
        </Section>

        {/* FileDrop */}
        <Section title="FileDrop">
          <FileDrop onFiles={(files) => toast(`${files.length} file(s) selected`)} label="Upload identity photos" hint="JPG or PNG, up to 10 MB each" multiple />
        </Section>

        {/* ImageTile / ImageGrid */}
        <Section title="ImageTile · ImageGrid">
          <ImageGrid cols={4}>
            <ImageTile alt="Ready tile" status="ready" onFavourite={() => {}} onDownload={() => {}} onRedo={() => {}} />
            <ImageTile alt="Generating" status="generating" />
            <ImageTile alt="Queued" status="queued" />
            <ImageTile alt="Failed" status="failed" />
          </ImageGrid>
        </Section>

        {/* CompareRow */}
        <Section title="CompareRow">
          <CompareRow
            label="Linen set — beige"
            generatedImages={[{ alt: 'Shot 1' }, { alt: 'Shot 2' }, { alt: 'Shot 3' }]}
          />
        </Section>

        {/* PriceTag */}
        <Section title="PriceTag">
          <Row>
            <PriceTag cents={1900} suffix="/mo" />
            <PriceTag cents={1710} originalCents={1900} suffix="/mo" />
            <PriceTag cents={63} />
          </Row>
        </Section>

        {/* Primitives */}
        <Section title="Tooltip · Kbd · Avatar · Divider">
          <Row>
            <Tooltip content="Keyboard shortcut"><Kbd>⌘K</Kbd></Tooltip>
            <Kbd>Esc</Kbd>
            <Kbd>Enter</Kbd>
          </Row>
          <Row>
            <Avatar initials="GP" size="sm" />
            <Avatar initials="GP" size="md" />
            <Avatar initials="GP" size="lg" />
            <Avatar size="md" />
          </Row>
          <Divider label="or" />
          <Divider />
        </Section>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialog(false)} title="Delete face data?" description="This will remove your identity photos and future batches will need new photos.">
        <div className="flex justify-end gap-2 pt-2">
          <AppButton variant="secondary" onClick={() => setDialog(false)}>Cancel</AppButton>
          <AppButton variant="danger" onClick={() => { toast('Deleted.', 'success'); setDialog(false); }}>Delete</AppButton>
        </div>
      </Dialog>

      {/* Sheet */}
      <Sheet open={sheetOpen} onClose={() => setSheet(false)} title="Filter photos" side="bottom">
        <p className="text-[14px] text-app-muted">Sheet content goes here.</p>
        <AppButton variant="primary" fullWidth className="mt-4" onClick={() => setSheet(false)}>Apply filters</AppButton>
      </Sheet>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </BusinessSurface>
  );
};
