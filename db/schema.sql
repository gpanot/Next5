\restrict dbmate

-- Dumped from database version 16.14 (Homebrew)
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
    occasion text
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
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
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
    updated_at timestamp(3) without time zone NOT NULL
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
    updated_at timestamp(3) without time zone NOT NULL
);


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
-- Name: consent_records consent_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_pkey PRIMARY KEY (id);


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
-- Name: themes themes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.themes
    ADD CONSTRAINT themes_pkey PRIMARY KEY (id);


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
-- Name: batches_workspace_id_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX batches_workspace_id_created_at_idx ON public.batches USING btree (workspace_id, created_at);


--
-- Name: booking_regenerations_booking_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX booking_regenerations_booking_id_idx ON public.booking_regenerations USING btree (booking_id);


--
-- Name: consent_records_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX consent_records_user_id_idx ON public.consent_records USING btree (user_id);


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
-- Name: shop_connections_status_next_sync_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_connections_status_next_sync_at_idx ON public.shop_connections USING btree (status, next_sync_at);


--
-- Name: shop_connections_workspace_id_platform_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX shop_connections_workspace_id_platform_key ON public.shop_connections USING btree (workspace_id, platform);


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
-- Name: consent_records consent_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


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
    ('20260921090000'),
    ('20260922090000'),
    ('20260923090000'),
    ('20260924090000');
