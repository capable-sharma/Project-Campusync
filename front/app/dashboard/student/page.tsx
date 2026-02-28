// @ts-nocheck

"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Calendar,
  Search,
  Bookmark,
  Clock,
  MapPin,
  Sparkles,
  Bell,
  User,
  LogOut,
  Grid,
  List,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Brain,
} from "lucide-react"

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL + "/api" || 'http://localhost:3001/api'

// API Service Functions
const apiService = {
  getAuthToken: () => {
    const token = localStorage.getItem('authToken')
    if (typeof window !== 'undefined') {
      return token
    }
    return null
  },

  getAuthHeaders: () => {
    const token = apiService.getAuthToken()
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  },

  getApprovedEvents: async () => {
    const response = await fetch(`${API_BASE_URL}/events`, {
      headers: apiService.getAuthHeaders()
    })
    if (!response.ok) throw new Error('Failed to fetch events')
    return response.json()
  },

  getRegisteredEvents: async () => {
    const response = await fetch(`${API_BASE_URL}/events/registered`, {
      headers: apiService.getAuthHeaders()
    })
    if (!response.ok) throw new Error('Failed to fetch registered events')
    return response.json()
  },

  enrollInEvent: async (eventId) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/enroll`, {
      method: 'POST',
      headers: apiService.getAuthHeaders()
    })
    if (!response.ok) throw new Error('Failed to enroll in event')
    return response.json()
  },

  checkEnrollmentStatus: async (eventId) => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/enrollment-status`, {
      headers: apiService.getAuthHeaders()
    })
    if (!response.ok) throw new Error('Failed to check enrollment status')
    return response.json()
  },

  aiChat: async (message) => {
    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: apiService.getAuthHeaders(),
      body: JSON.stringify({ message })
    })
    if (!response.ok) throw new Error('Failed to get AI response')
    return response.json()
  },

  getCurrentUser: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: apiService.getAuthHeaders()
    })
    if (!response.ok) throw new Error('Failed to get user info')
    return response.json()
  }
}

export default function StudentDashboard() {
  // State Management
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState("grid")
  const [allEvents, setAllEvents] = useState([]) // Master list to match AI titles against
  const [events, setEvents] = useState([])
  const [registeredEvents, setRegisteredEvents] = useState([])
  const [bookmarkedEvents, setBookmarkedEvents] = useState([])
  const [aiResponseData, setAiResponseData] = useState(null) // Stores { description: string, events: array }
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [enrollmentStatuses, setEnrollmentStatuses] = useState({})

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = apiService.getAuthToken()
      if (!token) {
        setError('Please log in to access the dashboard')
        setLoading(false)
        return
      }

      const [userResponse, eventsResponse, registeredResponse] = await Promise.all([
        apiService.getCurrentUser(),
        apiService.getApprovedEvents(),
        apiService.getRegisteredEvents()
      ])

      setUser(userResponse.user)
      setAllEvents(eventsResponse.events || [])
      setEvents(eventsResponse.events || [])
      setRegisteredEvents(registeredResponse.events || [])

      const statusPromises = eventsResponse.events.map(async (event) => {
        try {
          const status = await apiService.checkEnrollmentStatus(event.id)
          return { eventId: event.id, isEnrolled: status.isEnrolled }
        } catch (err) {
          return { eventId: event.id, isEnrolled: false }
        }
      })
      
      const statuses = await Promise.all(statusPromises)
      const statusMap = statuses.reduce((acc, { eventId, isEnrolled }) => {
        acc[eventId] = isEnrolled
        return acc
      }, {})
      setEnrollmentStatuses(statusMap)

    } catch (err) {
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (eventId) => {
    try {
      setError(null)
      await apiService.enrollInEvent(eventId)
      
      setEnrollmentStatuses(prev => ({
        ...prev,
        [eventId]: true
      }))
      
      const registeredResponse = await apiService.getRegisteredEvents()
      setRegisteredEvents(registeredResponse.events || [])
      
      setSuccessMessage('Successfully registered for the event!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to register for event')
    }
  }

  const handleBookmark = (eventId) => {
    setBookmarkedEvents(prev => {
      const isBookmarked = prev.some(e => e.id === eventId)
      if (isBookmarked) {
        return prev.filter(e => e.id !== eventId)
      } else {
        const event = allEvents.find(e => e.id === eventId)
        return event ? [...prev, event] : prev
      }
    })
  }

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return
    
    try {
      setAiLoading(true)
      setError(null)
      setAiResponseData(null) // Clear previous results
      
      const result = await apiService.aiChat(searchQuery)
      
      if (result.success && result.response) {
        const { description, events: eventTitles } = result.response
        
        // Match the titles returned by AI to our actual full event objects
        const matchedEvents = eventTitles && eventTitles.length > 0 
          ? allEvents.filter(e => eventTitles.includes(e.title))
          : []

        setAiResponseData({
          description: description,
          events: matchedEvents
        })

      } else {
        setError("Failed to parse AI response.")
      }
    } catch (err) {
      setError(err.message || 'Failed to get AI response')
    } finally {
      setAiLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    window.location.href = '/auth'
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6, staggerChildren: 0.1 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    hover: { y: -8, scale: 1.02, transition: { duration: 0.3, ease: "easeOut" } },
  }

  const getEventCardStyle = (type) => {
    if (type === "academic") {
      return {
        gradient: "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50",
        border: "border-blue-200",
        shadow: "shadow-blue-100",
        hoverShadow: "hover:shadow-blue-200",
        badgeGradient: "bg-gradient-to-r from-blue-500 to-indigo-600",
        buttonGradient: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
      }
    } else {
      return {
        gradient: "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50",
        border: "border-emerald-200",
        shadow: "shadow-emerald-100",
        hoverShadow: "hover:shadow-emerald-200",
        badgeGradient: "bg-gradient-to-r from-emerald-500 to-teal-600",
        buttonGradient: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700",
      }
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  }

  // Extracted Reusable Event Card Component
  const renderEventCard = (event, index) => {
    const cardStyle = getEventCardStyle(event.type)
    const isEnrolled = enrollmentStatuses[event.id] || false
    const isBookmarked = bookmarkedEvents.some(e => e.id === event.id)
    
    return (
      <motion.div key={event.id || index} variants={cardVariants} whileHover="hover" custom={index}>
        <Card className={`${cardStyle.gradient} ${cardStyle.border} ${cardStyle.shadow} ${cardStyle.hoverShadow} hover:shadow-xl transition-all duration-300 border-2 cursor-pointer group`}>
          <CardHeader className="relative">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg text-gray-900 group-hover:text-gray-800 transition-colors">
                {event.title}
              </CardTitle>
              <motion.div
                whileHover={{ scale: 1.1 }}
                className={`px-3 py-1 rounded-full text-white text-xs font-medium ${cardStyle.badgeGradient} shadow-lg`}
              >
                {event.type}
              </motion.div>
            </div>
            <CardDescription className="text-gray-600">{event.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-700 mb-4">
              <motion.div className="flex items-center" whileHover={{ x: 5 }} transition={{ duration: 0.2 }}>
                <div className="p-1 bg-white/60 rounded-md mr-3">
                  <Clock className="h-4 w-4 text-gray-600" />
                </div>
                <span className="font-medium">
                  {formatDate(event.date)} at {event.time}
                </span>
              </motion.div>
              <motion.div className="flex items-center" whileHover={{ x: 5 }} transition={{ duration: 0.2 }}>
                <div className="p-1 bg-white/60 rounded-md mr-3">
                  <MapPin className="h-4 w-4 text-gray-600" />
                </div>
                <span className="font-medium">{event.venue}</span>
              </motion.div>
            </div>
            {event.tags && (
              <div className="flex flex-wrap gap-2 mb-4">
                {String(event.tags).split(',').map((tag, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    className="px-2 py-1 bg-white/70 text-gray-700 text-xs rounded-full border border-gray-200 font-medium"
                  >
                    {tag.trim()}
                  </motion.div>
                ))}
              </div>
            )}
            <div className="flex space-x-2">
              <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => handleRegister(event.id)}
                  disabled={isEnrolled}
                  className={`w-full ${
                    isEnrolled ? "bg-gradient-to-r from-gray-400 to-gray-500" : cardStyle.buttonGradient
                  } text-white font-medium transition-all duration-300`}
                >
                  {isEnrolled ? "Registered" : "Register"}
                  {!isEnrolled && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  onClick={() => handleBookmark(event.id)}
                  variant="outline"
                  size="sm"
                  className="border-gray-300 hover:bg-yellow-50 hover:border-yellow-300"
                >
                  <Bookmark
                    className={`h-4 w-4 ${isBookmarked ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`}
                  />
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-white/80 backdrop-blur-md shadow-sm border-b border-white/20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} transition={{ duration: 0.2 }}>
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                </motion.div>
                <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Campusync
                </span>
              </div>
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                {user?.role || 'Student'}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name || 'Student'}!</span>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="sm" className="hover:bg-blue-50">
                  <Bell className="h-4 w-4" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="sm" className="hover:bg-blue-50">
                  <User className="h-4 w-4" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hover:bg-red-50 hover:text-red-600"
                  onClick={handleLogout}
                >
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Welcome back, {user?.name || 'Student'}!
          </h1>
          <p className="text-gray-600">Discover events, manage your schedule, and never miss what matters.</p>
        </motion.div>

        {/* Success/Error Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4"
            >
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4"
            >
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Search Card */}
        <motion.div variants={itemVariants}>
          <Card className="mb-6 bg-white/70 backdrop-blur-md border-white/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <motion.div
                  className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="h-4 w-4 text-white" />
                </motion.div>
                <span className="bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  AI Event Discovery
                </span>
              </CardTitle>
              <CardDescription>Ask AI to find events based on your interests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <motion.div className="flex-1" whileFocus={{ scale: 1.02 }}>
                  <Input
                    placeholder="e.g., 'I want to learn design' or 'Show me networking events'"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                    onKeyPress={(e) => e.key === 'Enter' && handleAISearch()}
                  />
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    onClick={handleAISearch}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    {aiLoading ? 'Searching...' : 'Search'}
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* NEW: AI Response Rendered Below Search */}
        <AnimatePresence>
          {aiResponseData && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-6 w-6 text-blue-600" />
                    <span className="text-blue-800">AI Recommendation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/80 backdrop-blur-sm rounded-lg p-6 border border-white/50 text-gray-700 leading-relaxed shadow-sm"
                  >
                    {aiResponseData.description}
                  </motion.div>

                  {/* Render Event Cards if AI returned matching titles */}
                  {aiResponseData.events && aiResponseData.events.length > 0 && (
                    <motion.div 
                      className="mt-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 px-1">Recommended Events:</h3>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {aiResponseData.events.map((event, index) => renderEventCard(event, index))}
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Tabs */}
        <motion.div variants={itemVariants}>
          <Tabs defaultValue="discover" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-white/70 backdrop-blur-md">
              <TabsTrigger value="discover">Discover</TabsTrigger>
              <TabsTrigger value="registered">Registered ({registeredEvents.length})</TabsTrigger>
              <TabsTrigger value="bookmarked">Bookmarked ({bookmarkedEvents.length})</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
            </TabsList>

            <TabsContent value="discover" className="space-y-6">
              <motion.div
                className="flex justify-between items-center"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Discover Events
                </h2>
                <div className="flex items-center space-x-2">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant={viewMode === "grid" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className={viewMode === "grid" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white" : ""}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant={viewMode === "list" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className={viewMode === "list" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white" : ""}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                className={viewMode === "grid" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {events.map((event, index) => renderEventCard(event, index))}
              </motion.div>
            </TabsContent>

            <TabsContent value="registered" className="space-y-6">
              <motion.h2
                className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                Your Registered Events
              </motion.h2>
              <AnimatePresence mode="wait">
                {registeredEvents.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="bg-gradient-to-br from-gray-50 to-slate-100 border-gray-200">
                      <CardContent className="text-center py-12">
                        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        </motion.div>
                        <p className="text-gray-500 font-medium">No registered events yet</p>
                        <p className="text-sm text-gray-400">Start exploring events to register</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {registeredEvents.map((event, index) => {
                      const cardStyle = getEventCardStyle(event.type)
                      return (
                        <motion.div key={event.id} variants={cardVariants} whileHover="hover" custom={index}>
                          <Card className={`${cardStyle.gradient} ${cardStyle.border} ${cardStyle.shadow} hover:shadow-xl transition-all duration-300 border-2`}>
                            <CardHeader>
                              <CardTitle className="text-lg text-gray-900">{event.title}</CardTitle>
                              <CardDescription className="text-gray-600">{event.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2 text-sm text-gray-700 mb-4">
                                <div className="flex items-center">
                                  <div className="p-1 bg-white/60 rounded-md mr-3">
                                    <Clock className="h-4 w-4 text-gray-600" />
                                  </div>
                                  <span className="font-medium">
                                    {formatDate(event.date)} at {event.time}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <div className="p-1 bg-white/60 rounded-md mr-3">
                                    <MapPin className="h-4 w-4 text-gray-600" />
                                  </div>
                                  <span className="font-medium">{event.venue}</span>
                                </div>
                              </div>
                              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Button variant="outline" className="w-full bg-white/70 hover:bg-white border-gray-300">
                                  View Details
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </motion.div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="bookmarked" className="space-y-6">
              <motion.h2
                className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                Bookmarked Events
              </motion.h2>
              <AnimatePresence mode="wait">
                {bookmarkedEvents.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
                      <CardContent className="text-center py-12">
                        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}>
                          <Bookmark className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                        </motion.div>
                        <p className="text-gray-500 font-medium">No bookmarked events yet</p>
                        <p className="text-sm text-gray-400">Bookmark events to save them for later</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {bookmarkedEvents.map((event, index) => {
                      const cardStyle = getEventCardStyle(event.type)
                      return (
                        <motion.div key={event.id} variants={cardVariants} whileHover="hover" custom={index}>
                          <Card className={`${cardStyle.gradient} ${cardStyle.border} ${cardStyle.shadow} hover:shadow-xl transition-all duration-300 border-2`}>
                            <CardHeader>
                              <CardTitle className="text-lg text-gray-900">{event.title}</CardTitle>
                              <CardDescription className="text-gray-600">{event.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2 text-sm text-gray-700 mb-4">
                                <div className="flex items-center">
                                  <div className="p-1 bg-white/60 rounded-md mr-3">
                                    <Clock className="h-4 w-4 text-gray-600" />
                                  </div>
                                  <span className="font-medium">
                                    {event.date} at {event.time}
                                  </span>
                                </div>
                                <div className="flex items-center">
                                  <div className="p-1 bg-white/60 rounded-md mr-3">
                                    <MapPin className="h-4 w-4 text-gray-600" />
                                  </div>
                                  <span className="font-medium">{event.venue}</span>
                                </div>
                              </div>
                              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Button className={`w-full ${cardStyle.buttonGradient} text-white font-medium`}>
                                  Register Now
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </motion.div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6">
              <motion.h2
                className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                Calendar View
              </motion.h2>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
                  <CardContent className="text-center py-12">
                    <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}>
                      <Calendar className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                    </motion.div>
                    <p className="text-lg font-medium text-gray-700 mb-2">Calendar Integration Coming Soon</p>
                    <p className="text-gray-500">
                      Full calendar view with Google Calendar sync will be available in the next update
                    </p>
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