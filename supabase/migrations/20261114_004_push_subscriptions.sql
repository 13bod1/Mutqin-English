-- Migration 004: Push Notification Subscriptions with strict RLS and SSRF-safe endpoint validation
-- PR-only delivery. Compatible with Postgres 15+ / Supabase.

BEGIN;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT push_endpoint_https CHECK (endpoint ~ '^https://[a-zA-Z0-9.-]+(/.*)?$'),
    CONSTRAINT push_keys_nonempty CHECK (length(p256dh) >= 16 AND length(auth) >= 12)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Revoke default public access
REVOKE ALL ON public.push_subscriptions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
GRANT SELECT, DELETE ON public.push_subscriptions TO authenticated;

-- Policies: users can only view their own subscriptions; admin/super_admin can view all
DROP POLICY IF EXISTS push_subscriptions_select_policy ON public.push_subscriptions;
CREATE POLICY push_subscriptions_select_policy ON public.push_subscriptions
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS push_subscriptions_delete_policy ON public.push_subscriptions;
CREATE POLICY push_subscriptions_delete_policy ON public.push_subscriptions
    FOR DELETE TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- RPC: Register push subscription bound to caller auth.uid()
-- Prevents spoofing student_id or injecting arbitrary user IDs.
-- Enforces approved push hosts (FCM, Mozilla, Apple, Windows).
CREATE OR REPLACE FUNCTION public.register_push_subscription(
    p_endpoint TEXT,
    p_p256dh TEXT,
    p_auth TEXT,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_record_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    -- Validate input nullability
    IF p_endpoint IS NULL OR p_p256dh IS NULL OR p_auth IS NULL THEN
        RAISE EXCEPTION 'Endpoint, p256dh, and auth are required' USING ERRCODE = '22023';
    END IF;

    IF length(p_endpoint) > 4096 OR p_p256dh !~ '^[A-Za-z0-9_+/=-]{80,100}$' OR p_auth !~ '^[A-Za-z0-9_+/=-]{20,32}$' THEN
        RAISE EXCEPTION 'Invalid push subscription key format' USING ERRCODE = '22023';
    END IF;

    -- Strict SSRF push provider allowlist validation:
    -- Only approved public Web Push gateways (Google FCM, Mozilla, Apple WebPush, Microsoft WNS)
    IF NOT (p_endpoint ~* '^https://(([a-zA-Z0-9-]+\.)*(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|notify\.windows\.com|web\.push\.apple\.com|push\.apple\.com))(/.*)?$') THEN
        RAISE EXCEPTION 'Endpoint domain is not an authorized Web Push gateway' USING ERRCODE = '22023';
    END IF;

    -- Reject private IP or loopback targets
    IF (p_endpoint ~* '://(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.|0\.0\.0\.0|\[::1\])') THEN
        RAISE EXCEPTION 'Endpoint points to a forbidden private network host' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.push_subscriptions (
        user_id,
        endpoint,
        p256dh,
        auth,
        user_agent,
        updated_at
    )
    VALUES (
        v_user_id,
        p_endpoint,
        p_p256dh,
        p_auth,
        p_user_agent,
        now()
    )
    ON CONFLICT (endpoint) DO UPDATE
    SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        updated_at = now()
    WHERE public.push_subscriptions.user_id = v_user_id
    RETURNING id INTO v_record_id;

    IF v_record_id IS NULL THEN
        RAISE EXCEPTION 'Subscription belongs to another account' USING ERRCODE = '42501';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'subscriptionId', v_record_id,
        'userId', v_user_id,
        'endpoint', p_endpoint
    );
END;
$$;

-- RPC: Revoke push subscription
CREATE OR REPLACE FUNCTION public.revoke_push_subscription(
    p_endpoint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_deleted_count INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.push_subscriptions
    WHERE endpoint = p_endpoint
      AND (
          user_id = v_user_id
          OR EXISTS (
              SELECT 1 FROM public.profiles
              WHERE id = v_user_id AND role IN ('admin', 'super_admin')
          )
      );
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'deletedCount', v_deleted_count,
        'endpoint', p_endpoint
    );
END;
$$;

-- Function security permissions
REVOKE ALL ON FUNCTION public.register_push_subscription FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_subscription TO authenticated;

REVOKE ALL ON FUNCTION public.revoke_push_subscription FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_push_subscription TO authenticated;

COMMIT;
