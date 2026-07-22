import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to dashboard - the middleware will handle authentication check
  redirect('/dashboard');
}
