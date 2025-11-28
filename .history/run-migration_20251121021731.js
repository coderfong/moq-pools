const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected to database');
    
    console.log('Reading migration file...');
    const sql = fs.readFileSync('manual-migration-reviews.sql', 'utf8');
    console.log('✓ Migration file loaded');
    
    console.log('Applying migration...');
    console.log('SQL length:', sql.length, 'characters');
    
    const result = await client.query(sql);
    console.log('✓ Migration applied successfully!');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('\n❌ Migration error:');
    console.error('Message:', error.message);
    console.error('Detail:', error.detail);
    console.error('Code:', error.code);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
