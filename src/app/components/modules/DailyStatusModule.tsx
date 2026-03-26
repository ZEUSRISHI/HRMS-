import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { FileText, MessageCircle, Plus, Download } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { dailyStatusApi } from "@/services/api";
import { format } from "date-fns";

export function DailyStatusModule() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isAdmin   = currentUser.role === "admin";
  const isManager = currentUser.role === "manager";
  const canView   = isAdmin || isManager;

  const [statuses, setStatuses]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState("");
  const [commentText, setCommentText] = useState("");

  const [form, setForm] = useState({
    status:       "",
    achievements: "",
    blockers:     "",
    nextDayPlan:  "",
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  /* ===== LOAD STATUSES FROM API ===== */
  const loadStatuses = async () => {
    try {
      setLoading(true);
      const data = canView
        ? await dailyStatusApi.getAll()
        : await dailyStatusApi.getMy();
      setStatuses(data.statuses || []);
    } catch (err: any) {
      console.error("Load statuses error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatuses();
  }, []);

  const today = format(new Date(), "yyyy-MM-dd");

  const todayStatus = statuses.find(
    (s) =>
      (s.userId?._id || s.userId) === currentUser.id &&
      s.date === today
  );

  /* ===== SUBMIT STATUS ===== */
  const submitStatus = async () => {
    if (!form.status || !form.achievements) {
      showToast("Please fill required fields");
      return;
    }

    try {
      await dailyStatusApi.submit(form);
      showToast("✅ Daily status submitted");
      setForm({ status: "", achievements: "", blockers: "", nextDayPlan: "" });
      await loadStatuses();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  /* ===== ADD COMMENT ===== */
  const addComment = async (statusId: string) => {
    if (!commentText.trim()) return;

    try {
      await dailyStatusApi.addComment(statusId, commentText);
      showToast("✅ Comment added");
      setCommentText("");
      await loadStatuses();
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
  };

  /* ===== DOWNLOAD REPORT ===== */
  const downloadReport = () => {
    const headers = ["Employee", "Date", "Status", "Achievements", "Blockers", "Next Day Plan"];
    const rows = statuses.map((s) => [
      s.userId?.name || "Unknown",
      s.date,
      s.status,
      s.achievements,
      s.blockers || "-",
      s.nextDayPlan || "-",
    ]);
    const csv = "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((r) => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = "daily_status_report.csv";
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-3 sm:px-6">

      {/* TOAST */}
      {toast && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Daily Status Updates</h1>
          <p className="text-sm text-gray-500">
            Track and share your daily progress
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <Button variant="outline" onClick={downloadReport} className="gap-2">
              <Download className="h-4 w-4" /> Download Report
            </Button>
          )}

          {!todayStatus && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Submit Status
                </Button>
              </DialogTrigger>

              <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Status Update — {format(new Date(), "MMMM d, yyyy")}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  <div className="space-y-1">
                    <Label>Overall Status *</Label>
                    <Textarea
                      rows={2}
                      placeholder="On Track / Blocked / Completed"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Today's Achievements *</Label>
                    <Textarea
                      rows={4}
                      placeholder="What did you accomplish today?"
                      value={form.achievements}
                      onChange={(e) => setForm({ ...form, achievements: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Blockers</Label>
                    <Textarea
                      rows={2}
                      placeholder="Any blockers? (optional)"
                      value={form.blockers}
                      onChange={(e) => setForm({ ...form, blockers: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Next Day Plan</Label>
                    <Textarea
                      rows={2}
                      placeholder="What will you work on tomorrow? (optional)"
                      value={form.nextDayPlan}
                      onChange={(e) => setForm({ ...form, nextDayPlan: e.target.value })}
                    />
                  </div>

                  <Button className="w-full" onClick={submitStatus}>
                    Submit Status
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* TODAY STATUS */}
      {todayStatus && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-orange-500" />
              Today — {format(new Date(), "MMMM d, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Status:</strong> {todayStatus.status}</p>
            <p><strong>Achievements:</strong> {todayStatus.achievements}</p>
            {todayStatus.blockers && (
              <p><strong>Blockers:</strong> {todayStatus.blockers}</p>
            )}
            {todayStatus.nextDayPlan && (
              <p><strong>Tomorrow:</strong> {todayStatus.nextDayPlan}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* STATUS LIST */}
      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {statuses.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">
              No status updates yet
            </p>
          )}

          {statuses.map((status) => (
            <Card key={status._id} className="border">
              <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-2">
                <div>
                  {canView && status.userId?.name && (
                    <p className="font-medium text-sm">{status.userId.name}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {format(new Date(status.date), "MMM d, yyyy")}
                  </p>
                </div>
                <Badge className="w-fit">{status.status}</Badge>
              </CardHeader>

              <CardContent className="space-y-3 text-sm">
                <p>{status.achievements}</p>

                {status.blockers && (
                  <p className="text-orange-600">
                    🚫 Blocker: {status.blockers}
                  </p>
                )}

                {/* COMMENT BUTTON for manager / admin */}
                {canView && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="w-full sm:w-auto">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Add Comment
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="w-[95vw] max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Comment</DialogTitle>
                      </DialogHeader>
                      <Textarea
                        placeholder="Write your feedback..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                      />
                      <Button onClick={() => addComment(status._id)}>
                        Submit Comment
                      </Button>
                    </DialogContent>
                  </Dialog>
                )}

                {/* COMMENTS */}
                {status.managerComments?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    {status.managerComments.map((c: any, i: number) => (
                      <div
                        key={i}
                        className="text-sm bg-gray-50 p-2 rounded-lg"
                      >
                        <p className="font-medium text-xs text-gray-600">
                          {c.managerId?.name || "Manager"}
                        </p>
                        <p>{c.comment}</p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(c.timestamp), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}