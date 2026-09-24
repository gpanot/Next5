\restrict dbmate

-- Dumped from database version 18.6 (Debian 18.6-1.pgdg13+2)
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: BatchKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BatchKind" AS ENUM (
    'trial',
    'brand_theme',
    'shop_products'
);


--
-- Name: BatchStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BatchStatus" AS ENUM (
    'queued',
    'generating',
    'ready',
    'failed',
    'cancelled'
);


--
-- Name: IdentityKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."IdentityKind" AS ENUM (
    'face',
    'full_body'
);


--
-- Name: ItemStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ItemStatus" AS ENUM (
    'queued',
    'submitting',
    'generating',
    'ready',
    'failed'
);


--
-- Name: LedgerReason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LedgerReason" AS ENUM (
    'trial_grant',
    'plan_grant',
    'topup_grant',
    'batch_reserve',
    'item_refund',
    'redo_charge',
    'expiry',
    'admin_adjust'
);


--
-- Name: PaymentPurpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentPurpose" AS ENUM (
    'subscription',
    'topup',
    'consumer_booking'
);


--
-- Name: PaymentState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentState" AS ENUM (
    'pending',
    'paid',
    'underpaid',
    'expired',
    'refunded'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'pending',
    'paid',
    'confirmed'
);


--
-- Name: PhotoType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PhotoType" AS ENUM (
    'upload',
    'preview',
    'generated'
);


--
-- Name: ProductLine; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProductLine" AS ENUM (
    'brand',
    'shop'
);


--
-- Name: SetStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SetStatus" AS ENUM (
    'draft',
    'active',
    'archived'
);


--
-- Name: ShootStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ShootStatus" AS ENUM (
    'preview_generating',
    'preview_ready',
    'creating',
    'delivered',
    'error'
);


--
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'pending',
    'active',
    'expired',
    'cancelled'
);


--
-- Name: asset_fulfilment; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.asset_fulfilment AS ENUM (
    'upload',
    'library',
    'generate'
);


--
-- Name: asset_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.asset_kind AS ENUM (
    'person_on_camera',
    'product_footage',
    'product_image',
    'location_footage',
    'customer_photo',
    'customer_footage',
    'logo',
    'on_screen_text',
    'before_after_photo',
    'before_footage',
    'after_footage',
    'demonstration',
    'spec_sheet_broll',
    'trending_audio',
    'screen_recording',
    'generic_selfie'
);


--
-- Name: audience_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.audience_type AS ENUM (
    'b2c',
    'b2b',
    'both'
);


--
-- Name: blitz_render_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.blitz_render_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);


--
-- Name: blitz_template_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.blitz_template_type AS ENUM (
    'GREEN_SCREEN',
    'BROLL_VIDEO',
    'CAROUSEL'
);


--
-- Name: campaign_goal; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.campaign_goal AS ENUM (
    'leads',
    'enquiries',
    'sell'
);


--
-- Name: campaign_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.campaign_status AS ENUM (
    'draft',
    'generated',
    'scheduled',
    'archived'
);


--
-- Name: content_engine; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.content_engine AS ENUM (
    'blitz_slideshow',
    'ugc_video'
);


--
-- Name: content_purpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.content_purpose AS ENUM (
    'awareness',
    'trust',
    'enquiry',
    'conversion',
    'engagement',
    'retention'
);


--
-- Name: content_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.content_source AS ENUM (
    'real',
    'mix',
    'generated'
);


--
-- Name: content_template_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.content_template_status AS ENUM (
    'draft',
    'active',
    'archived'
);


--
-- Name: studio_cache_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.studio_cache_type AS ENUM (
    'keyword',
    'transcript',
    'classification'
);


--
-- Name: studio_candidate_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.studio_candidate_status AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'edited'
);


--
-- Name: studio_exclude_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.studio_exclude_reason AS ENUM (
    'too_long',
    'no_hook',
    'unsupported_format'
);


--
-- Name: studio_job_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.studio_job_status AS ENUM (
    'idle',
    'pending',
    'running',
    'done',
    'failed'
);


--
-- Name: studio_reject_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.studio_reject_reason AS ENUM (
    'off_brand',
    'wrong_audience',
    'weak_hook',
    'bad_image',
    'factually_wrong',
    'other'
);


--
-- Name: studio_step; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.studio_step AS ENUM (
    'profile',
    'research',
    'generation',
    'calendar'
);


--
-- Name: template_perspective; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.template_perspective AS ENUM (
    'business',
    'audience'
);


--
-- Name: template_variable_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.template_variable_source AS ENUM (
    'brand',
    'campaign',
    'manual'
);


--
-- Name: template_variable_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.template_variable_type AS ENUM (
    'text',
    'image',
    'number',
    'url'
);


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_logs (
    id text NOT NULL,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    details jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: bank_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_transactions (
    id text NOT NULL,
    provider text DEFAULT 'sepay'::text NOT NULL,
    provider_txn_id text NOT NULL,
    amount_vnd integer NOT NULL,
    content text NOT NULL,
    reference text,
    payment_id text,
    match_status text NOT NULL,
    raw jsonb NOT NULL,
    received_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: batch_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batch_items (
    id text NOT NULL,
    batch_id text NOT NULL,
    product_id text,
    scene_id text,
    shot text,
    format text NOT NULL,
    prompt text NOT NULL,
    input_r2_keys text[],
    status public."ItemStatus" DEFAULT 'queued'::public."ItemStatus" NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    wavespeed_task_id text,
    r2_key text,
    error_message text,
    free_redos_used integer DEFAULT 0 NOT NULL,
    redo_reason text,
    favorite boolean DEFAULT false NOT NULL,
    rating integer,
    caption text,
    submitted_at timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    pending_refund_key text,
    post_kit jsonb,
    score integer,
    score_details jsonb,
    model text,
    material_id text,
    archived_at timestamp(3) without time zone
);


--
-- Name: batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batches (
    id text NOT NULL,
    workspace_id text NOT NULL,
    kind public."BatchKind" NOT NULL,
    status public."BatchStatus" DEFAULT 'queued'::public."BatchStatus" NOT NULL,
    name text NOT NULL,
    set_id text,
    theme_id text,
    pack_id text,
    formats text[],
    high_res boolean DEFAULT false NOT NULL,
    priority integer DEFAULT 2 NOT NULL,
    credits_reserved integer DEFAULT 0 NOT NULL,
    cost_usd_micros integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp(3) without time zone,
    listing_id text,
    occasion text,
    preview boolean DEFAULT false NOT NULL,
    variation boolean DEFAULT false NOT NULL
);


--
-- Name: blitz_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blitz_assets (
    id text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    r2_key text NOT NULL,
    thumbnail_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    source text DEFAULT 'library'::text NOT NULL,
    workspace_id text
);


--
-- Name: blitz_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blitz_projects (
    id text NOT NULL,
    template_id text NOT NULL,
    current_assets jsonb DEFAULT '{}'::jsonb NOT NULL,
    overlay_zoom double precision DEFAULT 1.0 NOT NULL,
    overlay_offset_x double precision DEFAULT 0 NOT NULL,
    overlay_offset_y double precision DEFAULT 0 NOT NULL,
    mention_business boolean DEFAULT false NOT NULL,
    regen_prompt text,
    caption_text text DEFAULT ''::text NOT NULL,
    render_status public.blitz_render_status DEFAULT 'PENDING'::public.blitz_render_status NOT NULL,
    rendered_video_key text,
    is_identifiable_person boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id text
);


--
-- Name: blitz_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blitz_templates (
    id text NOT NULL,
    name text NOT NULL,
    type public.blitz_template_type DEFAULT 'GREEN_SCREEN'::public.blitz_template_type NOT NULL,
    default_assets jsonb DEFAULT '{}'::jsonb NOT NULL,
    text_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    default_hook_text text DEFAULT ''::text NOT NULL,
    remix_prompt text DEFAULT ''::text NOT NULL,
    duration_seconds double precision DEFAULT 5.0 NOT NULL,
    fps integer DEFAULT 30 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: booking_regenerations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_regenerations (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    booking_id text NOT NULL,
    scene_index integer,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id text NOT NULL,
    user_id text,
    route_id text NOT NULL,
    route_title text NOT NULL,
    director_id text DEFAULT ''::text NOT NULL,
    director_name text DEFAULT ''::text NOT NULL,
    feelings text[] DEFAULT '{}'::text[] NOT NULL,
    goals text[] DEFAULT '{}'::text[] NOT NULL,
    amount_vnd integer,
    discount_percent integer,
    payment_status public."PaymentStatus" DEFAULT 'pending'::public."PaymentStatus" NOT NULL,
    shoot_status public."ShootStatus" DEFAULT 'preview_generating'::public."ShootStatus" NOT NULL,
    wavespeed_task_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    regenerate_count integer DEFAULT 0 NOT NULL,
    regenerate_last_at timestamp with time zone,
    preview_feedback text,
    preview_feedback_detail text
);


--
-- Name: campaign_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_posts (
    id text NOT NULL,
    campaign_id text NOT NULL,
    day_index integer NOT NULL,
    slot_of_day text DEFAULT 'evening'::text NOT NULL,
    scheduled_for date NOT NULL,
    template_id text NOT NULL,
    version_id text NOT NULL,
    purpose public.content_purpose NOT NULL,
    source public.content_source DEFAULT 'real'::public.content_source NOT NULL,
    widened boolean DEFAULT false NOT NULL,
    skipped boolean DEFAULT false NOT NULL,
    caption text,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    id text NOT NULL,
    workspace_id text NOT NULL,
    goal public.campaign_goal NOT NULL,
    product_id text,
    listing_id text,
    channels text[] DEFAULT ARRAY['tiktok'::text] NOT NULL,
    campaign_subject text,
    campaign_message text,
    use_brand_subject boolean DEFAULT true NOT NULL,
    use_brand_message boolean DEFAULT true NOT NULL,
    promo text,
    notes text,
    posts_per_day integer DEFAULT 1 NOT NULL,
    weeks integer DEFAULT 1 NOT NULL,
    start_date date NOT NULL,
    asset_method text,
    asset_url text,
    status public.campaign_status DEFAULT 'draft'::public.campaign_status NOT NULL,
    step integer DEFAULT 1 NOT NULL,
    scheduled_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: clone_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clone_videos (
    id text NOT NULL,
    poyo_task_id text NOT NULL,
    character_key text NOT NULL,
    ref_video_key text NOT NULL,
    duration_sec integer NOT NULL,
    status text DEFAULT 'generating'::text NOT NULL,
    raw_key text,
    error text,
    cost_usd_micros integer DEFAULT 0 NOT NULL,
    submitted_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    model text,
    resolution text,
    prompt text,
    workspace_id text
);


--
-- Name: consent_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consent_records (
    id text NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    version text NOT NULL,
    ip text,
    user_agent text,
    accepted_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: content_pillars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_pillars (
    id text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: content_template_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_template_versions (
    id text NOT NULL,
    template_id text NOT NULL,
    version integer NOT NULL,
    hook_pattern text DEFAULT ''::text NOT NULL,
    beats jsonb DEFAULT '[]'::jsonb NOT NULL,
    suggested_slides jsonb DEFAULT '[]'::jsonb NOT NULL,
    keywords text[] DEFAULT ARRAY[]::text[] NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: content_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_templates (
    id text NOT NULL,
    slug text NOT NULL,
    legacy_id integer,
    name text NOT NULL,
    pillar_id text NOT NULL,
    format_slug text NOT NULL,
    audience public.audience_type DEFAULT 'both'::public.audience_type NOT NULL,
    platforms text[] DEFAULT ARRAY['tiktok'::text, 'instagram'::text] NOT NULL,
    purposes public.content_purpose[] DEFAULT ARRAY[]::public.content_purpose[] NOT NULL,
    primary_purpose public.content_purpose NOT NULL,
    workspace_id text,
    parent_template_id text,
    active_version_id text,
    status public.content_template_status DEFAULT 'draft'::public.content_template_status NOT NULL,
    times_used integer DEFAULT 0 NOT NULL,
    avg_engagement_score double precision,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    recommended_engine public.content_engine DEFAULT 'blitz_slideshow'::public.content_engine NOT NULL,
    perspective public.template_perspective DEFAULT 'business'::public.template_perspective NOT NULL
);


--
-- Name: credit_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_ledger (
    id text NOT NULL,
    workspace_id text NOT NULL,
    delta integer NOT NULL,
    reason public."LedgerReason" NOT NULL,
    bucket text NOT NULL,
    grant_id text,
    ref_type text,
    ref_id text,
    expires_at timestamp(3) without time zone,
    note text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: drop_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drop_schedules (
    id text NOT NULL,
    workspace_id text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    cadence text DEFAULT 'weekly'::text NOT NULL,
    weekday integer DEFAULT 1 NOT NULL,
    products_per_drop integer DEFAULT 10 NOT NULL,
    set_id text,
    pack_id text DEFAULT 'listing'::text NOT NULL,
    formats text[] DEFAULT ARRAY['square_1_1'::text, 'story_9_16'::text] NOT NULL,
    next_run_at timestamp(3) without time zone,
    last_run_at timestamp(3) without time zone,
    last_product_ids text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_logs (
    id text NOT NULL,
    user_id text NOT NULL,
    workspace_id text,
    template text NOT NULL,
    dedupe_key text NOT NULL,
    sent_at timestamp(3) without time zone,
    error text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: identity_references; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.identity_references (
    id text NOT NULL,
    workspace_id text,
    kind public."IdentityKind" NOT NULL,
    r2_key text NOT NULL,
    is_studio_model boolean DEFAULT false NOT NULL,
    studio_model_slug text,
    wavespeed_url text,
    wavespeed_url_at timestamp(3) without time zone,
    deleted_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: influencer_gallery_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.influencer_gallery_items (
    id character varying(30) NOT NULL,
    image_key text NOT NULL,
    gender character varying(20),
    age integer,
    ethnicity character varying(60),
    archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: influencers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.influencers (
    id character varying(30) NOT NULL,
    workspace_id character varying(30) NOT NULL,
    name character varying(80) NOT NULL,
    gender character varying(20),
    age integer,
    ethnicity character varying(60),
    source character varying(20) NOT NULL,
    base_image_key text,
    gallery_item_id character varying(30),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    identity_lock jsonb,
    portrait_prompt_json jsonb
);


--
-- Name: listing_packs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_packs (
    id text NOT NULL,
    workspace_id text NOT NULL,
    product_id text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    slot_item_ids text[] DEFAULT '{}'::text[] NOT NULL,
    hidden_item_ids text[] DEFAULT '{}'::text[] NOT NULL,
    cover_item_id text,
    uploaded_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listings (
    id text NOT NULL,
    workspace_id text NOT NULL,
    label text NOT NULL,
    attested_at timestamp(3) without time zone,
    visible_ai_tag boolean DEFAULT false NOT NULL,
    archived_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    source text DEFAULT 'upload'::text NOT NULL,
    zpid text,
    source_url text,
    address jsonb,
    price_cents integer,
    beds integer,
    baths double precision,
    sqft integer,
    status text,
    days_on_market integer,
    candidates jsonb,
    import_status text DEFAULT 'ready'::text NOT NULL,
    import_error text,
    run_id text,
    imported_at timestamp(3) without time zone,
    synced_at timestamp(3) without time zone
);


--
-- Name: model_test_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_test_items (
    id text NOT NULL,
    run_id text NOT NULL,
    model text NOT NULL,
    status text DEFAULT 'generating'::text NOT NULL,
    wavespeed_task_id text,
    r2_key text,
    error text,
    cost_usd_micros integer DEFAULT 0 NOT NULL,
    submitted_at timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: model_test_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_test_runs (
    id text NOT NULL,
    label text,
    prompt text NOT NULL,
    shot text NOT NULL,
    format text NOT NULL,
    resolution text DEFAULT '1k'::text NOT NULL,
    template_id text,
    model_ref text,
    product_name text,
    input_r2_keys text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id text NOT NULL,
    user_id text NOT NULL,
    workspace_id text,
    booking_id text,
    purpose public."PaymentPurpose" NOT NULL,
    item_id text NOT NULL,
    amount_usd_cents integer,
    amount_vnd integer NOT NULL,
    fx_vnd_per_usd integer,
    reference text NOT NULL,
    provider text DEFAULT 'mock'::text NOT NULL,
    state public."PaymentState" DEFAULT 'pending'::public."PaymentState" NOT NULL,
    paid_vnd integer,
    expires_at timestamp(3) without time zone NOT NULL,
    paid_at timestamp(3) without time zone,
    fulfilled_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.photos (
    id text NOT NULL,
    booking_id text NOT NULL,
    user_id text,
    type public."PhotoType" NOT NULL,
    scene_index integer,
    r2_key text,
    wavespeed_url text,
    is_stored boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: post_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_materials (
    id text NOT NULL,
    workspace_id text NOT NULL,
    r2_key text NOT NULL,
    kind text DEFAULT 'listing'::text NOT NULL,
    label text,
    note text,
    used_at timestamp(3) without time zone,
    archived_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    listing_id text,
    source_url text,
    width integer,
    height integer,
    tag text
);


--
-- Name: post_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_schedules (
    id text NOT NULL,
    workspace_id text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    weekdays integer[] DEFAULT ARRAY[2, 4, 6] NOT NULL,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    auto_fill boolean DEFAULT true NOT NULL,
    autopilot boolean DEFAULT false NOT NULL,
    buffer_days integer DEFAULT 14 NOT NULL,
    weekly_digest boolean DEFAULT true NOT NULL,
    ics_token text NOT NULL,
    last_filled_at timestamp(3) without time zone,
    last_generated_at timestamp(3) without time zone,
    paused_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: post_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.post_slots (
    id text NOT NULL,
    workspace_id text NOT NULL,
    schedule_id text,
    scheduled_for date NOT NULL,
    slot_of_day text DEFAULT 'evening'::text NOT NULL,
    item_id text,
    material_id text,
    product_id text,
    platform text DEFAULT 'instagram'::text NOT NULL,
    status text DEFAULT 'planned'::text NOT NULL,
    post_url text,
    posted_at timestamp(3) without time zone,
    caption_override text,
    source text DEFAULT 'auto'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    campaign_post_id text
);


--
-- Name: product_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_snapshots (
    id text NOT NULL,
    product_id text NOT NULL,
    sold_count integer,
    price_cents integer,
    captured_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id text NOT NULL,
    workspace_id text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    color_name text,
    sku text,
    fit text,
    notes text,
    front_r2_key text NOT NULL,
    back_r2_key text,
    detail_r2_key text,
    last_used_at timestamp(3) without time zone,
    archived_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    source text DEFAULT 'upload'::text NOT NULL,
    external_id text,
    external_url text,
    category_path text,
    description text,
    price_cents integer,
    currency text,
    sold_count integer,
    image_urls text[] DEFAULT '{}'::text[] NOT NULL,
    front_image_url text,
    variants jsonb,
    specifications jsonb,
    details_fetched_at timestamp(3) without time zone,
    imported_at timestamp(3) without time zone,
    last_synced_at timestamp(3) without time zone,
    post_kit jsonb,
    archived_by_seller boolean DEFAULT false NOT NULL
);


--
-- Name: promise_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promise_claims (
    id text NOT NULL,
    workspace_id text NOT NULL,
    user_id text NOT NULL,
    platform text NOT NULL,
    metric text NOT NULL,
    before_average integer NOT NULL,
    after_average integer NOT NULL,
    posts_counted integer NOT NULL,
    links text[] DEFAULT '{}'::text[] NOT NULL,
    note text,
    share_permission boolean DEFAULT false NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    outcome text NOT NULL,
    admin_note text,
    decided_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: promo_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id text NOT NULL,
    admin_email text DEFAULT 'giompanot@gmail.com'::text NOT NULL,
    chosen_photo_id text,
    rater_email text,
    is_claimed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    claimed_at timestamp with time zone
);


--
-- Name: prompts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompts (
    id text NOT NULL,
    route_id text NOT NULL,
    scene_index integer NOT NULL,
    prompt text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prompts_scene_index_check CHECK (((scene_index >= 0) AND (scene_index <= 4)))
);


--
-- Name: rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rate_limits (
    key text NOT NULL,
    window_start timestamp(3) without time zone NOT NULL,
    count integer DEFAULT 0 NOT NULL
);


--
-- Name: ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ratings (
    id integer NOT NULL,
    rater_id text NOT NULL,
    session_id text NOT NULL,
    displayed_order text NOT NULL,
    chosen_image text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ratings_id_seq OWNED BY public.ratings.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: set_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.set_templates (
    id text NOT NULL,
    product public."ProductLine" NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    cover_image text NOT NULL,
    config jsonb NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: shop_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_connections (
    id text NOT NULL,
    workspace_id text NOT NULL,
    platform text DEFAULT 'tiktok_shop'::text NOT NULL,
    source text NOT NULL,
    shop_url text,
    external_shop_id text,
    shop_name text,
    shop_logo_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    run_id text,
    product_count integer DEFAULT 0 NOT NULL,
    total_sold integer,
    last_synced_at timestamp(3) without time zone,
    next_sync_at timestamp(3) without time zone,
    error text,
    owner_attested_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: social_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_connections (
    id text NOT NULL,
    workspace_id text NOT NULL,
    provider text NOT NULL,
    external_id text NOT NULL,
    username text,
    avatar_url text,
    access_token text NOT NULL,
    refresh_token text,
    expires_at timestamp(3) without time zone,
    refresh_expires_at timestamp(3) without time zone,
    scopes text[] DEFAULT ARRAY[]::text[] NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: social_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_posts (
    id text NOT NULL,
    workspace_id text NOT NULL,
    slot_id text,
    provider text NOT NULL,
    status text NOT NULL,
    external_id text,
    post_url text,
    error text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: studio_brand_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studio_brand_profiles (
    id text NOT NULL,
    workspace_id text,
    source_url text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    crawl jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: studio_candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studio_candidates (
    id text NOT NULL,
    run_id text NOT NULL,
    research_item_id text,
    engine text DEFAULT 'blitz_slideshow'::text NOT NULL,
    template_id text,
    angle text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    cost_breakdown jsonb DEFAULT '{}'::jsonb NOT NULL,
    cost_usd_micros bigint,
    generate_duration_ms integer,
    profile_version integer DEFAULT 1 NOT NULL,
    status public.studio_candidate_status DEFAULT 'pending'::public.studio_candidate_status NOT NULL,
    reject_reason public.studio_reject_reason,
    reject_note text,
    blitz_project_id text,
    slot_date timestamp(3) without time zone,
    guardrail_warnings jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: studio_research_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studio_research_cache (
    id text NOT NULL,
    cache_type public.studio_cache_type DEFAULT 'keyword'::public.studio_cache_type NOT NULL,
    cache_key text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: studio_research_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studio_research_items (
    id text NOT NULL,
    run_id text NOT NULL,
    keyword text NOT NULL,
    source_url text NOT NULL,
    author text,
    duration_seconds integer,
    stats jsonb DEFAULT '{}'::jsonb NOT NULL,
    hook text,
    transcript text,
    template_id text,
    variables jsonb DEFAULT '{}'::jsonb NOT NULL,
    selected boolean DEFAULT false NOT NULL,
    excluded boolean DEFAULT false NOT NULL,
    excluded_reason public.studio_exclude_reason,
    fetch_duration_ms integer,
    transcript_cost_usd_micros bigint,
    is_competitor boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: studio_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studio_runs (
    id text NOT NULL,
    workspace_id text,
    brand_profile_id text NOT NULL,
    step public.studio_step DEFAULT 'profile'::public.studio_step NOT NULL,
    cadence jsonb DEFAULT '{"weekdays": ["mon", "wed", "fri"], "postsPerWeek": 3}'::jsonb NOT NULL,
    extract_status public.studio_job_status DEFAULT 'idle'::public.studio_job_status NOT NULL,
    extract_error text,
    research_status public.studio_job_status DEFAULT 'idle'::public.studio_job_status NOT NULL,
    research_error text,
    generate_status public.studio_job_status DEFAULT 'idle'::public.studio_job_status NOT NULL,
    generate_error text,
    extract_duration_ms integer,
    research_duration_ms integer,
    generate_duration_ms integer,
    extract_cost_usd_micros bigint,
    research_cost_usd_micros bigint,
    created_by text DEFAULT 'admin'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: studio_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studio_sets (
    id text NOT NULL,
    workspace_id text NOT NULL,
    template_id text NOT NULL,
    name text NOT NULL,
    locations text[],
    wardrobe text,
    pose_energy text,
    brand_colors text[] DEFAULT ARRAY[]::text[],
    model_ref text,
    status public."SetStatus" DEFAULT 'active'::public."SetStatus" NOT NULL,
    cover_r2_key text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    influencer_id character varying(30)
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id text NOT NULL,
    workspace_id text NOT NULL,
    plan_id text NOT NULL,
    term_months integer NOT NULL,
    status public."SubscriptionStatus" DEFAULT 'pending'::public."SubscriptionStatus" NOT NULL,
    starts_at timestamp(3) without time zone,
    ends_at timestamp(3) without time zone,
    next_grant_at timestamp(3) without time zone,
    grants_issued integer DEFAULT 0 NOT NULL,
    payment_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: template_asset_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_asset_requirements (
    id text NOT NULL,
    version_id text NOT NULL,
    kind public.asset_kind NOT NULL,
    required boolean DEFAULT true NOT NULL,
    min_count integer DEFAULT 1 NOT NULL,
    fulfilment public.asset_fulfilment DEFAULT 'upload'::public.asset_fulfilment NOT NULL,
    notes text
);


--
-- Name: template_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_usages (
    id text NOT NULL,
    workspace_id text NOT NULL,
    template_id text NOT NULL,
    version_id text NOT NULL,
    purpose public.content_purpose NOT NULL,
    planned_for timestamp(3) without time zone NOT NULL,
    campaign_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: template_variables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_variables (
    id text NOT NULL,
    version_id text NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    type public.template_variable_type DEFAULT 'text'::public.template_variable_type NOT NULL,
    source public.template_variable_source DEFAULT 'campaign'::public.template_variable_source NOT NULL,
    required boolean DEFAULT true NOT NULL,
    default_value text,
    hint text,
    "position" integer DEFAULT 0 NOT NULL
);


--
-- Name: themes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.themes (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    cover_image text NOT NULL,
    scenes jsonb NOT NULL,
    featured_month text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: ugc_characters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ugc_characters (
    id text NOT NULL,
    kind text NOT NULL,
    image_key text NOT NULL,
    model text,
    scene jsonb,
    archived boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    portrait_json jsonb,
    workspace_id text
);


--
-- Name: ugc_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ugc_videos (
    id text NOT NULL,
    character_id text,
    mode text NOT NULL,
    script text NOT NULL,
    prompt text DEFAULT ''::text NOT NULL,
    duration_sec integer NOT NULL,
    resolution text NOT NULL,
    provider_task_id text,
    status text DEFAULT 'generating'::text NOT NULL,
    raw_key text,
    captioned_key text,
    transcript text,
    error text,
    last_poll_error text,
    estimated_cost_usd_micros integer DEFAULT 0 NOT NULL,
    submitted_at timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    cost_usd_micros integer DEFAULT 0 NOT NULL,
    last_checked_at timestamp(3) without time zone,
    generation_seconds integer,
    timing_precise boolean DEFAULT false NOT NULL,
    provider text DEFAULT 'reapi'::text NOT NULL,
    workspace_id text
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    display_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    active_offer_percent integer,
    active_offer_label text,
    active_offer_route_ids text[] DEFAULT '{}'::text[] NOT NULL
);


--
-- Name: workspace_angles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_angles (
    id text NOT NULL,
    workspace_id text NOT NULL,
    label character varying(100) NOT NULL,
    weight integer DEFAULT 33 NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    source text DEFAULT 'ai'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workspaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspaces (
    id text NOT NULL,
    owner_user_id text NOT NULL,
    product public."ProductLine" NOT NULL,
    name text NOT NULL,
    industry text,
    handle text,
    brand_colors text[] DEFAULT ARRAY[]::text[],
    visible_ai_tag boolean DEFAULT false NOT NULL,
    default_formats text[] DEFAULT ARRAY[]::text[],
    trial_used_at timestamp(3) without time zone,
    onboarding_step integer DEFAULT 0 NOT NULL,
    onboarding_completed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    team_size character varying(20),
    monthly_revenue character varying(20),
    ob_role character varying(50),
    signup_intent character varying(50),
    goals text[] DEFAULT '{}'::text[] NOT NULL,
    attribution text[] DEFAULT '{}'::text[] NOT NULL,
    website_url text,
    mention_frequency text DEFAULT 'sometimes'::text NOT NULL,
    gender_filter text,
    angles_gen_state text DEFAULT 'idle'::text NOT NULL,
    angles_gen_at timestamp with time zone,
    audience_type public.audience_type,
    promoting text,
    offer text,
    positioning text,
    geography text
);


--
-- Name: ratings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings ALTER COLUMN id SET DEFAULT nextval('public.ratings_id_seq'::regclass);


--
-- Name: admin_audit_logs admin_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_logs
    ADD CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bank_transactions bank_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_pkey PRIMARY KEY (id);


--
-- Name: batch_items batch_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_items
    ADD CONSTRAINT batch_items_pkey PRIMARY KEY (id);


--
-- Name: batches batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_pkey PRIMARY KEY (id);


--
-- Name: blitz_assets blitz_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blitz_assets
    ADD CONSTRAINT blitz_assets_pkey PRIMARY KEY (id);


--
-- Name: blitz_assets blitz_assets_r2_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blitz_assets
    ADD CONSTRAINT blitz_assets_r2_key_key UNIQUE (r2_key);


--
-- Name: blitz_projects blitz_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blitz_projects
    ADD CONSTRAINT blitz_projects_pkey PRIMARY KEY (id);


--
-- Name: blitz_templates blitz_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blitz_templates
    ADD CONSTRAINT blitz_templates_pkey PRIMARY KEY (id);


--
-- Name: booking_regenerations booking_regenerations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_regenerations
    ADD CONSTRAINT booking_regenerations_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: campaign_posts campaign_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_posts
    ADD CONSTRAINT campaign_posts_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: clone_videos clone_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clone_videos
    ADD CONSTRAINT clone_videos_pkey PRIMARY KEY (id);


--
-- Name: consent_records consent_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_pkey PRIMARY KEY (id);


--
-- Name: content_pillars content_pillars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_pillars
    ADD CONSTRAINT content_pillars_pkey PRIMARY KEY (id);


--
-- Name: content_template_versions content_template_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_template_versions
    ADD CONSTRAINT content_template_versions_pkey PRIMARY KEY (id);


--
-- Name: content_templates content_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_templates
    ADD CONSTRAINT content_templates_pkey PRIMARY KEY (id);


--
-- Name: credit_ledger credit_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_ledger
    ADD CONSTRAINT credit_ledger_pkey PRIMARY KEY (id);


--
-- Name: drop_schedules drop_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drop_schedules
    ADD CONSTRAINT drop_schedules_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: identity_references identity_references_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_references
    ADD CONSTRAINT identity_references_pkey PRIMARY KEY (id);


--
-- Name: influencer_gallery_items influencer_gallery_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.influencer_gallery_items
    ADD CONSTRAINT influencer_gallery_items_pkey PRIMARY KEY (id);


--
-- Name: influencers influencers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.influencers
    ADD CONSTRAINT influencers_pkey PRIMARY KEY (id);


--
-- Name: listing_packs listing_packs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_packs
    ADD CONSTRAINT listing_packs_pkey PRIMARY KEY (id);


--
-- Name: listings listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_pkey PRIMARY KEY (id);


--
-- Name: model_test_items model_test_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_test_items
    ADD CONSTRAINT model_test_items_pkey PRIMARY KEY (id);


--
-- Name: model_test_runs model_test_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_test_runs
    ADD CONSTRAINT model_test_runs_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: photos photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_pkey PRIMARY KEY (id);


--
-- Name: post_materials post_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_materials
    ADD CONSTRAINT post_materials_pkey PRIMARY KEY (id);


--
-- Name: post_schedules post_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_schedules
    ADD CONSTRAINT post_schedules_pkey PRIMARY KEY (id);


--
-- Name: post_slots post_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_slots
    ADD CONSTRAINT post_slots_pkey PRIMARY KEY (id);


--
-- Name: product_snapshots product_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_snapshots
    ADD CONSTRAINT product_snapshots_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: promise_claims promise_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promise_claims
    ADD CONSTRAINT promise_claims_pkey PRIMARY KEY (id);


--
-- Name: promo_sessions promo_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_sessions
    ADD CONSTRAINT promo_sessions_pkey PRIMARY KEY (id);


--
-- Name: prompts prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompts
    ADD CONSTRAINT prompts_pkey PRIMARY KEY (id);


--
-- Name: prompts prompts_route_id_scene_index_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompts
    ADD CONSTRAINT prompts_route_id_scene_index_key UNIQUE (route_id, scene_index);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (key, window_start);


--
-- Name: ratings ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: set_templates set_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.set_templates
    ADD CONSTRAINT set_templates_pkey PRIMARY KEY (id);


--
-- Name: shop_connections shop_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_connections
    ADD CONSTRAINT shop_connections_pkey PRIMARY KEY (id);


--
-- Name: social_connections social_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_connections
    ADD CONSTRAINT social_connections_pkey PRIMARY KEY (id);


--
-- Name: social_posts social_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_pkey PRIMARY KEY (id);


--
-- Name: studio_brand_profiles studio_brand_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_brand_profiles
    ADD CONSTRAINT studio_brand_profiles_pkey PRIMARY KEY (id);


--
-- Name: studio_candidates studio_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_candidates
    ADD CONSTRAINT studio_candidates_pkey PRIMARY KEY (id);


--
-- Name: studio_research_cache studio_research_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_research_cache
    ADD CONSTRAINT studio_research_cache_pkey PRIMARY KEY (id);


--
-- Name: studio_research_items studio_research_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_research_items
    ADD CONSTRAINT studio_research_items_pkey PRIMARY KEY (id);


--
-- Name: studio_runs studio_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_runs
    ADD CONSTRAINT studio_runs_pkey PRIMARY KEY (id);


--
-- Name: studio_sets studio_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_sets
    ADD CONSTRAINT studio_sets_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: template_asset_requirements template_asset_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_asset_requirements
    ADD CONSTRAINT template_asset_requirements_pkey PRIMARY KEY (id);


--
-- Name: template_usages template_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_usages
    ADD CONSTRAINT template_usages_pkey PRIMARY KEY (id);


--
-- Name: template_variables template_variables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_variables
    ADD CONSTRAINT template_variables_pkey PRIMARY KEY (id);


--
-- Name: themes themes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.themes
    ADD CONSTRAINT themes_pkey PRIMARY KEY (id);


--
-- Name: ugc_characters ugc_characters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ugc_characters
    ADD CONSTRAINT ugc_characters_pkey PRIMARY KEY (id);


--
-- Name: ugc_videos ugc_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ugc_videos
    ADD CONSTRAINT ugc_videos_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: workspace_angles workspace_angles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_angles
    ADD CONSTRAINT workspace_angles_pkey PRIMARY KEY (id);


--
-- Name: workspaces workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);


--
-- Name: admin_audit_logs_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_audit_logs_target_idx ON public.admin_audit_logs USING btree (target_type, target_id);


--
-- Name: bank_transactions_match_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bank_transactions_match_status_idx ON public.bank_transactions USING btree (match_status);


--
-- Name: bank_transactions_provider_provider_txn_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX bank_transactions_provider_provider_txn_id_key ON public.bank_transactions USING btree (provider, provider_txn_id);


--
-- Name: batch_items_batch_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX batch_items_batch_id_idx ON public.batch_items USING btree (batch_id);


--
-- Name: batch_items_status_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX batch_items_status_created_at_idx ON public.batch_items USING btree (status, created_at);


--
-- Name: batch_items_wavespeed_task_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX batch_items_wavespeed_task_id_idx ON public.batch_items USING btree (wavespeed_task_id);


--
-- Name: batches_set_id_preview_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX batches_set_id_preview_idx ON public.batches USING btree (set_id, preview);


--
-- Name: batches_workspace_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX batches_workspace_id_created_at_idx ON public.batches USING btree (workspace_id, created_at);


--
-- Name: blitz_assets_tags_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blitz_assets_tags_gin ON public.blitz_assets USING gin (tags);


--
-- Name: blitz_assets_workspace_id_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blitz_assets_workspace_id_type_idx ON public.blitz_assets USING btree (workspace_id, type);


--
-- Name: blitz_projects_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blitz_projects_created_at_idx ON public.blitz_projects USING btree (created_at DESC);


--
-- Name: blitz_projects_render_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blitz_projects_render_status_idx ON public.blitz_projects USING btree (render_status);


--
-- Name: blitz_projects_workspace_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX blitz_projects_workspace_id_created_at_idx ON public.blitz_projects USING btree (workspace_id, created_at DESC);


--
-- Name: booking_regenerations_booking_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX booking_regenerations_booking_id_idx ON public.booking_regenerations USING btree (booking_id);


--
-- Name: campaign_posts_campaign_id_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX campaign_posts_campaign_id_position_idx ON public.campaign_posts USING btree (campaign_id, "position");


--
-- Name: campaigns_workspace_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX campaigns_workspace_id_created_at_idx ON public.campaigns USING btree (workspace_id, created_at DESC);


--
-- Name: campaigns_workspace_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX campaigns_workspace_id_status_idx ON public.campaigns USING btree (workspace_id, status);


--
-- Name: clone_videos_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clone_videos_created_at_idx ON public.clone_videos USING btree (created_at DESC);


--
-- Name: clone_videos_poyo_task_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX clone_videos_poyo_task_id_key ON public.clone_videos USING btree (poyo_task_id);


--
-- Name: clone_videos_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clone_videos_status_idx ON public.clone_videos USING btree (status);


--
-- Name: clone_videos_workspace_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clone_videos_workspace_id_created_at_idx ON public.clone_videos USING btree (workspace_id, created_at DESC);


--
-- Name: consent_records_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX consent_records_user_id_idx ON public.consent_records USING btree (user_id);


--
-- Name: content_pillars_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX content_pillars_slug_key ON public.content_pillars USING btree (slug);


--
-- Name: content_template_versions_template_id_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX content_template_versions_template_id_version_key ON public.content_template_versions USING btree (template_id, version);


--
-- Name: content_templates_legacy_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX content_templates_legacy_id_idx ON public.content_templates USING btree (legacy_id);


--
-- Name: content_templates_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX content_templates_slug_key ON public.content_templates USING btree (slug);


--
-- Name: content_templates_workspace_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX content_templates_workspace_id_status_idx ON public.content_templates USING btree (workspace_id, status);


--
-- Name: credit_ledger_grant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_ledger_grant_id_idx ON public.credit_ledger USING btree (grant_id);


--
-- Name: credit_ledger_reason_bucket_ref_type_ref_id_grant_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX credit_ledger_reason_bucket_ref_type_ref_id_grant_id_key ON public.credit_ledger USING btree (reason, bucket, ref_type, ref_id, grant_id) NULLS NOT DISTINCT;


--
-- Name: credit_ledger_workspace_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_ledger_workspace_id_created_at_idx ON public.credit_ledger USING btree (workspace_id, created_at);


--
-- Name: drop_schedules_active_next_run_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX drop_schedules_active_next_run_at_idx ON public.drop_schedules USING btree (active, next_run_at);


--
-- Name: drop_schedules_workspace_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX drop_schedules_workspace_id_key ON public.drop_schedules USING btree (workspace_id);


--
-- Name: email_logs_dedupe_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX email_logs_dedupe_key_key ON public.email_logs USING btree (dedupe_key);


--
-- Name: email_logs_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_logs_user_id_idx ON public.email_logs USING btree (user_id);


--
-- Name: identity_references_studio_model_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_references_studio_model_slug_idx ON public.identity_references USING btree (studio_model_slug);


--
-- Name: identity_references_workspace_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX identity_references_workspace_id_idx ON public.identity_references USING btree (workspace_id);


--
-- Name: idx_bookings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_user_id ON public.bookings USING btree (user_id);


--
-- Name: idx_bookings_wavespeed_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_wavespeed_task_id ON public.bookings USING btree (wavespeed_task_id);


--
-- Name: idx_photos_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_photos_booking_id ON public.photos USING btree (booking_id);


--
-- Name: idx_photos_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_photos_user_id ON public.photos USING btree (user_id);


--
-- Name: idx_prompts_route_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompts_route_id ON public.prompts USING btree (route_id);


--
-- Name: influencers_workspace_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX influencers_workspace_id_idx ON public.influencers USING btree (workspace_id);


--
-- Name: listing_packs_product_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX listing_packs_product_id_key ON public.listing_packs USING btree (product_id);


--
-- Name: listing_packs_workspace_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listing_packs_workspace_id_status_idx ON public.listing_packs USING btree (workspace_id, status);


--
-- Name: listings_run_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_run_id_idx ON public.listings USING btree (run_id);


--
-- Name: listings_workspace_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX listings_workspace_id_created_at_idx ON public.listings USING btree (workspace_id, created_at);


--
-- Name: listings_workspace_id_zpid_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX listings_workspace_id_zpid_key ON public.listings USING btree (workspace_id, zpid);


--
-- Name: model_test_items_run_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_test_items_run_id_idx ON public.model_test_items USING btree (run_id);


--
-- Name: payments_reference_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payments_reference_key ON public.payments USING btree (reference);


--
-- Name: payments_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_user_id_created_at_idx ON public.payments USING btree (user_id, created_at);


--
-- Name: payments_workspace_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_workspace_id_created_at_idx ON public.payments USING btree (workspace_id, created_at);


--
-- Name: post_materials_listing_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_materials_listing_id_idx ON public.post_materials USING btree (listing_id);


--
-- Name: post_materials_workspace_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_materials_workspace_id_created_at_idx ON public.post_materials USING btree (workspace_id, created_at);


--
-- Name: post_schedules_ics_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX post_schedules_ics_token_key ON public.post_schedules USING btree (ics_token);


--
-- Name: post_schedules_workspace_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX post_schedules_workspace_id_key ON public.post_schedules USING btree (workspace_id);


--
-- Name: post_slots_campaign_post_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_slots_campaign_post_id_idx ON public.post_slots USING btree (campaign_post_id);


--
-- Name: post_slots_item_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_slots_item_id_idx ON public.post_slots USING btree (item_id);


--
-- Name: post_slots_workspace_id_item_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX post_slots_workspace_id_item_id_key ON public.post_slots USING btree (workspace_id, item_id) WHERE (item_id IS NOT NULL);


--
-- Name: post_slots_workspace_id_scheduled_for_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_slots_workspace_id_scheduled_for_idx ON public.post_slots USING btree (workspace_id, scheduled_for);


--
-- Name: post_slots_workspace_id_status_posted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX post_slots_workspace_id_status_posted_at_idx ON public.post_slots USING btree (workspace_id, status, posted_at);


--
-- Name: product_snapshots_product_id_captured_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_snapshots_product_id_captured_at_idx ON public.product_snapshots USING btree (product_id, captured_at);


--
-- Name: products_workspace_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_workspace_id_idx ON public.products USING btree (workspace_id);


--
-- Name: products_workspace_id_source_external_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_workspace_id_source_external_id_key ON public.products USING btree (workspace_id, source, external_id);


--
-- Name: promise_claims_status_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promise_claims_status_created_at_idx ON public.promise_claims USING btree (status, created_at);


--
-- Name: promise_claims_workspace_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promise_claims_workspace_id_idx ON public.promise_claims USING btree (workspace_id);


--
-- Name: ratings_rater_session; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ratings_rater_session ON public.ratings USING btree (rater_id, session_id);


--
-- Name: shop_connections_status_next_sync_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_connections_status_next_sync_at_idx ON public.shop_connections USING btree (status, next_sync_at);


--
-- Name: shop_connections_workspace_id_platform_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX shop_connections_workspace_id_platform_key ON public.shop_connections USING btree (workspace_id, platform);


--
-- Name: social_connections_workspace_id_provider_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX social_connections_workspace_id_provider_key ON public.social_connections USING btree (workspace_id, provider);


--
-- Name: social_posts_workspace_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX social_posts_workspace_id_created_at_idx ON public.social_posts USING btree (workspace_id, created_at);


--
-- Name: studio_brand_profiles_workspace_id_source_url_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX studio_brand_profiles_workspace_id_source_url_version_idx ON public.studio_brand_profiles USING btree (workspace_id, source_url, version DESC);


--
-- Name: studio_candidates_run_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX studio_candidates_run_id_status_idx ON public.studio_candidates USING btree (run_id, status);


--
-- Name: studio_research_cache_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX studio_research_cache_expires_at_idx ON public.studio_research_cache USING btree (expires_at);


--
-- Name: studio_research_cache_type_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX studio_research_cache_type_key_idx ON public.studio_research_cache USING btree (cache_type, cache_key);


--
-- Name: studio_research_items_run_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX studio_research_items_run_id_idx ON public.studio_research_items USING btree (run_id);


--
-- Name: studio_runs_extract_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX studio_runs_extract_status_idx ON public.studio_runs USING btree (extract_status) WHERE (extract_status = ANY (ARRAY['pending'::public.studio_job_status, 'running'::public.studio_job_status]));


--
-- Name: studio_runs_generate_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX studio_runs_generate_status_idx ON public.studio_runs USING btree (generate_status) WHERE (generate_status = ANY (ARRAY['pending'::public.studio_job_status, 'running'::public.studio_job_status]));


--
-- Name: studio_runs_research_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX studio_runs_research_status_idx ON public.studio_runs USING btree (research_status) WHERE (research_status = ANY (ARRAY['pending'::public.studio_job_status, 'running'::public.studio_job_status]));


--
-- Name: studio_runs_workspace_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX studio_runs_workspace_id_created_at_idx ON public.studio_runs USING btree (workspace_id, created_at DESC);


--
-- Name: studio_sets_influencer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX studio_sets_influencer_id_idx ON public.studio_sets USING btree (influencer_id);


--
-- Name: studio_sets_workspace_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX studio_sets_workspace_id_idx ON public.studio_sets USING btree (workspace_id);


--
-- Name: subscriptions_next_grant_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_next_grant_at_idx ON public.subscriptions USING btree (next_grant_at);


--
-- Name: subscriptions_payment_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subscriptions_payment_id_key ON public.subscriptions USING btree (payment_id);


--
-- Name: subscriptions_workspace_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_workspace_id_status_idx ON public.subscriptions USING btree (workspace_id, status);


--
-- Name: template_asset_requirements_version_id_kind_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX template_asset_requirements_version_id_kind_key ON public.template_asset_requirements USING btree (version_id, kind);


--
-- Name: template_usages_workspace_id_planned_for_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX template_usages_workspace_id_planned_for_idx ON public.template_usages USING btree (workspace_id, planned_for);


--
-- Name: template_usages_workspace_id_template_id_planned_for_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX template_usages_workspace_id_template_id_planned_for_idx ON public.template_usages USING btree (workspace_id, template_id, planned_for);


--
-- Name: template_variables_version_id_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX template_variables_version_id_key_key ON public.template_variables USING btree (version_id, key);


--
-- Name: ugc_characters_kind_archived_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ugc_characters_kind_archived_idx ON public.ugc_characters USING btree (kind, archived);


--
-- Name: ugc_characters_workspace_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ugc_characters_workspace_id_created_at_idx ON public.ugc_characters USING btree (workspace_id, created_at DESC);


--
-- Name: ugc_videos_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ugc_videos_created_at_idx ON public.ugc_videos USING btree (created_at);


--
-- Name: ugc_videos_provider_task_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ugc_videos_provider_task_id_key ON public.ugc_videos USING btree (provider_task_id);


--
-- Name: ugc_videos_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ugc_videos_status_idx ON public.ugc_videos USING btree (status);


--
-- Name: ugc_videos_workspace_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ugc_videos_workspace_id_created_at_idx ON public.ugc_videos USING btree (workspace_id, created_at DESC);


--
-- Name: workspace_angles_workspace_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workspace_angles_workspace_id_idx ON public.workspace_angles USING btree (workspace_id);


--
-- Name: workspaces_owner_user_id_product_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX workspaces_owner_user_id_product_key ON public.workspaces USING btree (owner_user_id, product);


--
-- Name: bookings trg_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: prompts trg_prompts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prompts_updated_at BEFORE UPDATE ON public.prompts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: batch_items batch_items_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_items
    ADD CONSTRAINT batch_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: batch_items batch_items_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_items
    ADD CONSTRAINT batch_items_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.post_materials(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: batch_items batch_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_items
    ADD CONSTRAINT batch_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: batches batches_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: batches batches_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.studio_sets(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: batches batches_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.themes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: batches batches_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: blitz_assets blitz_assets_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blitz_assets
    ADD CONSTRAINT blitz_assets_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: blitz_projects blitz_projects_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blitz_projects
    ADD CONSTRAINT blitz_projects_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.blitz_templates(id);


--
-- Name: blitz_projects blitz_projects_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blitz_projects
    ADD CONSTRAINT blitz_projects_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: booking_regenerations booking_regenerations_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_regenerations
    ADD CONSTRAINT booking_regenerations_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: campaign_posts campaign_posts_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_posts
    ADD CONSTRAINT campaign_posts_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: campaign_posts campaign_posts_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_posts
    ADD CONSTRAINT campaign_posts_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.content_templates(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: campaign_posts campaign_posts_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_posts
    ADD CONSTRAINT campaign_posts_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.content_template_versions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: campaigns campaigns_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: campaigns campaigns_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: campaigns campaigns_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: clone_videos clone_videos_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clone_videos
    ADD CONSTRAINT clone_videos_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: consent_records consent_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: content_template_versions content_template_versions_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_template_versions
    ADD CONSTRAINT content_template_versions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.content_templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: content_templates content_templates_active_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_templates
    ADD CONSTRAINT content_templates_active_version_id_fkey FOREIGN KEY (active_version_id) REFERENCES public.content_template_versions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: content_templates content_templates_parent_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_templates
    ADD CONSTRAINT content_templates_parent_template_id_fkey FOREIGN KEY (parent_template_id) REFERENCES public.content_templates(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: content_templates content_templates_pillar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_templates
    ADD CONSTRAINT content_templates_pillar_id_fkey FOREIGN KEY (pillar_id) REFERENCES public.content_pillars(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: content_templates content_templates_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_templates
    ADD CONSTRAINT content_templates_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: credit_ledger credit_ledger_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_ledger
    ADD CONSTRAINT credit_ledger_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: drop_schedules drop_schedules_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drop_schedules
    ADD CONSTRAINT drop_schedules_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: identity_references identity_references_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.identity_references
    ADD CONSTRAINT identity_references_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: influencers influencers_gallery_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.influencers
    ADD CONSTRAINT influencers_gallery_item_id_fkey FOREIGN KEY (gallery_item_id) REFERENCES public.influencer_gallery_items(id);


--
-- Name: influencers influencers_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.influencers
    ADD CONSTRAINT influencers_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);


--
-- Name: listing_packs listing_packs_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_packs
    ADD CONSTRAINT listing_packs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: listing_packs listing_packs_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_packs
    ADD CONSTRAINT listing_packs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: listings listings_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: model_test_items model_test_items_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_test_items
    ADD CONSTRAINT model_test_items_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.model_test_runs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: payments payments_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: photos photos_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: photos photos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: post_materials post_materials_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_materials
    ADD CONSTRAINT post_materials_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: post_materials post_materials_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_materials
    ADD CONSTRAINT post_materials_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: post_schedules post_schedules_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_schedules
    ADD CONSTRAINT post_schedules_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: post_slots post_slots_campaign_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_slots
    ADD CONSTRAINT post_slots_campaign_post_id_fkey FOREIGN KEY (campaign_post_id) REFERENCES public.campaign_posts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: post_slots post_slots_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_slots
    ADD CONSTRAINT post_slots_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.batch_items(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: post_slots post_slots_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_slots
    ADD CONSTRAINT post_slots_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.post_materials(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: post_slots post_slots_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_slots
    ADD CONSTRAINT post_slots_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: post_slots post_slots_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_slots
    ADD CONSTRAINT post_slots_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.post_schedules(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: post_slots post_slots_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_slots
    ADD CONSTRAINT post_slots_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: product_snapshots product_snapshots_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_snapshots
    ADD CONSTRAINT product_snapshots_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: products products_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: promise_claims promise_claims_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promise_claims
    ADD CONSTRAINT promise_claims_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: shop_connections shop_connections_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_connections
    ADD CONSTRAINT shop_connections_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: social_connections social_connections_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_connections
    ADD CONSTRAINT social_connections_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: social_posts social_posts_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.post_slots(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: social_posts social_posts_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_posts
    ADD CONSTRAINT social_posts_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: studio_brand_profiles studio_brand_profiles_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_brand_profiles
    ADD CONSTRAINT studio_brand_profiles_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: studio_candidates studio_candidates_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_candidates
    ADD CONSTRAINT studio_candidates_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.studio_runs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: studio_research_items studio_research_items_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_research_items
    ADD CONSTRAINT studio_research_items_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.studio_runs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: studio_runs studio_runs_brand_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_runs
    ADD CONSTRAINT studio_runs_brand_profile_id_fkey FOREIGN KEY (brand_profile_id) REFERENCES public.studio_brand_profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: studio_runs studio_runs_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_runs
    ADD CONSTRAINT studio_runs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: studio_sets studio_sets_influencer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_sets
    ADD CONSTRAINT studio_sets_influencer_id_fkey FOREIGN KEY (influencer_id) REFERENCES public.influencers(id);


--
-- Name: studio_sets studio_sets_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_sets
    ADD CONSTRAINT studio_sets_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.set_templates(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: studio_sets studio_sets_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_sets
    ADD CONSTRAINT studio_sets_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: subscriptions subscriptions_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: template_asset_requirements template_asset_requirements_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_asset_requirements
    ADD CONSTRAINT template_asset_requirements_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.content_template_versions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_usages template_usages_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_usages
    ADD CONSTRAINT template_usages_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: template_usages template_usages_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_usages
    ADD CONSTRAINT template_usages_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.content_templates(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_usages template_usages_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_usages
    ADD CONSTRAINT template_usages_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.content_template_versions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_usages template_usages_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_usages
    ADD CONSTRAINT template_usages_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: template_variables template_variables_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_variables
    ADD CONSTRAINT template_variables_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.content_template_versions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ugc_characters ugc_characters_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ugc_characters
    ADD CONSTRAINT ugc_characters_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ugc_videos ugc_videos_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ugc_videos
    ADD CONSTRAINT ugc_videos_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.ugc_characters(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ugc_videos ugc_videos_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ugc_videos
    ADD CONSTRAINT ugc_videos_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workspace_angles workspace_angles_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_angles
    ADD CONSTRAINT workspace_angles_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspaces workspaces_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20260829000000'),
    ('20260829083650'),
    ('20260831000000'),
    ('20260831130000'),
    ('20260901180000'),
    ('20260902000000'),
    ('20260902120000'),
    ('20260914090000'),
    ('20260914120000'),
    ('20260914150000'),
    ('20260914160000'),
    ('20260914170000'),
    ('20260915090000'),
    ('20260916090000'),
    ('20260916120000'),
    ('20260916150000'),
    ('20260917090000'),
    ('20260917120000'),
    ('20260918090000'),
    ('20260919090000'),
    ('20260920090000'),
    ('20260920120000'),
    ('20260920200000'),
    ('20260921090000'),
    ('20260922090000'),
    ('20260923090000'),
    ('20260924090000'),
    ('20260925090000'),
    ('20260926090000'),
    ('20260927090000'),
    ('20260928000000'),
    ('20260929090000'),
    ('20260930090000'),
    ('20261001090000'),
    ('20261002090000'),
    ('20261003090000'),
    ('20261004090000'),
    ('20261005090000'),
    ('20261006090000'),
    ('20261007090000'),
    ('20261008090000'),
    ('20261009090000'),
    ('20261010090000'),
    ('20261011090000'),
    ('20261012090000'),
    ('20261012100000');
