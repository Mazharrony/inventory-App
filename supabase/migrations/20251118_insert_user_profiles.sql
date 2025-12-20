-- Insert user profiles into the profiles table
-- Run this migration after the profiles table is created

INSERT INTO "public"."profiles" ("id", "email", "full_name", "avatar_url", "created_at", "updated_at") 
VALUES 
  ('90b71c36-0e94-433c-b1b5-ee7fea281b00', 'account@jnknutrition.com', 'Nashid', null, '2025-11-18 11:58:54.808+00', '2025-11-18 12:18:16.915+00'),
  ('b40fcde0-89d5-47cb-8fa5-71830370cd6c', 'admin@jnknutrition.com', 'Kamal', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma&backgroundColor=bbf7d0', '2025-11-17 09:55:26.570863+00', '2025-11-18 11:47:09.959+00'),
  ('de3a89a1-bd6e-43c3-8028-f2247ed93ca3', 'kamal@jnknutrition.com', 'Mazhar Rony', 'https://api.dicebear.com/7.x/avataaars/svg?seed=A7&backgroundColor=bfdbfe', '2025-11-15 09:53:38.357883+00', '2025-11-18 10:24:10.154+00')
ON CONFLICT ("id") DO UPDATE SET
  "email" = EXCLUDED."email",
  "full_name" = EXCLUDED."full_name",
  "avatar_url" = EXCLUDED."avatar_url",
  "updated_at" = EXCLUDED."updated_at";

-- Verify the inserted profiles
SELECT id, email, full_name, avatar_url FROM "public"."profiles" ORDER BY created_at DESC;
