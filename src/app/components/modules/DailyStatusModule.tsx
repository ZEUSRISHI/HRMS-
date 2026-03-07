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

import {
  FileText,
  MessageCircle,
  Plus,
  Download
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { mockUsers } from "../../data/mockData";
import { format } from "date-fns";

const STATUS_KEY = "startup_daily_status";

export function DailyStatusModule() {

  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isAdmin = currentUser.role === "admin";
  const isManager = currentUser.role === "manager";

  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const [statusList, setStatusList] = useState<any[]>([]);

  const [overallStatus, setOverallStatus] = useState("");
  const [achievements, setAchievements] = useState("");
  const [blockers, setBlockers] = useState("");
  const [nextPlan, setNextPlan] = useState("");
  const [commentText, setCommentText] = useState("");

  /* LOAD */

  useEffect(() => {
    const saved = localStorage.getItem(STATUS_KEY);
    if (saved) {
      setStatusList(JSON.parse(saved));
    }
  }, []);

  /* SAVE */

  useEffect(() => {
    localStorage.setItem(STATUS_KEY, JSON.stringify(statusList));
  }, [statusList]);

  /* FILTER */

  const statusUpdates = isAdmin
    ? statusList
    : statusList.filter((s) => s.userId === currentUser.id);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const todayStatus = statusList.find(
    (s) => s.userId === currentUser.id && s.date === todayStr
  );

  /* ================= ADMIN REPORT ================= */

  const downloadReport = () => {

    const headers = [
      "Employee",
      "Date",
      "Status",
      "Achievements",
      "Blockers",
      "Next Day Plan"
    ];

    const rows = statusList.map((s) => {

      const user = mockUsers.find((u) => u.id === s.userId);

      return [
        user?.name || "Unknown",
        s.date,
        s.status,
        s.achievements,
        s.blockers || "-",
        s.nextDayPlan || "-"
      ];

    });

    const csv =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((r) => r.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = "daily_status_report.csv";
    link.click();
  };

  /* ================= SUBMIT STATUS ================= */

  const submitStatus = () => {

    if (!overallStatus || !achievements) {
      showToast("Please fill required fields");
      return;
    }

    if (todayStatus) {
      showToast("You already submitted today's status");
      return;
    }

    const newStatus = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      date: todayStr,
      status: overallStatus,
      achievements,
      blockers: blockers || undefined,
      nextDayPlan: nextPlan || undefined,
      managerComments: [],
    };

    setStatusList((prev) => [newStatus, ...prev]);

    setOverallStatus("");
    setAchievements("");
    setBlockers("");
    setNextPlan("");

    showToast("Daily status submitted successfully");
  };

  /* ================= ADD COMMENT ================= */

  const addComment = (statusId: string) => {

    if (!commentText) return;

    const newComment = {
      id: crypto.randomUUID(),
      managerId: currentUser.id,
      comment: commentText,
      timestamp: new Date().toISOString(),
    };

    setStatusList((prev) =>
      prev.map((s) =>
        s.id === statusId
          ? {
              ...s,
              managerComments: [...(s.managerComments || []), newComment],
            }
          : s
      )
    );

    setCommentText("");

    showToast("Comment added");
  };

  return (

    <div className="space-y-8 relative max-w-6xl mx-auto px-3 sm:px-6">

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
          <p className="text-sm text-muted-foreground">
            Track and share your daily progress
          </p>
        </div>

        <div className="flex flex-wrap gap-2">

          {/* ADMIN DOWNLOAD */}

          {isAdmin && (

            <Button
              variant="outline"
              onClick={downloadReport}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download Report
            </Button>

          )}

          {!todayStatus && (

            <Dialog>

              <DialogTrigger asChild>

                <Button className="gap-2">

                  <Plus className="h-4 w-4" />
                  Submit Status

                </Button>

              </DialogTrigger>

              <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">

                <DialogHeader>
                  <DialogTitle>
                    Status Update — {format(new Date(), "MMMM d, yyyy")}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-5">

                  <div className="space-y-1">
                    <Label>Overall Status *</Label>
                    <Textarea
                      rows={3}
                      value={overallStatus}
                      onChange={(e) => setOverallStatus(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Today's Achievements *</Label>
                    <Textarea
                      rows={4}
                      value={achievements}
                      onChange={(e) => setAchievements(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Blockers</Label>
                    <Textarea
                      rows={3}
                      value={blockers}
                      onChange={(e) => setBlockers(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Next Day Plan</Label>
                    <Textarea
                      rows={3}
                      value={nextPlan}
                      onChange={(e) => setNextPlan(e.target.value)}
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

        <Card className="border-primary">

          <CardHeader>

            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">

              <FileText className="h-5 w-5" />

              Today — {format(new Date(todayStatus.date), "MMMM d, yyyy")}

            </CardTitle>

          </CardHeader>

          <CardContent className="space-y-2 text-sm sm:text-base">

            <p>{todayStatus.status}</p>

            <p>{todayStatus.achievements}</p>

            {todayStatus.blockers && <p>{todayStatus.blockers}</p>}

            {todayStatus.nextDayPlan && <p>{todayStatus.nextDayPlan}</p>}

          </CardContent>

        </Card>

      )}

      {/* HISTORY */}

      <Card>

        <CardHeader>
          <CardTitle>Status History</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          {statusUpdates.map((status) => {

            const user = mockUsers.find((u) => u.id === status.userId);

            return (

              <Card key={status.id} className="border">

                <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">

                  <div>

                    {isAdmin && (
                      <p className="font-medium">{user?.name}</p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {format(new Date(status.date), "MMM d, yyyy")}
                    </p>

                  </div>

                  <Badge className="w-fit">
                    {status.status}
                  </Badge>

                </CardHeader>

                <CardContent className="space-y-3 text-sm">

                  <p>{status.achievements}</p>

                  {(isManager || isAdmin) && (

                    <Dialog>

                      <DialogTrigger asChild>

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto"
                        >

                          <MessageCircle className="h-4 w-4 mr-1" />

                          Comment

                        </Button>

                      </DialogTrigger>

                      <DialogContent className="w-[95vw] max-w-md">

                        <DialogHeader>
                          <DialogTitle>Add Comment</DialogTitle>
                        </DialogHeader>

                        <Textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                        />

                        <Button onClick={() => addComment(status.id)}>
                          Submit
                        </Button>

                      </DialogContent>

                    </Dialog>

                  )}

                  {status.managerComments?.length > 0 && (

                    <div className="space-y-2 pt-2 border-t">

                      {status.managerComments.map((c: any) => {

                        const manager = mockUsers.find(
                          (u) => u.id === c.managerId
                        );

                        return (

                          <div
                            key={c.id}
                            className="text-sm bg-muted p-2 rounded break-words"
                          >

                            <p className="font-medium">
                              {manager?.name}
                            </p>

                            <p>{c.comment}</p>

                            <p className="text-xs text-muted-foreground">

                              {format(
                                new Date(c.timestamp),
                                "MMM d, yyyy h:mm a"
                              )}

                            </p>

                          </div>

                        );

                      })}

                    </div>

                  )}

                </CardContent>

              </Card>

            );

          })}

        </CardContent>

      </Card>

    </div>
  );
}