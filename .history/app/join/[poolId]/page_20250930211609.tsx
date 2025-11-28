export default function JoinFlowPage({ params }: { params: { poolId: string } }) {
  return (
    <div className="w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16">
      <div className="px-6 md:px-10 xl:px-16 py-10 space-y-6">
        <h1 className="text-2xl md:text-3xl font-display font-extrabold text-ink">Join Pool</h1>
        <ol className="list-decimal ps-5 space-y-2 text-ink">
          <li>Select quantity</li>
          <li>Payment</li>
          <li>Lock funds (escrow)</li>
          <li>Confirmation</li>
        </ol>
        <div className="rounded-2xl bg-card p-6">Coming soon: interactive steps</div>
      </div>
    </div>
  );
}
