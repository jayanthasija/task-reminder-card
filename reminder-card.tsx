"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Bell, CalendarClock, CheckCircle2, AlertCircle, BellOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ReminderCard() {
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
    <Card className="w-full max-w-md mx-auto shadow-md">
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

