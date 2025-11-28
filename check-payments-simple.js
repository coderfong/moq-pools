// Clear require cache
delete require.cache[require.resolve('@prisma/client')];

const { PrismaClient } = require('./prisma/generated/client4');
const p = new PrismaClient();

p.payment.findMany({ 
  take: 10, 
  orderBy: { createdAt: 'desc' },
  select: { 
    id: true, 
    status: true, 
    amount: true,
    currency: true,
    reference: true
  } 
}).then(r => { 
  console.log('\nRecent Payments:');
  r.forEach(payment => {
    console.log(`- ${payment.status}: ${payment.currency.toUpperCase()} ${(payment.amount/100).toFixed(2)} (${payment.reference})`);
  });
  
  const statusCounts = {};
  r.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });
  
  console.log('\nStatus Summary:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
  return p.$disconnect(); 
}).catch(err => {
  console.error('Error:', err.message);
  p.$disconnect();
});
