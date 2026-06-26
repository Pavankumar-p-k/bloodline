require('dotenv').config();
const supabase = require('./config/supabase');

async function testConnection() {
  console.log("Checking Supabase connection...");
  console.log("URL:", process.env.SUPABASE_URL);

  const tables = ['profiles', 'donors', 'blood_requests', 'donor_responses', 'donations', 'notifications'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ Table "${table}" error:`, error.message);
      } else {
        console.log(`✅ Table "${table}" exists! Details: found ${data.length} records.`);
      }
    } catch (e) {
      console.log(`❌ Table "${table}" exception:`, e.message);
    }
  }
}

testConnection();
