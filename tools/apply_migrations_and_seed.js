#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local manually
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    return {};
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').replace(/^["']|["']$/g, '').trim();
      }
    }
  });
  
  return env;
}

const env = loadEnvFile();
const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_KEY;
const projectId = env.VITE_SUPABASE_PROJECT_ID || process.env.VITE_SUPABASE_PROJECT_ID;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase environment variables.');
  console.log('Please set VITE_SUPABASE_URL and VITE_SUPABASE_KEY in your .env.local file');
  process.exit(1);
}

console.log('JNK Nutrition - Database Setup Tool');
console.log('========================================');
console.log('This will guide you through applying migrations to your Supabase database');
console.log('');

const supabase = createClient(supabaseUrl, supabaseKey);

async function listMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('Migrations directory not found:', migrationsDir);
    return [];
  }
  
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Sort by filename (which includes date)
  
  return files.map(file => ({
    name: file,
    path: path.join(migrationsDir, file)
  }));
}

async function applyMigrations() {
  console.log('Scanning for migration files...');
  const migrations = await listMigrations();
  
  if (migrations.length === 0) {
    console.log('No migration files found');
    return;
  }
  
  console.log(`Found ${migrations.length} migration file(s):`);
  migrations.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.name}`);
  });
  console.log('');
  
  console.log('MANUAL MIGRATION REQUIRED:');
  console.log('========================================');
  console.log('Due to RLS policies and security restrictions, migrations must be run manually.');
  console.log('');
  console.log('Steps to apply migrations:');
  console.log('');
  console.log('1. Go to your Supabase Dashboard:');
  console.log(`   https://supabase.com/dashboard/project/${projectId || 'YOUR_PROJECT_ID'}`);
  console.log('');
  console.log('2. Click on "SQL Editor" in the left sidebar');
  console.log('');
  console.log('3. For each migration file, copy and execute the SQL:');
  console.log('');
  
  const importantMigrations = [
    '20251122_add_payment_reference.sql',
    '20251122_remove_expiry_date.sql',
    '20251115_grant_admin_kamal.sql'
  ];
  
  migrations.forEach((migration) => {
    const isImportant = importantMigrations.includes(migration.name);
    const priority = isImportant ? '⭐ PRIORITY' : '  ';
    console.log(`   ${priority} ${migration.name}`);
    
    if (isImportant) {
      console.log(`      Location: supabase/migrations/${migration.name}`);
    }
  });
  
  console.log('');
  console.log('Most Recent/Important Migrations:');
  console.log('========================================');
  console.log('');
  console.log('⭐ 20251122_add_payment_reference.sql');
  console.log('   Purpose: Adds payment_reference column to sales table');
  console.log('   Required for: Card/Bank Transfer transaction references');
  console.log('');
  console.log('⭐ 20251122_remove_expiry_date.sql');
  console.log('   Purpose: Removes expiry_date column from products table');
  console.log('   Required for: Clean product schema without expiry tracking');
  console.log('');
  console.log('⭐ 20251115_grant_admin_kamal.sql');
  console.log('   Purpose: Sets up admin user (kamal@jnknutrition.com)');
  console.log('   Required for: Admin access to the system');
  console.log('');
  
  // Display SQL content for priority migrations
  console.log('SQL PREVIEW - Payment Reference Migration:');
  console.log('========================================');
  const paymentRefMigration = migrations.find(m => m.name === '20251122_add_payment_reference.sql');
  if (paymentRefMigration) {
    const sql = fs.readFileSync(paymentRefMigration.path, 'utf8');
    console.log(sql);
  }
  console.log('');
  
  console.log('SQL PREVIEW - Remove Expiry Migration:');
  console.log('========================================');
  const expiryMigration = migrations.find(m => m.name === '20251122_remove_expiry_date.sql');
  if (expiryMigration) {
    const sql = fs.readFileSync(expiryMigration.path, 'utf8');
    console.log(sql);
  }
  console.log('');
  
  console.log('Once you\'ve run these migrations in Supabase Dashboard:');
  console.log('   1. The payment_reference column will be available for card/bank payments');
  console.log('   2. The expiry_date column will be removed from products');
  console.log('   3. Admin user will have proper access rights');
  console.log('');
  console.log('After applying migrations, restart your dev server:');
  console.log('   npm run dev');
  console.log('');
}

// Run the setup
applyMigrations().then(() => {
  console.log('Setup script completed!');
  process.exit(0);
}).catch((error) => {
  console.log('Error:', error.message);
  process.exit(1);
});
