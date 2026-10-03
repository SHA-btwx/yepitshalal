import { redirect } from 'next/navigation';

// Feedback lives in the inbox now, with every other form, where it can be
// answered from hello@ instead of a bare mailto link. This address stays so
// the links in emails sent before the inbox existed still land somewhere.
export default function AdminFeedbackPage() {
  redirect('/admin/inbox?type=feedback&view=all');
}
