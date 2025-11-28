import { redirect } from 'next/navigation';

export default function Admin() {
  // Redirect to the new comprehensive dashboard
  redirect('/admin/dashboard');
}
