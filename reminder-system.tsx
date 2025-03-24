"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Bell, CalendarClock, CheckCircle2, AlertCircle, BellOff, Trash2, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

// Define the Reminder type
interface Reminder {
  id: string
  task: string
  time: string
  notifications: boolean
  completed: boolean
}

export default function ReminderSystem() {
  const [reminders, setReminders] = useState<Reminder[]>([])

  // Load reminders from localStorage on component mount
  useEffect(() => {
    const savedReminders = localStorage.getItem("reminders")
    if (savedReminders) {
      try {
        setReminders(JSON.parse(savedReminders))
      } catch (e) {
        console.error("Error loading reminders:", e)
      }
    }
  }, [])

  // Save reminders to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("reminders", JSON.stringify(reminders))
  }, [reminders])

  const addReminder = (reminder: Reminder) => {
    setReminders((prev) => [...prev, reminder].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()))
  }

  const deleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((reminder) => reminder.id !== id))
    toast({
      title: "Reminder deleted",
      description: "The reminder has been removed",
    })
  }

  const toggleComplete = (id: string) => {
    setReminders((prev) =>
      prev.map((reminder) => (reminder.id === id ? { ...reminder, completed: !reminder.completed } : reminder)),
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/20">
      <div className="w-full max-w-4xl space-y-8">
        <ReminderCard addReminder={addReminder} />

        <UpcomingReminders reminders={reminders} onDelete={deleteReminder} onToggleComplete={toggleComplete} />
      </div>
    </div>
  )
}

// ReminderCard component for creating new reminders
function ReminderCard({ addReminder }: { addReminder: (reminder: Reminder) => void }) {
  const [task, setTask] = useState("")
  const [time, setTime] = useState("")
  const [notifications, setNotifications] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ task?: string; time?: string; notification?: string }>({})
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "default">("default")

  // Check notification permission on component mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const permission = await Notification.requestPermission()
        setNotificationPermission(permission)
        return permission
      } catch (error) {
        console.error("Error requesting notification permission:", error)
        return "denied"
      }
    }
    return "denied"
  }

  const showBrowserNotification = (title: string, body: string) => {
    if (notificationPermission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
        })
      } catch (error) {
        console.error("Error showing notification:", error)
      }
    }
  }

  const validateForm = () => {
    const newErrors: { task?: string; time?: string; notification?: string } = {}

    if (!task.trim()) {
      newErrors.task = "Please enter a task description"
    }

    if (!time) {
      newErrors.time = "Please select a time for your reminder"
    } else {
      const selectedTime = new Date(time).getTime()
      const currentTime = new Date().getTime()

      if (selectedTime <= currentTime) {
        newErrors.time = "Please select a future time"
      }
    }

    if (notifications && notificationPermission === "denied") {
      newErrors.notification = "Notifications are blocked by your browser"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate form
      if (!validateForm()) {
        setIsSubmitting(false)
        return
      }

      // Request notification permission if needed
      if (notifications && notificationPermission !== "granted") {
        const permission = await requestNotificationPermission()
        if (permission !== "granted") {
          setErrors((prev) => ({
            ...prev,
            notification: "Please allow notifications to receive reminders",
          }))
          setIsSubmitting(false)
          return
        }
      }

      // Create new reminder
      const newReminder: Reminder = {
        id: Date.now().toString(),
        task,
        time,
        notifications,
        completed: false,
      }

      // Add to reminders list
      addReminder(newReminder)

      // Success! Show toast and browser notification
      toast({
        title: "Reminder set!",
        description: `You'll be reminded about "${task}" at ${new Date(time).toLocaleString()}`,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      })

      if (notifications && notificationPermission === "granted") {
        showBrowserNotification(
          "Reminder Set",
          `You'll be reminded about "${task}" at ${new Date(time).toLocaleString()}`,
        )
      }

      // Reset form
      setTask("")
      setTime("")
      setErrors({})
    } catch (error) {
      console.error("Error setting reminder:", error)
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="bg-primary/5">
        <CardTitle className="flex items-center gap-2 text-xl">
          <CalendarClock className="h-5 w-5" />
          New Reminder
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6 space-y-4">
          {/* Notification permission alert */}
          {notifications && notificationPermission === "denied" && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Notifications are blocked. Please update your browser settings to enable notifications.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="task" className={errors.task ? "text-destructive" : ""}>
              Task
            </Label>
            <Input
              id="task"
              placeholder="What do you need to remember?"
              value={task}
              onChange={(e) => {
                setTask(e.target.value)
                if (errors.task) setErrors({ ...errors, task: undefined })
              }}
              className={errors.task ? "border-destructive" : ""}
            />
            {errors.task && <p className="text-sm text-destructive mt-1">{errors.task}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="time" className={errors.time ? "text-destructive" : ""}>
              Time
            </Label>
            <Input
              id="time"
              type="datetime-local"
              value={time}
              onChange={(e) => {
                setTime(e.target.value)
                if (errors.time) setErrors({ ...errors, time: undefined })
              }}
              className={errors.time ? "border-destructive" : ""}
            />
            {errors.time && <p className="text-sm text-destructive mt-1">{errors.time}</p>}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {notifications ? (
                <Bell className="h-4 w-4 text-muted-foreground" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
              <Label htmlFor="notifications" className="text-sm font-medium">
                Enable notifications
              </Label>
            </div>
            <Switch
              id="notifications"
              checked={notifications}
              onCheckedChange={(checked) => {
                setNotifications(checked)
                if (checked && notificationPermission !== "granted") {
                  requestNotificationPermission()
                }
                if (errors.notification) setErrors({ ...errors, notification: undefined })
              }}
            />
          </div>
          {errors.notification && <p className="text-sm text-destructive mt-1">{errors.notification}</p>}
        </CardContent>

        <CardFooter className="bg-muted/20 flex justify-end">
          <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
            {isSubmitting ? "Setting Reminder..." : "Set Reminder"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

// UpcomingReminders component to display the list of reminders
function UpcomingReminders({
  reminders,
  onDelete,
  onToggleComplete,
}: {
  reminders: Reminder[]
  onDelete: (id: string) => void
  onToggleComplete: (id: string) => void
}) {
  // Filter out past reminders
  const currentTime = new Date().getTime()
  const activeReminders = reminders.filter(
    (reminder) => new Date(reminder.time).getTime() > currentTime || !reminder.completed,
  )

  if (activeReminders.length === 0) {
    return (
      <Card className="w-full shadow-md">
        <CardHeader className="bg-primary/5">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-5 w-5" />
            Upcoming Reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center text-muted-foreground">
          No upcoming reminders. Create one above!
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="bg-primary/5">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Clock className="h-5 w-5" />
          Upcoming Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="py-4">
        <div className="space-y-4">
          {activeReminders.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              onDelete={onDelete}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Individual reminder item component
function ReminderItem({
  reminder,
  onDelete,
  onToggleComplete,
}: {
  reminder: Reminder
  onDelete: (id: string) => void
  onToggleComplete: (id: string) => void
}) {
  const reminderTime = new Date(reminder.time)
  const currentTime = new Date()
  const isPast = reminderTime < currentTime
  const isToday = reminderTime.toDateString() === currentTime.toDateString()

  // Format the time
  const timeString = reminderTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const dateString = reminderTime.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: currentTime.getFullYear() !== reminderTime.getFullYear() ? "numeric" : undefined,
  })

  return (
    <div
      className={`p-4 rounded-lg border ${reminder.completed ? "bg-muted/50" : "bg-card"} ${isPast && !reminder.completed ? "border-orange-200" : "border-border"}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full h-6 w-6 p-0 ${reminder.completed ? "bg-primary text-primary-foreground" : "border border-input"}`}
            onClick={() => onToggleComplete(reminder.id)}
            aria-label={reminder.completed ? "Mark as incomplete" : "Mark as complete"}
          >
            {reminder.completed && <CheckCircle2 className="h-4 w-4" />}
          </Button>

          <div className="space-y-1">
            <p className={`font-medium ${reminder.completed ? "line-through text-muted-foreground" : ""}`}>
              {reminder.task}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {isToday ? "Today" : dateString}, {timeString}
              </span>

              {reminder.notifications && <Bell className="h-3.5 w-3.5 ml-1" />}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPast && !reminder.completed && (
            <Badge variant="outline" className="text-orange-500 border-orange-200 bg-orange-50">
              Overdue
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(reminder.id)}
            aria-label="Delete reminder"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

