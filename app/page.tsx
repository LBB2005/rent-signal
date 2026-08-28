import { redirect } from 'next/navigation';

// Rent Signal is a chat-first product — the root route sends you straight
// into the research UI.
export default function Home() {
  redirect('/chat');
}
