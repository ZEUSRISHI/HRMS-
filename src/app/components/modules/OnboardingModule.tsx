import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { UserPlus, UserMinus, CheckCircle2, Upload, Plus } from 'lucide-react';
import { mockOnboarding, mockOffboarding, mockUsers } from '../../data/mockData';
import { format } from 'date-fns';

export function OnboardingModule() {
  const onboardingList = mockOnboarding;
  const offboardingList = mockOffboarding;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold mb-2">Employee Onboarding & Offboarding</h1>
          <p className="text-sm text-muted-foreground">Manage employee lifecycle processes</p>
        </div>
      </div>

      <Tabs defaultValue="onboarding" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="onboarding" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Onboarding
          </TabsTrigger>
          <TabsTrigger value="offboarding" className="gap-2">
            <UserMinus className="h-4 w-4" />
            Offboarding
          </TabsTrigger>
        </TabsList>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="space-y-4">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Start Onboarding
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start Employee Onboarding</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Employee</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Input placeholder="Enter department..." />
                  </div>
                  <div>
                    <Label>Position</Label>
                    <Input placeholder="Enter position..." />
                  </div>
                  <Button className="w-full">Start Onboarding Process</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Onboarding List */}
          {onboardingList.map(onboarding => {
            const user = mockUsers.find(u => u.id === onboarding.userId);
            const completedTasks = onboarding.tasks.filter(t => t.completed).length;
            const progress = (completedTasks / onboarding.tasks.length) * 100;

            return (
              <Card key={onboarding.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{user?.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{user?.position}</p>
                    </div>
                    <Badge variant={onboarding.status === 'completed' ? 'default' : 'secondary'}>
                      {onboarding.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">{format(new Date(onboarding.startDate), 'MMM d, yyyy')}</p>
                    </div>
                    {onboarding.completedDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Completed Date</p>
                        <p className="font-medium">{format(new Date(onboarding.completedDate), 'MMM d, yyyy')}</p>
                      </div>
                    )}
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm">Onboarding Progress</Label>
                      <span className="text-sm font-medium">{completedTasks}/{onboarding.tasks.length} tasks</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Tasks Checklist */}
                  <div>
                    <Label className="text-sm mb-2 block">Onboarding Checklist</Label>
                    <div className="space-y-2">
                      {onboarding.tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-2 p-2 border rounded">
                          {task.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2" />
                          )}
                          <span className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.task}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Documents */}
                  <div>
                    <Label className="text-sm mb-2 flex items-center justify-between">
                      <span>Documents ({onboarding.documents.length})</span>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Upload
                      </Button>
                    </Label>
                    <div className="space-y-2 mt-2">
                      {onboarding.documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="text-sm font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded {format(new Date(doc.uploadDate), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm">View</Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Update Progress</Button>
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {onboardingList.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No active onboarding processes
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Offboarding Tab */}
        <TabsContent value="offboarding" className="space-y-4">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <UserMinus className="h-4 w-4" />
                  Initiate Offboarding
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Initiate Employee Offboarding</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Employee</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Last Working Day</Label>
                    <Input type="date" />
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resignation">Resignation</SelectItem>
                        <SelectItem value="termination">Termination</SelectItem>
                        <SelectItem value="retirement">Retirement</SelectItem>
                        <SelectItem value="contract-end">Contract End</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Additional Notes</Label>
                    <Textarea placeholder="Enter any additional notes..." rows={3} />
                  </div>
                  <Button variant="destructive" className="w-full">Initiate Offboarding</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Offboarding List */}
          {offboardingList.map(offboarding => {
            const user = mockUsers.find(u => u.id === offboarding.userId);
            const clearanceItems = Object.entries(offboarding.clearanceStatus);
            const completedClearances = clearanceItems.filter(([_, completed]) => completed).length;
            const clearanceProgress = (completedClearances / clearanceItems.length) * 100;

            return (
              <Card key={offboarding.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{user?.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{offboarding.reason}</p>
                    </div>
                    <Badge 
                      variant={
                        offboarding.status === 'completed' ? 'default' :
                        offboarding.status === 'in-progress' ? 'secondary' : 'destructive'
                      }
                    >
                      {offboarding.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Last Working Day</p>
                    <p className="font-medium">{format(new Date(offboarding.lastWorkingDay), 'MMM d, yyyy')}</p>
                  </div>

                  {/* Clearance Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm">Clearance Progress</Label>
                      <span className="text-sm font-medium">{completedClearances}/{clearanceItems.length} completed</span>
                    </div>
                    <Progress value={clearanceProgress} className="h-2" />
                  </div>

                  {/* Clearance Checklist */}
                  <div>
                    <Label className="text-sm mb-2 block">Department Clearances</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {clearanceItems.map(([dept, completed]) => (
                        <div key={dept} className="flex items-center gap-2 p-2 border rounded">
                          {completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2" />
                          )}
                          <span className={`text-sm capitalize ${completed ? 'line-through text-muted-foreground' : ''}`}>
                            {dept}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Final Settlement */}
                  {offboarding.finalSettlement && (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <Label className="text-sm mb-2 block">Final Settlement</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Amount</p>
                          <p className="font-semibold">${offboarding.finalSettlement.amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge variant={offboarding.finalSettlement.status === 'processed' ? 'default' : 'secondary'}>
                            {offboarding.finalSettlement.status}
                          </Badge>
                        </div>
                      </div>
                      {offboarding.finalSettlement.date && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Processed on {format(new Date(offboarding.finalSettlement.date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Update Status</Button>
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {offboardingList.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No active offboarding processes
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
