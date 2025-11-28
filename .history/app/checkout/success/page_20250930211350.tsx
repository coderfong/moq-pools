export default function SuccessPage() {
  return (
    <div className="w-screen max-w-none -mx-6 md:-mx-10 xl:-mx-16">
      <div className="px-6 md:px-10 xl:px-16 py-16 text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-display font-extrabold text-ink">Funds Locked</h1>
        <p className="text-muted">Your contribution has been added to the pool. Share the link to speed it up.</p>
        <div className="mt-4 inline-block btn-primary-gradient text-white rounded-full px-6 py-3">Share</div>
      </div>
    </div>
  );
}
