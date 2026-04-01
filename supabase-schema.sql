-- PrivyConnect Supabase Schema
-- Run this in your Supabase SQL Editor

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    photo_url TEXT,
    bio TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    is_subscribed BOOLEAN DEFAULT FALSE,
    subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'pending', 'expired')),
    subscription_expiry TIMESTAMPTZ,
    profile_mode TEXT DEFAULT 'public' CHECK (profile_mode IN ('public', 'private', 'incognito')),
    is_public BOOLEAN DEFAULT TRUE,
    hide_online_status BOOLEAN DEFAULT FALSE,
    is_online BOOLEAN DEFAULT FALSE,
    push_token TEXT,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    location JSONB DEFAULT '{"lat": 0, "lng": 0, "city": "Unknown"}'::JSONB,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    last_location_update TIMESTAMPTZ,
    location_visible BOOLEAN DEFAULT TRUE,
    gender TEXT CHECK (gender IN ('male', 'female', 'unspecified')),
    looking_for TEXT CHECK (looking_for IN ('male', 'female', 'everyone')),
    location_privacy TEXT DEFAULT 'exact' CHECK (location_privacy IN ('exact', 'approximate', 'hidden')),
    messaging_privacy TEXT DEFAULT 'everyone' CHECK (messaging_privacy IN ('everyone', 'subscribers', 'nobody')),
    notification_settings JSONB DEFAULT '{"chat": true, "tips": true, "subscriptions": true, "promotions": true}'::JSONB,
    auto_renew BOOLEAN DEFAULT FALSE,
    preferences JSONB DEFAULT '{"gender": "", "interests": [], "availability": ""}'::JSONB,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'payment', 'tip', 'subscription')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    reference TEXT UNIQUE,
    description TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Chats Table
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participants UUID[] NOT NULL,
    last_message TEXT,
    last_timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT,
    file_url TEXT,
    voice_url TEXT,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'voice', 'system')),
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Profiles: Public read, own write
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Transactions: Own read only
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = profile_id);

-- Chats: Participants only
CREATE POLICY "Users can view their own chats" ON public.chats
    FOR SELECT USING (auth.uid() = ANY(participants));

-- Messages: Participants only
CREATE POLICY "Users can view messages in their chats" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chats 
            WHERE id = messages.chat_id 
            AND auth.uid() = ANY(participants)
        )
    );

CREATE POLICY "Users can send messages to their chats" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chats 
            WHERE id = messages.chat_id 
            AND auth.uid() = ANY(participants)
        )
    );

-- 7. Functions & Triggers

-- Handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name, photo_url, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        'user'
    );
    
    INSERT INTO public.wallet (profile_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Saved Profiles Table
CREATE TABLE IF NOT EXISTS public.saved_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    saved_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, saved_profile_id)
);

ALTER TABLE public.saved_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved profiles" ON public.saved_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save profiles" ON public.saved_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave profiles" ON public.saved_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- 9. Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reported_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all reports" ON public.reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- 10. System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view settings" ON public.system_settings
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can update settings" ON public.system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 11. Moderation Keywords Table
CREATE TABLE IF NOT EXISTS public.moderation_keywords (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    keyword TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.moderation_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view keywords" ON public.moderation_keywords
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage keywords" ON public.moderation_keywords
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 12. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- 13. Login Activity Table
CREATE TABLE IF NOT EXISTS public.login_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    device TEXT,
    location TEXT,
    ip TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login activity" ON public.login_activity
    FOR SELECT USING (auth.uid() = user_id);

-- 14. Wallet Table
CREATE TABLE IF NOT EXISTS public.wallet (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    currency TEXT DEFAULT 'NGN',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.wallet
    FOR SELECT USING (auth.uid() = profile_id);

-- 15. Enable Realtime for Notifications, Profiles, Transactions, and Wallet
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet;

-- 15. Search Nearby Users Function (Haversine Formula)
CREATE OR REPLACE FUNCTION public.search_nearby_users(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION,
    preference TEXT DEFAULT 'everyone'
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    display_name TEXT,
    photo_url TEXT,
    gender TEXT,
    is_subscribed BOOLEAN,
    is_verified BOOLEAN,
    is_online BOOLEAN,
    hide_online_status BOOLEAN,
    location_privacy TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.display_name,
        p.photo_url,
        p.gender,
        p.is_subscribed,
        p.is_verified,
        p.is_online,
        p.hide_online_status,
        p.location_privacy,
        p.latitude,
        p.longitude,
        (
            6371 * acos(
                cos(radians(user_lat)) *
                cos(radians(p.latitude)) *
                cos(radians(p.longitude) - radians(user_lng)) +
                sin(radians(user_lat)) *
                sin(radians(p.latitude))
            )
        ) AS distance
    FROM public.profiles p
    WHERE p.location_visible = TRUE
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND (
        preference = 'everyone'
        OR p.gender = preference
    )
    AND (
        6371 * acos(
            cos(radians(user_lat)) *
            cos(radians(p.latitude)) *
            cos(radians(p.longitude) - radians(user_lng)) +
            sin(radians(user_lat)) *
            sin(radians(p.latitude))
        )
    ) < radius_km
    ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Handle Subscription Renewal Function
CREATE OR REPLACE FUNCTION public.handle_subscription_renewal(
    user_id UUID,
    amount DECIMAL(12, 2),
    new_expiry TIMESTAMPTZ
)
RETURNS VOID AS $$
DECLARE
    current_balance DECIMAL(12, 2);
BEGIN
    -- 1. Get current balance
    SELECT balance INTO current_balance FROM public.wallet WHERE profile_id = user_id;
    
    -- 2. Check if enough balance
    IF current_balance < amount THEN
        RAISE EXCEPTION 'Insufficient balance for auto-renewal';
    END IF;
    
    -- 3. Deduct from wallet
    UPDATE public.wallet 
    SET balance = balance - amount, updated_at = NOW()
    WHERE profile_id = user_id;
    
    -- 4. Create transaction record
    INSERT INTO public.transactions (profile_id, amount, type, status, description, reference)
    VALUES (user_id, amount, 'subscription', 'completed', 'Auto-renewal of weekly subscription', 'auto_' || encode(gen_random_bytes(6), 'hex'));
    
    -- 5. Update profile
    UPDATE public.profiles
    SET 
        is_subscribed = TRUE,
        subscription_status = 'active',
        subscription_expiry = new_expiry,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default settings
INSERT INTO public.system_settings (key, value) VALUES 
('subscription_price', '{"amount": 1500, "currency": "NGN"}'),
('platform_commission', '{"percentage": 25}'),
('withdrawal_limits', '{"min": 5000, "max": 500000}'),
('feature_flags', '{"chat": true, "tipping": true, "discovery": true, "notifications": true}')
ON CONFLICT (key) DO NOTHING;
