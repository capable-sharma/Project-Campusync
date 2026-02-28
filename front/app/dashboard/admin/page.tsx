// @ts-nocheck

"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Calendar,
  Plus,
  Shield,
  Users,
  Clock,
  MapPin,
  Bell,
  User,
  LogOut,
  BookOpen,
  GraduationCap,
  Building,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL + "/api" || 'http://localhost:3001/api'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
  hover: {
    y: -5,
    scale: 1.02,
    transition: { duration: 0.2 },
  },
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null)
  const [events, setEvents] = useState([])
  const [pendingEvents, setPendingEvents] = useState([])
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeClubs: 0,
    totalEvents: 0,
    pendingApproval: 0
  })
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    venue: "",
    tags: "",
  })
  const { toast } = useToast()

  // API utility function
  const apiCall = async (endpoint, options = {}) => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      throw new Error('No authentication token found')
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Request failed')
    }

    return response.json()
  }

  // Load user data
  const loadUser = async () => {
    try {
      const data = await apiCall('/auth/me')
      setUser(data.user)
      
      if (data.user.role !== 'Admin') {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        })
        // Redirect to appropriate dashboard
        window.location.href = '/dashboard'
      }
    } catch (error) {
      console.error('Failed to load user:', error)
      toast({
        title: "Authentication Error",
        description: "Please log in again",
        variant: "destructive",
      })
      localStorage.removeItem('token')
      window.location.href = '/auth'
    }
  }

  // Load admin statistics
  const loadStats = async () => {
    try {
      const data = await apiCall('/stats/admin')
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
      toast({
        title: "Error",
        description: "Failed to load statistics",
        variant: "destructive",
      })
    }
  }

  // Load all events (approved academic events)
  const loadEvents = async () => {
    try {
      const data = await apiCall('/events')
      // Filter for academic events only
      const academicEvents = data.events.filter(event => event.type === 'academic')
      setEvents(academicEvents)
    } catch (error) {
      console.error('Failed to load events:', error)
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      })
    }
  }

  // Load pending events for approval
  const loadPendingEvents = async () => {
    try {
      const data = await apiCall('/events/pending')
      setPendingEvents(data.events)
    } catch (error) {
      console.error('Failed to load pending events:', error)
      toast({
        title: "Error",
        description: "Failed to load pending events",
        variant: "destructive",
      })
    }
  }

  // Create new academic event
  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.description || !newEvent.date || !newEvent.time || !newEvent.venue) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setCreating(true)
    try {
      await apiCall('/events', {
        method: 'POST',
        body: JSON.stringify(newEvent),
      })

      toast({
        title: "Success",
        description: "Academic event created successfully",
      })

      setNewEvent({
        title: "",
        description: "",
        date: "",
        time: "",
        venue: "",
        tags: "",
      })
      setShowCreateForm(false)
      
      // Refresh data
      await Promise.all([loadEvents(), loadStats()])
    } catch (error) {
      console.error('Failed to create event:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  // Approve a pending event
  const handleApproveEvent = async (eventId) => {
    try {
      await apiCall(`/events/${eventId}/approve`, {
        method: 'POST',
      })

      toast({
        title: "Success",
        description: "Event approved successfully",
      })

      // Refresh data
      await Promise.all([loadPendingEvents(), loadStats()])
    } catch (error) {
      console.error('Failed to approve event:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to approve event",
        variant: "destructive",
      })
    }
  }

  // Delete an event
  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return
    }

    try {
      await apiCall(`/events/${eventId}`, {
        method: 'DELETE',
      })

      toast({
        title: "Success",
        description: "Event deleted successfully",
      })

      // Refresh data
      await Promise.all([loadEvents(), loadPendingEvents(), loadStats()])
    } catch (error) {
      console.error('Failed to delete event:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete event",
        variant: "destructive",
      })
    }
  }

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/auth'
  }

  // Load all data on component mount
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true)
      try {
        await loadUser()
        await Promise.all([
          loadStats(),
          loadEvents(),
          loadPendingEvents(),
        ])
      } catch (error) {
        console.error('Failed to initialize data:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeData()
  }, [])

  // Refresh data
  const refreshData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadStats(),
        loadEvents(),
        loadPendingEvents(),
      ])
      toast({
        title: "Success",
        description: "Data refreshed successfully",
      })
    } catch (error) {
      console.error('Failed to refresh data:', error)
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-white shadow-sm border-b"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} transition={{ duration: 0.2 }}>
                  <Calendar className="h-6 w-6 text-blue-600" />
                </motion.div>
                <span className="text-xl font-bold text-gray-900">Campusync</span>
              </Link>
              <Badge variant="default">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="sm" onClick={refreshData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="sm">
                  <Bell className="h-4 w-4" />
                  {stats.pendingApproval > 0 && (
                    <motion.span
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      {stats.pendingApproval}
                    </motion.span>
                  )}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.header>

      <motion.div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome Section */}
        <motion.div className="mb-8" variants={itemVariants}>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage academic events and oversee campus activities.</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid md:grid-cols-4 gap-6 mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            { title: "Total Students", value: stats.totalStudents, icon: GraduationCap, color: "blue" },
            { title: "Active Clubs", value: stats.activeClubs, icon: Building, color: "green" },
            { title: "Academic Events", value: stats.totalEvents, icon: BookOpen, color: "purple" },
            { title: "Pending Approvals", value: stats.pendingApproval, icon: AlertTriangle, color: "red" },
          ].map((stat, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <motion.p
                        className={`text-3xl font-bold text-${stat.color}-600`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 + index * 0.1, duration: 0.5, type: "spring" }}
                      >
                        {stat.value}
                      </motion.p>
                    </div>
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                    >
                      <stat.icon className={`h-8 w-8 text-${stat.color}-600`} />
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Dashboard Tabs */}
        <motion.div variants={itemVariants}>
          <Tabs defaultValue="academic" className="space-y-6">
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="academic">Academic Events</TabsTrigger>
                <TabsTrigger value="club-oversight">
                  Club Oversight
                  {stats.pendingApproval > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      {stats.pendingApproval}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="calendar">Campus Calendar</TabsTrigger>
              </TabsList>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={() => setShowCreateForm(true)} disabled={creating}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Academic Event
                </Button>
              </motion.div>
            </div>

            <TabsContent value="academic" className="space-y-6">
              <AnimatePresence>
                {showCreateForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -50, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Create Academic Event</CardTitle>
                        <CardDescription>
                          Create official academic events like exams, holidays, and ceremonies.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="title">Event Title *</Label>
                            <motion.div whileFocus={{ scale: 1.02 }}>
                              <Input
                                id="title"
                                placeholder="Enter event title"
                                value={newEvent.title}
                                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                              />
                            </motion.div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="venue">Venue *</Label>
                            <motion.div whileFocus={{ scale: 1.02 }}>
                              <Input
                                id="venue"
                                placeholder="Enter venue"
                                value={newEvent.venue}
                                onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                              />
                            </motion.div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description *</Label>
                          <motion.div whileFocus={{ scale: 1.02 }}>
                            <Textarea
                              id="description"
                              placeholder="Enter event description"
                              value={newEvent.description}
                              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                            />
                          </motion.div>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="date">Date *</Label>
                            <motion.div whileFocus={{ scale: 1.02 }}>
                              <Input
                                id="date"
                                type="date"
                                value={newEvent.date}
                                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                              />
                            </motion.div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="time">Time *</Label>
                            <motion.div whileFocus={{ scale: 1.02 }}>
                              <Input
                                id="time"
                                type="time"
                                value={newEvent.time}
                                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                              />
                            </motion.div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="tags">Tags (comma-separated)</Label>
                            <motion.div whileFocus={{ scale: 1.02 }}>
                              <Input
                                id="tags"
                                placeholder="e.g., exam, important, cse"
                                value={newEvent.tags}
                                onChange={(e) => setNewEvent({ ...newEvent, tags: e.target.value })}
                              />
                            </motion.div>
                          </div>
                        </div>
                        <div className="flex space-x-4">
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button onClick={handleCreateEvent} disabled={creating}>
                              {creating ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Creating...
                                </>
                              ) : (
                                'Create Event'
                              )}
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                              Cancel
                            </Button>
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {events.map((event, index) => (
                  <motion.div key={event.id} variants={cardVariants} whileHover="hover" custom={index}>
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          <Badge variant="default">{event.type}</Badge>
                        </div>
                        <CardDescription>{event.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            {new Date(event.date).toLocaleDateString()} at {event.time}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            {event.venue}
                          </div>
                          {event.tags && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {String(event.tags).split(',').filter(tag => tag.trim()).map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {tag.trim()}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button variant="outline" size="sm" className="w-full">
                              Edit
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDeleteEvent(event.id)}
                            >
                              Delete
                            </Button>
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </TabsContent>

            <TabsContent value="club-oversight" className="space-y-6">
              <motion.div
                className="grid gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Club Events</CardTitle>
                    <CardDescription>
                      Review and approve club events that require administrative approval
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
                      {pendingEvents.length === 0 ? (
                        <div className="text-center py-8">
                          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                          <p className="text-gray-500">No pending events to review</p>
                        </div>
                      ) : (
                        pendingEvents.map((event, index) => (
                          <motion.div
                            key={event.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                            variants={itemVariants}
                            whileHover={{ scale: 1.02, backgroundColor: "#f9fafb" }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="flex-1">
                              <h4 className="font-semibold">{event.title}</h4>
                              <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {new Date(event.date).toLocaleDateString()} at {event.time}
                                </span>
                                <span className="flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {event.venue}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary">Pending</Badge>
                              <div className="flex space-x-2">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleApproveEvent(event.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleDeleteEvent(event.id)}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </motion.div>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Card>
                  <CardContent className="text-center py-12">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    >
                      <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    </motion.div>
                    <p className="text-lg font-medium text-gray-700 mb-2">Campus-Wide Calendar</p>
                    <p className="text-gray-500">Unified view of all academic and club events to prevent conflicts</p>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </div>
  )
}