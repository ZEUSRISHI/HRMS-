import TimesheetApproval from '@/app/components/manager/TimesheetApproval';
import PerformanceDashboard from '@/app/components/manager/PerformanceDashboard';

export default function ManagerDashboard() {
  return (
    <div className="space-y-6">
      <TimesheetApproval />
      <PerformanceDashboard />
    </div>
  );
}
