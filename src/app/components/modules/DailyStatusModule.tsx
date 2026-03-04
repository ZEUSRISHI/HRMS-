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
import { FileText, MessageCircle, Plus } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { mockUsers } from "../../data/mockData";
import { format } from "date-fns";

const STATUS_KEY = "startup_daily_status";

export function DailyStatusModule() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isAdmin = currentUser.role === "admin";
  const isManager = currentUser.role === "manager";

  /* ================= TOAST ================= */

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  /* ================= STATE ================= */

  const [statusList, setStatusList] = useState<any[]>([]);

  const [overallStatus, setOverallStatus] = useState("");
  const [achievements, setAchievements] = useState("");
  const [blockers, setBlockers] = useState("");
  const [nextPlan, setNextPlan] = useState("");
  const [commentText, setCommentText] = useState("");

  /* ================= LOAD FROM LOCAL ================= */

  useEffect(() => {
    const saved = localStorage.getItem(STATUS_KEY);
    if (saved) {
      setStatusList(JSON.parse(saved));
    }
  }, []);

  /* ================= SAVE TO LOCAL ================= */

  useEffect(() => {
    localStorage.setItem(STATUS_KEY, JSON.stringify(statusList));
  }, [statusList]);

  /* ================= FILTER BASED ON ROLE ================= */

  const statusUpdates = isAdmin
    ? statusList // Admin sees all
    : statusList.filter((s) => s.userId === currentUser.id);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const todayStatus = statusList.find(
    (s) => s.userId === currentUser.id && s.date === todayStr
  );

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

  /* ================= UI ================= */

  return (
    <div className="space-y-8 relative">
      {toast && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Daily Status Updates</h1>
          <p className="text-sm text-muted-foreground">
            Track and share your daily progress
          </p>
        </div>

        {/* ✅ Submit button now available for Admin also */}
        {!todayStatus && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Submit Status
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Status Update — {format(new Date(), "MMMM d, yyyy")}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div>
                  <Label>Overall Status *</Label>
                  <Textarea
                    rows={3}
                    value={overallStatus}
                    onChange={(e) => setOverallStatus(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Today’s Achievements *</Label>
                  <Textarea
                    rows={4}
                    value={achievements}
                    onChange={(e) => setAchievements(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Blockers</Label>
                  <Textarea
                    rows={3}
                    value={blockers}
                    onChange={(e) => setBlockers(e.target.value)}
                  />
                </div>

                <div>
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

      {/* TODAY STATUS (For Everyone Including Admin) */}
      {todayStatus && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Today — {format(new Date(todayStatus.date), "MMMM d, yyyy")}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
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
                <CardHeader className="flex justify-between">
                  <div>
                    {isAdmin && (
                      <p className="font-medium">{user?.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(status.date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge>{status.status}</Badge>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p>{status.achievements}</p>

                  {(isManager || isAdmin) && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Comment
                        </Button>
                      </DialogTrigger>

                      <DialogContent>
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

                  {/* Show comments */}
                  {status.managerComments?.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      {status.managerComments.map((c: any) => {
                        const manager = mockUsers.find(
                          (u) => u.id === c.managerId
                        );
                        return (
                          <div key={c.id} className="text-sm bg-muted p-2 rounded">
                            <p className="font-medium">{manager?.name}</p>
                            <p>{c.comment}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(c.timestamp), "MMM d, yyyy h:mm a")}
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