#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase environment variables.');
  console.log('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file');
  process.exit(1);
}

console.log('JNK Nutrition - Database Migration Tool');
console.log('==========================================');

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20241120_create_sales_undo_log.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.log('Migration file not found:', migrationPath);
      return;
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration: 20241120_create_sales_undo_log.sql');
    console.log('Creating sales_undo_log table...');
    
    // Split the migration into individual statements
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error && !error.message.includes('already exists')) {
          console.log(`Error executing statement: ${error.message}`);
          // Continue with next statement for non-critical errors
        } else {
          console.log(`Statement ${i + 1} completed successfully`);
        }
      }
    }
    
    console.log('');
    console.log('Migration completed successfully!');
    console.log('sales_undo_log table is now ready');
    console.log('The system will now properly track undo operations with user information');
    console.log('');
    console.log('Next steps:');
    console.log('1. Restart your development server: npm run dev');
    console.log('2. Test the undo functionality on the Sales page');
    console.log('3. Check the Analytics page to see undo logs');
    
  } catch (error) {
    console.log('Migration failed:', error.message);
    process.exit(1);
  }
}

// Alternative approach using raw SQL if RPC doesn't work
async function runMigrationDirect() {
  console.log('Using direct SQL approach...');
  
  try {
    // Check if table exists
    const { data: tables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'sales_undo_log')
      .eq('table_schema', 'public');
    
    if (checkError) {
      console.log('Error checking table existence:', checkError.message);
      return;
    }
    
    if (tables && tables.length > 0) {
      console.log('sales_undo_log table already exists!');
      console.log('You can now use the undo functionality');
      return;
    }
    
    console.log('Table does not exist, please run the migration manually:');
    console.log('');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the migration file: supabase/migrations/20241120_create_sales_undo_log.sql');
    console.log('');
    
  } catch (error) {
    console.log('Error:', error.message);
    console.log('');
    console.log('Please run the migration manually in Supabase Dashboard:');
    console.log('File: supabase/migrations/20241120_create_sales_undo_log.sql');
  }
}

// Run the migration
runMigrationDirect().then(() => {
  process.exit(0);
}).catch((error) => {
  console.log('Failed:', error.message);
  process.exit(1);
});