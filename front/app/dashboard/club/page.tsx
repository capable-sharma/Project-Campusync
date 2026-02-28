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
import { Calendar, Plus, Edit, Trash2, Users, Clock, MapPin, Bell, User, LogOut, Eye, BarChart3, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL + "/api" || 'http://localhost:3001/api'

// API utility functions
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('authToken')
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...options
  }

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body)
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'API request failed')
  }

  return data
}

export default function ClubDashboard() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    totalEvents: 0,
    publishedEvents: 0,
    draftEvents: 0,
    totalAttendees: 0
  })
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    venue: "",
    tags: "",
  })

  // Load user data and events on mount
  useEffect(() => {
    loadUserData()
    loadEvents()
    loadStats()
  }, [])

  const loadUserData = async () => {
    try {
      const userData = await apiRequest('/auth/me')
      setUser(userData.user)
    } catch (err) {
      console.error('Failed to load user data:', err)
      // Redirect to login if token is invalid
      if (err.message.includes('token')) {
        window.location.href = '/auth'
      }
    }
  }

  const loadEvents = async () => {
    try {
      setLoading(true)
      const response = await apiRequest('/events/my')
      setEvents(response.events || [])
      setError(null)
    } catch (err) {
      setError('Failed to load events: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await apiRequest('/stats/club-lead')
      setStats({
        totalEvents: response.totalEvents || 0,
        publishedEvents: response.approvedEvents || 0,
        draftEvents: response.pendingEvents || 0,
        totalAttendees: response.totalAttendees || 0
      })
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.description || !newEvent.date || !newEvent.time || !newEvent.venue) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      await apiRequest('/events', {
        method: 'POST',
        body: newEvent
      })
      
      setSuccess('Event created successfully!')
      setNewEvent({
        title: "",
        description: "",
        date: "",
        time: "",
        venue: "",
        tags: "",
      })
      setShowCreateForm(false)
      loadEvents()
      loadStats()
    } catch (err) {
      setError('Failed to create event: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateEvent = async () => {
    if (!editingEvent) return

    try {
      setSubmitting(true)
      await apiRequest(`/events/${editingEvent.id}`, {
        method: 'PUT',
        body: {
          title: editingEvent.title,
          description: editingEvent.description,
          date: editingEvent.date,
          time: editingEvent.time,
          venue: editingEvent.venue,
          tags: editingEvent.tags
        }
      })
      
      setSuccess('Event updated successfully!')
      setEditingEvent(null)
      loadEvents()
    } catch (err) {
      setError('Failed to update event: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return
    }

    try {
      await apiRequest(`/events/${eventId}`, {
        method: 'DELETE'
      })
      
      setSuccess('Event deleted successfully!')
      loadEvents()
      loadStats()
    } catch (err) {
      setError('Failed to delete event: ' + err.message)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    window.location.href = '/auth'
  }

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  // Animation variants
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
              <div className="flex items-center space-x-2">
                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} transition={{ duration: 0.2 }}>
                  <Calendar className="h-6 w-6 text-blue-600" />
                </motion.div>
                <span className="text-xl font-bold text-gray-900">Campusync</span>
              </div>
              <Badge variant="secondary">{user?.role || 'Club Lead'}</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name || 'User'}</span>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="sm">
                  <Bell className="h-4 w-4" />
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
        {/* Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="mb-4"
            >
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearMessages}
                    className="ml-2 h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="mb-4"
            >
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {success}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearMessages}
                    className="ml-2 h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Welcome Section */}
        <motion.div className="mb-8" variants={itemVariants}>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Club Dashboard</h1>
          <p className="text-gray-600">Manage your club events and engage with your community.</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid md:grid-cols-4 gap-6 mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            { title: "Total Events", value: stats.totalEvents, icon: Calendar, color: "blue" },
            { title: "Approved", value: stats.publishedEvents, icon: Eye, color: "green" },
            { title: "Pending", value: stats.draftEvents, icon: Clock, color: "yellow" },
            { title: "Total Attendees", value: stats.totalAttendees, icon: Users, color: "purple" },
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
          <Tabs defaultValue="events" className="space-y-6">
            <div className="flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="events">My Events</TabsTrigger>
                <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </motion.div>
            </div>

            <TabsContent value="events" className="space-y-6">
              <AnimatePresence>
                {(showCreateForm || editingEvent) && (
                  <motion.div
                    initial={{ opacity: 0, y: -50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -50, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</CardTitle>
                        <CardDescription>
                          {editingEvent ? 'Update your event details.' : 'Fill in the details for your new event. It will be submitted for approval.'}
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
                                value={editingEvent ? editingEvent.title : newEvent.title}
                                onChange={(e) => editingEvent 
                                  ? setEditingEvent({ ...editingEvent, title: e.target.value })
                                  : setNewEvent({ ...newEvent, title: e.target.value })
                                }
                              />
                            </motion.div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="venue">Venue *</Label>
                            <motion.div whileFocus={{ scale: 1.02 }}>
                              <Input
                                id="venue"
                                placeholder="Enter venue"
                                value={editingEvent ? editingEvent.venue : newEvent.venue}
                                onChange={(e) => editingEvent 
                                  ? setEditingEvent({ ...editingEvent, venue: e.target.value })
                                  : setNewEvent({ ...newEvent, venue: e.target.value })
                                }
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
                              value={editingEvent ? editingEvent.description : newEvent.description}
                              onChange={(e) => editingEvent 
                                ? setEditingEvent({ ...editingEvent, description: e.target.value })
                                : setNewEvent({ ...newEvent, description: e.target.value })
                              }
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
                                value={editingEvent ? editingEvent.date : newEvent.date}
                                onChange={(e) => editingEvent 
                                  ? setEditingEvent({ ...editingEvent, date: e.target.value })
                                  : setNewEvent({ ...newEvent, date: e.target.value })
                                }
                              />
                            </motion.div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="time">Time *</Label>
                            <motion.div whileFocus={{ scale: 1.02 }}>
                              <Input
                                id="time"
                                type="time"
                                value={editingEvent ? editingEvent.time : newEvent.time}
                                onChange={(e) => editingEvent 
                                  ? setEditingEvent({ ...editingEvent, time: e.target.value })
                                  : setNewEvent({ ...newEvent, time: e.target.value })
                                }
                              />
                            </motion.div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="tags">Tags (comma-separated)</Label>
                            <motion.div whileFocus={{ scale: 1.02 }}>
                              <Input
                                id="tags"
                                placeholder="e.g., Technology, Workshop"
                                value={editingEvent ? editingEvent.tags : newEvent.tags}
                                onChange={(e) => editingEvent 
                                  ? setEditingEvent({ ...editingEvent, tags: e.target.value })
                                  : setNewEvent({ ...newEvent, tags: e.target.value })
                                }
                              />
                            </motion.div>
                          </div>
                        </div>
                        <div className="flex space-x-4">
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button 
                              onClick={editingEvent ? handleUpdateEvent : handleCreateEvent}
                              disabled={submitting}
                            >
                              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              {editingEvent ? 'Update Event' : 'Create Event'}
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setShowCreateForm(false)
                                setEditingEvent(null)
                              }}
                            >
                              Cancel
                            </Button>
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
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
                            <Badge variant={event.status === 'approved' ? "default" : "secondary"}>
                              {event.status}
                            </Badge>
                          </div>
                          <CardDescription>{event.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2" />
                              {event.date} at {event.time}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              {event.venue}
                            </div>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2" />
                              {event.attendees || 0} registered
                            </div>
                          </div>
                          {event.tags && event.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {event.tags.map((tag, tagIndex) => (
                                <Badge key={tagIndex} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex space-x-2">
                            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={() => setEditingEvent(event)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDeleteEvent(event.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}
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
                    <p className="text-lg font-medium text-gray-700 mb-2">Calendar View</p>
                    <p className="text-gray-500">View all campus events to avoid scheduling conflicts</p>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Card>
                  <CardContent className="text-center py-12">
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    </motion.div>
                    <p className="text-lg font-medium text-gray-700 mb-2">Event Analytics</p>
                    <p className="text-gray-500">Track attendance, engagement, and event performance</p>
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