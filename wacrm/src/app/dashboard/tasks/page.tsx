import TasksClientNew from '@/components/TasksClientNew';

export default async function TasksPage() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6">
        <TasksClientNew />
      </div>
    </div>
  );
}
