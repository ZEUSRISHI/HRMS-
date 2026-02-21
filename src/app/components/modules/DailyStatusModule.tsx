import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { FileText, MessageCircle, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mockDailyStatus, mockUsers } from '../../data/mockData';
import { format } from 'date-fns';

const STATUS_KEY = "startup_daily_status";

export function DailyStatusModule() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isManager = currentUser.role === 'manager' || currentUser.role === 'admin';

  /* ================= STATE ================= */

  const [statusList, setStatusList] = useState(mockDailyStatus);

  const [overallStatus, setOverallStatus] = useState('');
  const [achievements, setAchievements] = useState('');
  const [blockers, setBlockers] = useState('');
  const [nextPlan, setNextPlan] = useState('');

  const [commentText, setCommentText] = useState('');

  /* ================= LOAD LOCAL ================= */

  useEffect(() => {
    const saved = localStorage.getItem(STATUS_KEY);
    if (saved) setStatusList(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(STATUS_KEY, JSON.stringify(statusList));
  }, [statusList]);

  /* ================= FILTER ================= */

  const statusUpdates = isManager
    ? statusList
    : statusList.filter(s => s.userId === currentUser.id);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const todayStatus = statusList.find(
    s => s.userId === currentUser.id && s.date === todayStr
  );

  /* ================= SUBMIT STATUS ================= */

  const submitStatus = () => {
    if (!overallStatus || !achievements) {
      alert("Status and achievements are required");
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
      managerComments: []
    };

    setStatusList(prev => [newStatus, ...prev]);

    setOverallStatus('');
    setAchievements('');
    setBlockers('');
    setNextPlan('');
  };

  /* ================= ADD COMMENT ================= */

  const addComment = (statusId: string) => {
    if (!commentText) return;

    const newComment = {
      id: crypto.randomUUID(),
      managerId: currentUser.id,
      comment: commentText,
      timestamp: new Date().toISOString()
    };

    setStatusList(prev =>
      prev.map(s =>
        s.id === statusId
          ? { ...s, managerComments: [...(s.managerComments || []), newComment] }
          : s
      )
    );

    setCommentText('');
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold mb-2">Daily Status Updates</h1>
          <p className="text-sm text-muted-foreground">Submit and review daily work progress</p>
        </div>

        {!todayStatus && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Submit Today's Status
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Daily Status Update - {format(new Date(), 'MMMM d, yyyy')}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Overall Status *</Label>
                  <Textarea rows={2} value={overallStatus}
                    onChange={e=>setOverallStatus(e.target.value)} />
                </div>

                <div>
                  <Label>Today's Achievements *</Label>
                  <Textarea rows={4} value={achievements}
                    onChange={e=>setAchievements(e.target.value)} />
                </div>

                <div>
                  <Label>Blockers</Label>
                  <Textarea rows={3} value={blockers}
                    onChange={e=>setBlockers(e.target.value)} />
                </div>

                <div>
                  <Label>Tomorrow's Plan</Label>
                  <Textarea rows={3} value={nextPlan}
                    onChange={e=>setNextPlan(e.target.value)} />
                </div>

                <Button className="w-full" onClick={submitStatus}>
                  Submit Status Update
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* TODAY STATUS */}
      {todayStatus && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Today's Status - {format(new Date(todayStatus.date), 'MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
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
          {statusUpdates.map(status => {
            const user = mockUsers.find(u => u.id === status.userId);

            return (
              <Card key={status.id}>
                <CardHeader>
                  {isManager && <p className="font-medium">{user?.name}</p>}
                  <Badge>{status.status}</Badge>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p>{status.achievements}</p>

                  {isManager && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <MessageCircle className="h-4 w-4" />
                          Add Comment
                        </Button>
                      </DialogTrigger>

                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Manager Comment</DialogTitle>
                        </DialogHeader>

                        <Textarea
                          value={commentText}
                          onChange={e=>setCommentText(e.target.value)}
                        />

                        <Button onClick={()=>addComment(status.id)}>
                          Submit Comment
                        </Button>
                      </DialogContent>
                    </Dialog>
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