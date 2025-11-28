import { getSession } from '../../api/_lib/session';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata = { title: 'Payments - Account - MOQ Pools' };

export default async function PaymentsPage() {
  const session = getSession();
  if (!session?.sub || !prisma) redirect('/login?next=/account/payments');

  // Fetch user's payments
  const payments = await prisma.payment.findMany({
    where: {
      poolItem: {
        userId: session.sub,
      },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      poolItem: {
        include: {
          savedListing: {
            select: {
              title: true,
              image: true,
            },
          },
        },
      },
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'PAID':
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'FAILED':
        return 'bg-red-100 text-red-700';
      case 'REFUNDED':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const totalPaid = payments
    .filter((p) => p.status === 'PAID' || p.status === 'COMPLETED')
    .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

  const pendingPayments = payments.filter((p) => p.status === 'PENDING').length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payments & Wallet</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage your payment history and saved payment methods.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-6 border border-green-200">
          <div className="text-sm text-green-700 font-medium">Total Paid</div>
          <div className="mt-2 text-3xl font-bold text-green-900">
            ${totalPaid.toFixed(2)}
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 border border-yellow-200">
          <div className="text-sm text-yellow-700 font-medium">Pending Payments</div>
          <div className="mt-2 text-3xl font-bold text-yellow-900">
            {pendingPayments}
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-6 border border-blue-200">
          <div className="text-sm text-blue-700 font-medium">Total Transactions</div>
          <div className="mt-2 text-3xl font-bold text-blue-900">
            {payments.length}
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-2xl">
                💳
              </div>
              <div>
                <div className="font-medium text-gray-900">Stripe Checkout</div>
                <div className="text-sm text-gray-600">Secure payment processing</div>
              </div>
            </div>
            <Link
              href="/checkout"
              className="rounded-md bg-orange-600 text-white px-4 py-2 text-sm font-medium hover:bg-orange-700 transition-colors"
            >
              Add Payment Method
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            We use Stripe for secure payment processing. Your payment information is encrypted and never stored on our servers.
          </p>
        </div>
      </div>

      {/* Payment History */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
        <div className="space-y-4">
          {payments.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <div className="text-6xl mb-4">💰</div>
              <h4 className="text-xl font-semibold mb-2">No payment history</h4>
              <p className="text-gray-600 mb-6">
                Your payment transactions will appear here once you make a purchase.
              </p>
              <Link
                href="/pools"
                className="inline-block rounded-md bg-orange-600 text-white px-6 py-3 font-medium hover:bg-orange-700 transition-colors"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Product Image */}
                  {payment.poolItem?.savedListing?.image && (
                    <div className="flex-shrink-0">
                      <img
                        src={payment.poolItem.savedListing.image}
                        alt={payment.poolItem.savedListing.title || 'Product'}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    </div>
                  )}

                  {/* Payment Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 line-clamp-2">
                          {payment.poolItem?.savedListing?.title || 'Order Payment'}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Transaction ID: {payment.id.substring(0, 12)}...
                        </p>
                      </div>

                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap ${getStatusBadge(payment.status)}`}
                      >
                        {payment.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Amount</div>
                        <div className="font-medium text-gray-900 mt-1">
                          ${(payment.amountPaid || 0).toFixed(2)}
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-500">Method</div>
                        <div className="font-medium text-gray-900 mt-1">
                          {payment.method || 'Stripe'}
                        </div>
                      </div>

                      <div>
                        <div className="text-gray-500">Date</div>
                        <div className="font-medium text-gray-900 mt-1">
                          {new Date(payment.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </div>

                      {payment.stripePaymentIntentId && (
                        <div>
                          <div className="text-gray-500">Reference</div>
                          <div className="font-medium text-gray-900 mt-1 truncate">
                            {payment.stripePaymentIntentId.substring(0, 12)}...
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {payment.status === 'PAID' && (
                      <div className="mt-4">
                        <button
                          className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                          onClick={() => alert('Receipt download coming soon!')}
                        >
                          Download Receipt →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-900 mb-2">Need help with payments?</h4>
        <p className="text-sm text-gray-600 mb-4">
          Our support team is here to assist you with any payment-related questions.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/support"
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            Contact Support →
          </Link>
          <Link
            href="/refund-policy"
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            Refund Policy →
          </Link>
          <Link
            href="/faq"
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            Payment FAQ →
          </Link>
        </div>
      </div>
    </div>
  );
}
