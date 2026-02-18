import TimesheetApproval from "../../components/manager/TimesheetApproval";
import PerformanceDashboard from "..\..\components\manager\PerformanceDashboard";

export default function ManagerDashboard() {
  return (
    <div className="space-y-6">
      <TimesheetApproval />
      <PerformanceDashboard />
    </div>
  );
}
