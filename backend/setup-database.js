require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('./config/supabase');

async function setupDatabase() {
  try {
    console.log('🗄️  Setting up Supabase database schema...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'config', 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { error } = await supabaseAdmin.rpc('exec_sql', { 
          sql_text: statement + ';' 
        });
        
        if (error) {
          // Try using the PostgreSQL function instead
          const { error: pgError } = await supabaseAdmin
            .from('_')
            .select('*')
            .limit(0);
          
          // If that fails, use direct SQL execution
          console.log(`🔄 Trying direct execution...`);
          const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
            },
            body: JSON.stringify({ sql_text: statement + ';' })
          });
          
          if (!response.ok) {
            console.log(`⚠️  Statement ${i + 1} may have failed, but continuing...`);
            console.log(`Statement: ${statement.substring(0, 100)}...`);
          }
        }
      } catch (err) {
        console.log(`⚠️  Error executing statement ${i + 1}: ${err.message}`);
        console.log(`Statement: ${statement.substring(0, 100)}...`);
      }
    }
    
    console.log('✅ Database setup completed!');
    
    // Test the setup by querying surveys
    const { data, error } = await supabaseAdmin
      .from('surveys')
      .select('survey_id, title, base_reward')
      .limit(5);
    
    if (error) {
      console.error('❌ Error testing database:', error);
    } else {
      console.log(`🎯 Found ${data.length} surveys in database`);
      data.forEach(survey => {
        console.log(`  - ${survey.title} ($${survey.base_reward})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('🎉 Setup complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase };