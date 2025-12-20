-- Grant admin role to kamal@jnknutrition.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'kamal@jnknutrition.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the role was added
SELECT ur.user_id, ur.role, au.email 
FROM public.user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE au.email = 'kamal@jnknutrition.com';
