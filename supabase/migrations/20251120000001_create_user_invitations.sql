-- Create user_invitations table for invitation-based user setup
CREATE TABLE IF NOT EXISTS public.user_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'seller')),
    invitation_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    invited_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT FALSE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires ON public.user_invitations(expires_at);

-- Enable RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for user_invitations table
-- Only admins can create invitations
CREATE POLICY "Admins can create invitations" ON public.user_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.email = auth.jwt() ->> 'email'
            AND user_roles.role = 'admin'
            AND user_roles.is_active = true
        )
    );

-- Only admins can view invitations
CREATE POLICY "Admins can view invitations" ON public.user_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.email = auth.jwt() ->> 'email'
            AND user_roles.role = 'admin'
            AND user_roles.is_active = true
        )
    );

-- Only admins can update invitations
CREATE POLICY "Admins can update invitations" ON public.user_invitations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.email = auth.jwt() ->> 'email'
            AND user_roles.role = 'admin'
            AND user_roles.is_active = true
        )
    );

-- Allow public access for invitation acceptance (will be handled by token validation)
CREATE POLICY "Public can accept invitations" ON public.user_invitations
    FOR UPDATE USING (true)
    WITH CHECK (true);
