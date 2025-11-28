import { prisma } from '@/lib/prisma';

async function main() {
  const p: any = prisma as any;
  const rows = await p.savedListing.findMany({ select: { id: true, url: true, title: true, image: true }, orderBy: { updatedAt: 'desc' } });
  console.log('id,url,title,image');
  for (const r of rows as Array<{ id: string; url: string; title: string; image: string | null }>) {
    const safeTitle = (r.title || '').replace(/"/g, '""');
    const line = `${r.id},${r.url},"${safeTitle}",${r.image || ''}`;
    console.log(line);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
