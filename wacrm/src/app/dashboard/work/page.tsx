import { getAuthenticatedUser } from '@/lib/auth';
import WorkClient from '@/components/WorkClient';

export const metadata = {
  title: 'Work | Simply CRM',
};

export default async function WorkPage() {
  const { dbUser, workspace } = await getAuthenticatedUser();

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="max-w-6xl mx-auto">
        <WorkClient user={dbUser} workspace={workspace} />
      </div>
    </div>
  );
}
