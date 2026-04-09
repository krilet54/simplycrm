import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import MyWorkPanel from '@/components/MyWorkPanel';

export const metadata = {
  title: 'My Work | Simply CRM',
};

export default async function MyWorkPage() {
  const { dbUser, workspace } = await getAuthenticatedUser();

  // OWNER, ADMIN and AGENT can access this page
  if (!dbUser || !['OWNER', 'ADMIN', 'AGENT'].includes(dbUser.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="max-w-6xl mx-auto">
        <MyWorkPanel />
      </div>
    </div>
  );
}
