import { fetchProductDetail } from '../src/lib/providers/detail';

async function main() {
  const samples = [
    // Replace with a couple of live, public product URLs you care about.
    'https://www.alibaba.com/product-detail/123.html',
    'https://lianhualigher.en.made-in-china.com/product/foobar.html',
    'https://www.indiamart.com/proddetail/foobar.html',
  ];

  for (const url of samples) {
    const t0 = Date.now();
    try {
      const detail = await fetchProductDetail(url);
      const dt = Date.now() - t0;
      console.log('\n===', url, `(${dt}ms)`);
      console.log('title:', detail?.title);
      console.log('price:', detail?.priceText);
      console.log('moq:', detail?.moqText);
      console.log('attrs:', detail?.attributes?.slice(0, 3));
      console.log('supplier:', detail?.supplier);
      console.log('gallery:', detail?.gallery?.slice(0, 3));
    } catch (e) {
      console.log('\n===', url);
      console.warn('FAILED:', (e as Error).message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
