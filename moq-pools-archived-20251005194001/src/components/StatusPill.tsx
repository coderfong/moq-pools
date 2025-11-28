export default function StatusPill({ status }:{ status: string }) {
  const colors: Record<string,string> = {
    OPEN: 'bg-green-50 text-green-700 border-green-200',
    LOCKED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    ORDER_PLACED: 'bg-blue-50 text-blue-700 border-blue-200',
    FULFILLING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    FULFILLED: 'bg-gray-900 text-white border-gray-900',
    FAILED: 'bg-red-50 text-red-700 border-red-200',
    CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return <span className={`badge ${colors[status] ?? ''}`}>{status.replace('_',' ')}</span>;
}
