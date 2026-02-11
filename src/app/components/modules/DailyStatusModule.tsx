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

export function DailyStatusModule() {
  const { currentUser } = useAuth();
  const isManager = currentUser.role === 'manager' || currentUser.role === 'admin';

  const statusUpdates = isManager 
    ? mockDailyStatus 
    : mockDailyStatus.filter(s => s.userId === currentUser.id);

  const todayStatus = mockDailyStatus.find(
    s => s.userId === currentUser.id && s.date === format(new Date(), 'yyyy-MM-dd')
  );

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
                <DialogTitle>Daily Status Update - {format(new Date(), 'MMMM d, yyyy')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Overall Status</Label>
                  <Textarea 
                    placeholder="How was your day? (e.g., Productive, Challenging, etc.)" 
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Today's Achievements</Label>
                  <Textarea 
                    placeholder="What did you accomplish today?"
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Blockers / Challenges (Optional)</Label>
                  <Textarea 
                    placeholder="Any blockers or challenges you faced?"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Tomorrow's Plan (Optional)</Label>
                  <Textarea 
                    placeholder="What do you plan to work on tomorrow?"
                    rows={3}
                  />
                </div>
                <Button className="w-full">Submit Status Update</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Today's Status */}
      {todayStatus && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Today's Status - {format(new Date(todayStatus.date), 'MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <p className="text-sm">{todayStatus.status}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Achievements</Label>
              <p className="text-sm">{todayStatus.achievements}</p>
            </div>
            {todayStatus.blockers && (
              <div>
                <Label className="text-xs text-muted-foreground">Blockers</Label>
                <p className="text-sm text-orange-600">{todayStatus.blockers}</p>
              </div>
            )}
            {todayStatus.nextDayPlan && (
              <div>
                <Label className="text-xs text-muted-foreground">Tomorrow's Plan</Label>
                <p className="text-sm">{todayStatus.nextDayPlan}</p>
              </div>
            )}
            {todayStatus.managerComments && todayStatus.managerComments.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Label className="text-xs text-muted-foreground mb-2 block">Manager Comments</Label>
                {todayStatus.managerComments.map(comment => {
                  const manager = mockUsers.find(u => u.id === comment.managerId);
                  return (
                    <div key={comment.id} className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium">{manager?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(comment.timestamp), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <p className="text-sm">{comment.comment}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statusUpdates.map(status => {
              const user = mockUsers.find(u => u.id === status.userId);
              return (
                <Card key={status.id} className="shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        {isManager && (
                          <p className="font-medium text-sm">{user?.name}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(status.date), 'EEEE, MMMM d, yyyy')}
                        </p>
                      </div>
                      <Badge variant="outline">{status.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Achievements</Label>
                      <p className="text-sm mt-1">{status.achievements}</p>
                    </div>
                    {status.blockers && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Blockers</Label>
                        <p className="text-sm mt-1 text-orange-600">{status.blockers}</p>
                      </div>
                    )}
                    {status.nextDayPlan && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Next Day Plan</Label>
                        <p className="text-sm mt-1">{status.nextDayPlan}</p>
                      </div>
                    )}

                    {/* Manager Actions */}
                    {isManager && (
                      <div className="pt-3 border-t">
                        {status.managerComments && status.managerComments.length > 0 && (
                          <div className="mb-3 space-y-2">
                            {status.managerComments.map(comment => {
                              const manager = mockUsers.find(u => u.id === comment.managerId);
                              return (
                                <div key={comment.id} className="bg-muted/50 p-2 rounded text-sm">
                                  <p className="font-medium text-xs">{manager?.name}</p>
                                  <p className="text-muted-foreground">{comment.comment}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                              <MessageCircle className="h-4 w-4" />
                              Add Comment
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Manager Comment</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Comment</Label>
                                <Textarea 
                                  placeholder="Enter your feedback or comments..."
                                  rows={4}
                                />
                              </div>
                              <Button className="w-full">Submit Comment</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
