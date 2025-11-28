import { prisma } from '@/lib/prisma';

async function analyzeDatabaseSize() {
  try {
    // Get table sizes
    const tableSizes = await prisma!.$queryRaw<Array<{
      table_name: string;
      total_size: string;
      table_size: string;
      indexes_size: string;
      row_count: bigint;
    }>>`
      SELECT 
        table_name,
        pg_size_pretty(total_bytes) AS total_size,
        pg_size_pretty(table_bytes) AS table_size,
        pg_size_pretty(indexes_bytes) AS indexes_size,
        row_estimate AS row_count
      FROM (
        SELECT 
          table_name,
          pg_total_relation_size(table_name::text::regclass) AS total_bytes,
          pg_relation_size(table_name::text::regclass) AS table_bytes,
          pg_indexes_size(table_name::text::regclass) AS indexes_bytes,
          (SELECT reltuples FROM pg_class WHERE relname = table_name) AS row_estimate
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ) AS sizes
      ORDER BY total_bytes DESC;
    `;

    console.log('\n=== Database Table Sizes ===\n');
    tableSizes.forEach((table: any) => {
      console.log(`Table: ${table.table_name}`);
      console.log(`  Total Size: ${table.total_size}`);
      console.log(`  Table Size: ${table.table_size}`);
      console.log(`  Indexes Size: ${table.indexes_size}`);
      console.log(`  Rows: ${table.row_count}`);
      console.log('');
    });

    // Get total database size
    const dbSize = await prisma!.$queryRaw<Array<{ size: string }>>`
      SELECT pg_size_pretty(pg_database_size(current_database())) AS size;
    `;
    
    console.log(`\n=== Total Database Size: ${dbSize[0].size} ===\n`);

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma!.$disconnect();
  }
}

analyzeDatabaseSize();
