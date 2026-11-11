'use client';

import type { Topics } from '../../../../lib/blueprint/schema';
import { BrandTree } from '../BrandTree';
import { TOPICS_STEP } from '../copy';
import { StepHeading } from '../StepHeading';
import { StepNav } from '../StepNav';
import { TopicBank } from '../TopicBank';
import type { StepNavProps } from './types';

type TopicsStepProps = StepNavProps & { topics: Topics; onChange: (topics: Topics) => void };

/** Step 2: one topic per line under each branch. The tree below updates as the user types. */
export const TopicsStep = ({ topics, onChange, onBack, onNext }: TopicsStepProps) => (
  <div className="flex flex-col gap-5">
    <StepHeading step={1} title={TOPICS_STEP.title} accent={TOPICS_STEP.accent}>{TOPICS_STEP.body}</StepHeading>
    <TopicBank topics={topics} onChange={onChange} />
    <BrandTree topics={topics} rootLabel="You" />
    <StepNav onBack={onBack} onNext={onNext} nextLabel={TOPICS_STEP.next} />
  </div>
);
