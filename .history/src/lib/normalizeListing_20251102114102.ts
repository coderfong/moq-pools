export type Listing = {
  id: string;
  url: string;
  title: string;
  price?: string;
  moq?: string;
  image?: string; // initial image if any
};

export function normalizeListing(raw: any): Listing {
  const image = (raw?.cached_image)
    || raw?.image
    || raw?.firstImageUrl
    || '/seed/sleeves.jpg';

  return {
    id: String(raw?.id ?? raw?.url ?? ''),
    url: String(raw?.url ?? ''),
    title: String(raw?.title ?? 'Untitled'),
    price: raw?.price ?? raw?.minPrice ?? undefined,
    moq: raw?.moq ?? raw?.minOrder ?? undefined,
    image,
  };
}
