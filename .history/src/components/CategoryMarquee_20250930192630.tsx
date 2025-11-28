export default function CategoryMarquee() {
  const cats = [
    { name: 'Electronics', icon: '🔌', img: '/icons/electronics.svg' },
    { name: 'Beauty', icon: '💄', img: '/icons/beauty.svg' },
    { name: 'Home', icon: '🏠', img: '/icons/home.svg' },
     { name: 'Consumer Electronics', label: 'Electronics', icon: '�', img: '/icons/electronics.svg' },
     { name: 'Sports & Entertainment', label: 'Sports', icon: '🏅' },
     { name: 'School & Office Supplies', label: 'Office & School', icon: '�️', img: '/icons/office.svg' },
     { name: 'Furniture', label: 'Furniture', icon: '🛋️' },
     { name: 'Safety & Security', label: 'Security', icon: '🛡️' },
     { name: 'Apparel & Accessories', label: 'Apparel', icon: '👕', img: '/icons/apparel.svg' },
     { name: 'Home & Garden', label: 'Home & Garden', icon: '�', img: '/icons/home.svg' },
     { name: 'Beauty', label: 'Beauty', icon: '�', img: '/icons/beauty.svg' },
     { name: 'Jewelry, Eyewear & Watches', label: 'Jewelry & Watches', icon: '⌚' },
     { name: 'Shoes & Accessories', label: 'Shoes', icon: '👟' },
     { name: 'Luggage, Bags & Cases', label: 'Bags & Cases', icon: '🧳' },
     { name: 'Packaging & Printing', label: 'Packaging', icon: '📦', img: '/icons/bulk.svg' },
     { name: 'Parents, Kids & Toys', label: 'Kids & Toys', icon: '🧸' },
     { name: 'Personal Care & Home Care', label: 'Personal & Home Care', icon: '🧴' },
     { name: 'Health & Medical', label: 'Health & Medical', icon: '🏥' },
     { name: 'Gifts & Crafts', label: 'Gifts & Crafts', icon: '🎁' },
     { name: 'Pet Supplies', label: 'Pet Supplies', icon: '�' },
     { name: 'Industrial Machinery', label: 'Industrial', icon: '🏭' },
     { name: 'Commercial Equipment & Machinery', label: 'Commercial Equip', icon: '⚙️' },
     { name: 'Construction & Building Machinery', label: 'Construction Mach.', icon: '🚜' },
     { name: 'Construction & Real Estate', label: 'Real Estate', icon: '🏗️' },
     { name: 'Lights & Lighting', label: 'Lighting', icon: '💡' },
     { name: 'Home Appliances', label: 'Home Appliances', icon: '🧺' },
     { name: 'Automotive Supplies & Tools', label: 'Automotive Supplies', icon: '🛠️' },
     { name: 'Vehicle Parts & Accessories', label: 'Auto Parts', icon: '🚗' },
     { name: 'Tools & Hardware', label: 'Tools & Hardware', icon: '🛠️' },
     { name: 'Renewable Energy', label: 'Renewable Energy', icon: '☀️' },
     { name: 'Electrical Equipment & Supplies', label: 'Electrical', icon: '🔌' },
     { name: 'Material Handling', label: 'Material Handling', icon: '�️' },
     { name: 'Testing Instrument & Equipment', label: 'Testing Instruments', icon: '🧪' },
     { name: 'Power Transmission', label: 'Power Transmission', icon: '⚡' },
     { name: 'Electronic Components', label: 'Components', icon: '🔩' },
     { name: 'Vehicles & Transportation', label: 'Transportation', icon: '🚚' },
     { name: 'Agriculture, Food & Beverage', label: 'Agri & Food', icon: '🌾' },
     { name: 'Raw Materials', label: 'Raw Materials', icon: '🧱' },
     { name: 'Fabrication Services', label: 'Fabrication', icon: '🛠️' },
  ];
  const list = [...cats, ...cats, ...cats];
  return (
    <section className="w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16" data-reveal>
      <div className="px-6 md:px-10 xl:px-16 py-5 overflow-hidden group">
  <div className="flex items-center gap-5 whitespace-nowrap marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none text-base md:text-lg">
          {list.map((c, i) => (
            <span key={`a-${i}`} className="px-4 py-2 rounded-full border-hairline bg-white/80 dark:bg-gray-900/80 backdrop-blur text-gray-900 dark:text-white inline-flex items-center gap-2">
              {c.img ? <img src={c.img} alt="" className="h-5 w-5" /> : <span aria-hidden>{c.icon}</span>}
              <span>{c.label}</span>
            </span>
          ))}
          {/* duplicate for continuous loop */}
          {list.map((c, i) => (
            <span aria-hidden key={`b-${i}`} className="px-5 py-2.5 rounded-full border-hairline bg-white/80 dark:bg-gray-900/80 backdrop-blur text-gray-900 dark:text-white inline-flex items-center gap-3">
              {c.img ? <img src={c.img} alt="" className="h-5 w-5" /> : <span aria-hidden>{c.icon}</span>}
              <span>{c.label}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
