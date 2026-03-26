import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Mock performance data
const data = [
  { name: "Alice", completedTasks: 12, pendingTasks: 3 },
  { name: "Bob", completedTasks: 8, pendingTasks: 5 },
  { name: "Charlie", completedTasks: 10, pendingTasks: 2 },
];

export default function PerformanceDashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completedTasks" fill="#34D399" name="Completed Tasks" />
              <Bar dataKey="pendingTasks" fill="#F87171" name="Pending Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
