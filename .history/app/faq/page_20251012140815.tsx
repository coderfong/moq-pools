export default function FAQPage() {
  const faqs = [
    {
      question: "What is MOQ Pools?",
      answer: "MOQ Pools is a group-buy platform that helps buyers team up to meet Minimum Order Quantities (MOQ) from wholesale suppliers on Alibaba, 1688, Made-in-China, and IndiaMART. By pooling orders together, you unlock factory pricing and better deals."
    },
    {
      question: "How does the group buying process work?",
      answer: "1. Join a pool for a product you're interested in. 2. Pay a deposit to reserve your quantity. 3. Wait for the pool to reach the MOQ. 4. Once filled, we place the bulk order. 5. We negotiate the best price and handle shipping to all pool members."
    },
    {
      question: "Is there a minimum order quantity for me?",
      answer: "No! You can join pools with any quantity you need. The platform handles reaching the supplier's MOQ by combining orders from multiple buyers."
    },
    {
      question: "How do I know if a pool is legitimate?",
      answer: "All pools are verified supplier listings from trusted platforms. We check supplier credentials, product quality, and order history before listing pools."
    },
    {
      question: "What are the payment terms?",
      answer: "You pay a small deposit (typically 10-20%) to join and reserve your spot in the pool. The remaining balance is due once the pool reaches MOQ and before we place the order."
    },
    {
      question: "How long does it take to fill a pool?",
      answer: "Pool filling times vary depending on product popularity and MOQ requirements. Popular items might fill in days, while specialized products could take weeks. You'll receive updates on your pool's progress."
    },
    {
      question: "What if a pool doesn't reach MOQ?",
      answer: "If a pool doesn't reach MOQ within the specified timeframe, all deposits are fully refunded. No risk to you!"
    },
    {
      question: "How are shipping costs handled?",
      answer: "Shipping costs are included in the final pricing. We negotiate bulk shipping rates and distribute costs fairly among pool members based on their order quantities."
    },
    {
      question: "Can I modify my order after joining a pool?",
      answer: "You can increase your quantity up until the pool reaches MOQ. Decreases are not allowed once you've committed to maintain pool stability."
    },
    {
      question: "What if I receive damaged or incorrect items?",
      answer: "We work directly with suppliers to resolve any quality or shipping issues. Our quality assurance team inspects products before shipping, and we offer a satisfaction guarantee."
    },
    {
      question: "Are there any hidden fees?",
      answer: "Transparent pricing only. The final price includes product cost, negotiated shipping, and a small platform fee (typically 2-5%) to cover our services."
    },
    {
      question: "How do I track my order?",
      answer: "You'll receive tracking information once your order ships. You can also track pool progress and order status through your account dashboard."
    }
  ];

  return (
    <section className="w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16">
      <div className="px-6 md:px-10 xl:px-16 py-16">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
          <div className="text-base uppercase tracking-wide text-muted">Support</div>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-muted/90">
            Everything you need to know about buying with MOQ Pools.
          </p>
        </div>

        {/* FAQ Grid */}
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-6 md:gap-8">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-card border-hairline rounded-xl p-6 md:p-8">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                  {faq.question}
                </h3>
                <p className="text-base text-muted leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="text-center mt-16">
          <div className="bg-card border-hairline rounded-xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Still have questions?
            </h3>
            <p className="text-muted mb-6">
              Can't find the answer you're looking for? Our support team is here to help.
            </p>
            <button className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}