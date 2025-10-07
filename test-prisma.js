// Test Prisma import
const { PrismaClient } = require('@prisma/client');

async function testPrisma() {
  console.log('Testing Prisma client...');
  
  const prisma = new PrismaClient();
  
  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Prisma connected successfully');
    
    // Check if User table exists
    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `;
    
    console.log('\n📊 Tables in database:');
    tables.forEach((table, i) => {
      console.log(`   ${i + 1}. ${table.tablename}`);
    });
    
    // Check if there's a "User" table (or "users")
    const hasUserTable = tables.some(t => 
      t.tablename.toLowerCase() === 'user' || 
      t.tablename.toLowerCase() === 'users'
    );
    
    if (hasUserTable) {
      console.log('\n✅ User table exists in database');
    } else {
      console.log('\n❌ User table NOT found in database');
      console.log('   You need to run migrations to create the schema');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPrisma();
