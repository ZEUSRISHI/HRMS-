import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { UserPlus, UserMinus, CheckCircle2, Plus } from "lucide-react";

/* ================= TYPES ================= */

type Task = {
  id: string;
  task: string;
  completed: boolean;
};

type OnboardingItem = {
  id: string;
  userId: string;
  userName: string;
  role: string;
  startDate: string;
  status: "in-progress" | "completed";
  startupTrack: boolean;
  tasks: Task[];
  documents: { id: string; name: string; uploadDate: string }[];
};

type ClearanceStatus = {
  hr: boolean;
  it: boolean;
  finance: boolean;
  product: boolean;
};

type OffboardingItem = {
  id: string;
  userId: string;
  userName: string;
  lastWorkingDay: string;
  reason: string;
  status: "pending" | "in-progress" | "completed";
  clearanceStatus: ClearanceStatus;
};

/* ================= MOCK USERS ================= */

const users = [
  { id: "u1", name: "Asha", role: "Frontend Dev" },
  { id: "u2", name: "Ravi", role: "Backend Dev" },
  { id: "u3", name: "Meera", role: "HR" },
];

/* ================= STARTUP TASK TEMPLATE ================= */

const startupTasks = [
  "Offer letter signed",
  "Startup policy briefing",
  "Git + Repo access",
  "Product demo walkthrough",
  "First sprint assigned",
];

/* ================= COMPONENT ================= */

export function OnboardingModule() {

  const [onboardingList, setOnboardingList] = useState<OnboardingItem[]>([]);
  const [offboardingList, setOffboardingList] = useState<OffboardingItem[]>([]);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [startDate, setStartDate] = useState("");

  const [offUserId, setOffUserId] = useState("");
  const [lastDay, setLastDay] = useState("");
  const [reason, setReason] = useState("");

  const [popup, setPopup] = useState("");

  function showPopup(message: string) {
    setPopup(message);
    setTimeout(() => setPopup(""), 2500);
  }

  function makeId() {
    return crypto.randomUUID();
  }

  function startOnboarding() {

    if (!selectedUserId || !startDate) return;

    const user = users.find((u) => u.id === selectedUserId);
    if (!user) return;

    const tasks: Task[] = startupTasks.map((t) => ({
      id: makeId(),
      task: t,
      completed: false,
    }));

    const item: OnboardingItem = {
      id: makeId(),
      userId: user.id,
      userName: user.name,
      role: user.role,
      startDate,
      status: "in-progress",
      startupTrack: true,
      tasks,
      documents: [],
    };

    setOnboardingList((prev) => [...prev, item]);
    showPopup("Onboarding created successfully 🎉");
  }

  function toggleTask(onboardingId: string, taskId: string) {

    setOnboardingList((prev) =>
      prev.map((o) => {

        if (o.id !== onboardingId) return o;

        const updatedTasks = o.tasks.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        );

        const done = updatedTasks.every((t) => t.completed);

        return {
          ...o,
          tasks: updatedTasks,
          status: done ? "completed" : "in-progress",
        };

      })
    );
  }

  function startOffboarding() {

    if (!offUserId || !lastDay || !reason) return;

    const user = users.find((u) => u.id === offUserId);
    if (!user) return;

    const item: OffboardingItem = {
      id: makeId(),
      userId: user.id,
      userName: user.name,
      lastWorkingDay: lastDay,
      reason,
      status: "in-progress",
      clearanceStatus: {
        hr: false,
        it: false,
        finance: false,
        product: false,
      },
    };

    setOffboardingList((prev) => [...prev, item]);
    showPopup("Offboarding initiated 🚀");
  }

  function toggleClearance(offId: string, key: keyof ClearanceStatus) {

    setOffboardingList((prev) =>
      prev.map((o) => {

        if (o.id !== offId) return o;

        const updated = {
          ...o.clearanceStatus,
          [key]: !o.clearanceStatus[key],
        };

        const done = Object.values(updated).every(Boolean);

        return {
          ...o,
          clearanceStatus: updated,
          status: done ? "completed" : "in-progress",
        };

      })
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {popup && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {popup}
        </div>
      )}

      {/* HEADER */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

        <div>
          <h1 className="text-lg sm:text-xl font-semibold">
            Startup Employee Lifecycle
          </h1>

          <p className="text-sm text-muted-foreground">
            Fast onboarding & clean offboarding for startup teams
          </p>
        </div>

      </div>

      <Tabs defaultValue="onboarding" className="space-y-6">

        <TabsList className="grid grid-cols-2 w-full">

          <TabsTrigger value="onboarding" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Onboarding
          </TabsTrigger>

          <TabsTrigger value="offboarding" className="flex items-center gap-2">
            <UserMinus className="h-4 w-4" />
            Offboarding
          </TabsTrigger>

        </TabsList>

        {/* ================= ONBOARDING ================= */}

        <TabsContent value="onboarding" className="space-y-6">

          <div className="flex justify-end">

            <Dialog>

              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  Start Startup Onboarding
                </Button>
              </DialogTrigger>

              <DialogContent className="max-h-[90vh] overflow-y-auto">

                <DialogHeader>
                  <DialogTitle>New Startup Employee</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">

                  <div className="space-y-2">

                    <Label>User</Label>

                    <Select onValueChange={setSelectedUserId}>

                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>

                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>

                    </Select>

                  </div>

                  <div className="space-y-2">

                    <Label>Start Date</Label>

                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />

                  </div>

                  <Button className="w-full" onClick={startOnboarding}>
                    Create Onboarding Track
                  </Button>

                </div>

              </DialogContent>

            </Dialog>

          </div>

          {onboardingList.map((o) => {

            const done = o.tasks.filter((t) => t.completed).length;
            const progress = (done / o.tasks.length) * 100;

            return (

              <Card key={o.id} className="rounded-xl">

                <CardHeader className="flex flex-row items-center justify-between">

                  <div>
                    <CardTitle className="text-base">{o.userName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{o.role}</p>
                  </div>

                  <Badge>{o.status}</Badge>

                </CardHeader>

                <CardContent className="space-y-4">

                  <Progress value={progress} />

                  <div className="space-y-2">

                    {o.tasks.map((t) => (

                      <div
                        key={t.id}
                        onClick={() => toggleTask(o.id, t.id)}
                        className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition"
                      >

                        <CheckCircle2
                          className={`h-4 w-4 ${
                            t.completed ? "text-green-600" : "opacity-30"
                          }`}
                        />

                        <span
                          className={
                            t.completed
                              ? "line-through text-muted-foreground"
                              : ""
                          }
                        >
                          {t.task}
                        </span>

                      </div>

                    ))}

                  </div>

                </CardContent>

              </Card>

            );
          })}

        </TabsContent>

        {/* ================= OFFBOARDING ================= */}

        <TabsContent value="offboarding" className="space-y-6">

          <div className="flex justify-end">

            <Dialog>

              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  Start Offboarding
                </Button>
              </DialogTrigger>

              <DialogContent className="max-h-[90vh] overflow-y-auto">

                <DialogHeader>
                  <DialogTitle>Offboard Employee</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">

                  <Select onValueChange={setOffUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>

                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="date"
                    value={lastDay}
                    onChange={(e) => setLastDay(e.target.value)}
                  />

                  <Textarea
                    placeholder="Reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />

                  <Button variant="destructive" onClick={startOffboarding}>
                    Create Offboarding
                  </Button>

                </div>

              </DialogContent>

            </Dialog>

          </div>

          {offboardingList.map((o) => (

            <Card key={o.id} className="rounded-xl">

              <CardHeader className="flex flex-row items-center justify-between">

                <CardTitle className="text-base">{o.userName}</CardTitle>
                <Badge>{o.status}</Badge>

              </CardHeader>

              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                {(Object.keys(o.clearanceStatus) as (keyof ClearanceStatus)[]).map(
                  (k) => (

                    <Button
                      key={k}
                      variant={o.clearanceStatus[k] ? "default" : "outline"}
                      onClick={() => toggleClearance(o.id, k)}
                    >
                      {k.toUpperCase()}
                    </Button>

                  )
                )}

              </CardContent>

            </Card>

          ))}

        </TabsContent>

      </Tabs>

    </div>
  );
}