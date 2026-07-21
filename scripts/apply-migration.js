/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// Load credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

// Read migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

async function applyMigration() {
  console.log('Applying database migration...');
  console.log('Migration file:', migrationPath);
  console.log('SQL length:', migrationSQL.length);
  
  // Split the migration into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log('Number of statements:', statements.length);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    
    try {
      // Try using the SQL editor endpoint
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ sql: statement })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`Statement ${i + 1} failed (this might be expected):`, errorText.substring(0, 200));
      } else {
        console.log(`✓ Statement ${i + 1} executed successfully`);
      }
    } catch (error) {
      console.log(`Statement ${i + 1} error:`, error.message);
    }
  }
  
  console.log('\nMigration process completed');
  console.log('Please verify the tables were created in your Supabase dashboard');
  console.log('Go to: https://supabase.com/dashboard/project/mqzcjqstunjyjekzpuni/editor');
}

applyMigration();
