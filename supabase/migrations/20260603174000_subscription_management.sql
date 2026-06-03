-- Migración para la gestión de suscripciones de usuarios a los planes

-- 1. Crear tabla de suscripciones activas
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'past_due', 'canceled')),
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'semesterly', 'annually')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id) -- Un usuario solo puede tener una suscripción activa/registrada
);

-- 2. Crear tabla de transacciones de pago
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'semesterly', 'annually')),
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL CHECK (currency IN ('CUP', 'USD')),
    payment_method TEXT NOT NULL, -- 'transferencia_cup', 'zelle', 'crypto', 'stripe'
    transaction_reference TEXT, -- ID de transferencia o SMS
    receipt_url TEXT, -- URL de la captura del comprobante subida a Supabase Storage
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    validated_by UUID REFERENCES public.users(id), -- ID del admin que aprobó/rechazó
    validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar RLS en las nuevas tablas
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para user_subscriptions
CREATE POLICY "Users can view their own subscription" 
    ON public.user_subscriptions FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view and manage all subscriptions" 
    ON public.user_subscriptions FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Políticas para payment_transactions
CREATE POLICY "Users can view their own transactions" 
    ON public.payment_transactions FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Users can create transactions" 
    ON public.payment_transactions FOR INSERT 
    WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can view and manage all transactions" 
    ON public.payment_transactions FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 6. Crear bucket para comprobantes en storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para comprobantes de pago
CREATE POLICY "Authenticated users can upload receipts"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Users can read their own receipts and admins can read all"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'receipts' AND (
            (owner = auth.uid()) OR
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

-- 7. Función y Procedimiento almacenado para aprobar un pago
CREATE OR REPLACE FUNCTION public.approve_payment_transaction(
    target_transaction_id UUID,
    admin_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_plan_id TEXT;
    v_billing_cycle TEXT;
    v_duration INTERVAL;
BEGIN
    -- Verificar que quien lo ejecuta sea admin
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden aprobar pagos.';
    END IF;

    -- Obtener datos de la transacción
    SELECT user_id, plan_id, billing_cycle
    INTO v_user_id, v_plan_id, v_billing_cycle
    FROM public.payment_transactions
    WHERE id = target_transaction_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN FALSE; -- Transacción no encontrada o ya procesada
    END IF;

    -- Calcular duración basada en ciclo de facturación
    CASE v_billing_cycle
        WHEN 'semesterly' THEN v_duration := INTERVAL '6 months';
        WHEN 'annually' THEN v_duration := INTERVAL '12 months';
        ELSE v_duration := INTERVAL '1 month';
    END CASE;

    -- 1. Actualizar el estado de la transacción
    UPDATE public.payment_transactions
    SET status = 'approved',
        validated_by = admin_id,
        validated_at = NOW()
    WHERE id = target_transaction_id;

    -- 2. Upsert la suscripción del usuario
    INSERT INTO public.user_subscriptions (user_id, plan_id, status, billing_cycle, starts_at, expires_at)
    VALUES (
        v_user_id, 
        v_plan_id, 
        'active', 
        v_billing_cycle, 
        NOW(), 
        NOW() + v_duration
    )
    ON CONFLICT (user_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = 'active',
        billing_cycle = EXCLUDED.billing_cycle,
        starts_at = NOW(),
        expires_at = NOW() + v_duration,
        updated_at = NOW();

    -- 3. Actualizar la columna plan en la tabla users
    UPDATE public.users
    SET plan = v_plan_id
    WHERE id = v_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Función para rechazar un pago
CREATE OR REPLACE FUNCTION public.reject_payment_transaction(
    target_transaction_id UUID,
    admin_id UUID,
    reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verificar que quien lo ejecuta sea admin
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden rechazar pagos.';
    END IF;

    -- Actualizar transacción a rechazada
    UPDATE public.payment_transactions
    SET status = 'rejected',
        rejection_reason = reason,
        validated_by = admin_id,
        validated_at = NOW()
    WHERE id = target_transaction_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Ajustar el límite de grupos de WhatsApp del plan Free a 0 en subscription_plans
UPDATE public.subscription_plans
SET groups_limit = 0
WHERE id = 'free';
