//@ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Calendar, Users, Sparkles, Clock, MapPin, ArrowRight, LogOut } from "lucide-react"
import Link from "next/link"

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// API Functions
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('authToken')
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong')
  }

  return data
}

const checkAuth = async () => {
  try {
    const data = await apiRequest('/auth/me')
    return data.user
  } catch (error) {
    localStorage.removeItem('authToken') // Changed from 'token' to 'authToken'
    return null
  }
}

const fetchEvents = async () => {
  try {
    const data = await apiRequest('/events')
    return data.events
  } catch (error) {
    console.error('Error fetching events:', error)
    return []
  }
}

const fetchUpcomingEvents = async () => {
  try {
    const data = await apiRequest('/events/upcoming')
    return data.events
  } catch (error) {
    console.error('Error fetching upcoming events:', error)
    return []
  }
}

const sendAIQuery = async (message) => {
  try {
    const data = await apiRequest('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
    return data
  } catch (error) {
    console.error('Error sending AI query:', error)
    return null
  }
}

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const initializeAuth = async () => {
    const token = localStorage.getItem('authToken') // Changed from 'token' to 'authToken'
    if (token) {
      try {
        const userData = await checkAuth()
        setUser(userData)
      } catch (error) {
        console.error('Auth check failed:', error)
      }
    }
    setIsLoading(false)
  }

  initializeAuth()
  }, [])

  useEffect(() => {
    const loadEvents = async () => {
      if (user) {
        try {
          const eventsData = await fetchUpcomingEvents()
          setEvents(eventsData.slice(0, 3)) // Show only 3 featured events
        } catch (error) {
          console.error('Failed to load events:', error)
        }
      }
    }

    loadEvents()
  }, [user])

const handleLogout = () => {
  localStorage.removeItem('authToken') // Changed from 'token' to 'authToken'
  setUser(null)
  setEvents([])
  setSearchResults([])
}

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)

    try {
      const result = await sendAIQuery(searchQuery)
      
      if (result) {
        // Format the AI response for display
        const formattedResults = result.relevantEvents?.map(event => ({
          event,
          relevance: result.response,
          resources: [
            "Check event prerequisites",
            "Review recommended materials",
            "Prepare necessary documents"
          ]
        })) || []

        setSearchResults(formattedResults)
      } else {
        // Fallback to mock results if AI fails
        const mockResults = [
          {
            event: events[0],
            relevance: "AI service temporarily unavailable. Here are some relevant events:",
            resources: ["Event details available", "Registration open", "Contact organizer for more info"],
          }
        ]
        setSearchResults(mockResults.filter(r => r.event))
      }
    } catch (error) {
      console.error('AI search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleEnrollInEvent = async (eventId) => {
    if (!user || user.role !== 'Student') {
      alert('Only students can enroll in events')
      return
    }

    try {
      await apiRequest(`/events/${eventId}/enroll`, {
        method: 'POST',
      })
      alert('Successfully enrolled in event!')
    } catch (error) {
      alert(error.message || 'Failed to enroll in event')
    }
  }

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
      y: -12,
      scale: 1.03,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  }

  const getEventCardStyle = (type) => {
    if (type === "academic") {
      return {
        gradient: "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50",
        border: "border-blue-200",
        shadow: "shadow-blue-100",
        hoverShadow: "hover:shadow-blue-200",
        badgeGradient: "bg-gradient-to-r from-blue-500 to-indigo-600",
      }
    } else {
      return {
        gradient: "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50",
        border: "border-emerald-200",
        shadow: "shadow-emerald-100",
        hoverShadow: "hover:shadow-emerald-200",
        badgeGradient: "bg-gradient-to-r from-emerald-500 to-teal-600",
      }
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          className="rounded-full h-12 w-12 border-b-4 border-blue-600"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        />
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
            <motion.div
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Campusync
              </span>
            </motion.div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Welcome, {user.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {user.role}
                    </Badge>
                  </div>
                  <Link href={`/dashboard/${user.role.toLowerCase().replace(' ', '-')}`}>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" className="border-gray-200 hover:bg-gray-50 bg-transparent">
                        Dashboard
                      </Button>
                    </motion.div>
                  </Link>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      onClick={handleLogout}
                      variant="outline" 
                      className="border-red-200 hover:bg-red-50 text-red-600 bg-transparent"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </motion.div>
                </>
              ) : (
                <>
                  <Link href="/auth">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" className="border-gray-200 hover:bg-gray-50 bg-transparent">
                        Login
                      </Button>
                    </motion.div>
                  </Link>
                  <Link href="/auth">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg">
                        Get Started
                      </Button>
                    </motion.div>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <motion.section className="py-20 px-4" variants={containerVariants} initial="hidden" animate="visible">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1 variants={itemVariants} className="text-5xl font-bold text-gray-900 mb-6">
            Discover Campus Events with{" "}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              AI Intelligence
            </span>
          </motion.h1>
          <motion.p variants={itemVariants} className="text-xl text-gray-600 mb-12">
            Never miss an event, avoid schedule conflicts, and get personalized recommendations for your academic and
            social life.
          </motion.p>

          {/* AI Search Bar - Only show if user is logged in */}
          {user && (
            <motion.div
              variants={itemVariants}
              className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 mb-12"
              whileHover={{ scale: 1.02, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)" }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="flex items-center space-x-4 mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div
                  className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg"
                  animate={{ rotate: isSearching ? 360 : 0 }}
                  transition={{ duration: 2, repeat: isSearching ? Number.POSITIVE_INFINITY : 0, ease: "linear" }}
                >
                  <Sparkles className="h-5 w-5 text-white" />
                </motion.div>
                <span className="text-lg font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Ask AI about events
                </span>
              </motion.div>
              <div className="flex space-x-4">
                <motion.div className="flex-1" whileFocus={{ scale: 1.02 }}>
                  <Input
                    placeholder="e.g., 'I want to learn design' or 'Show me tech events this week'"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-lg py-3 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                    onKeyPress={(e) => e.key === "Enter" && handleAISearch()}
                  />
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={handleAISearch}
                    disabled={isSearching}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                  >
                    {isSearching ? (
                      <motion.div
                        className="rounded-full h-5 w-5 border-b-2 border-white"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      />
                    ) : (
                      <Search className="h-5 w-5" />
                    )}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* AI Search Results */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.9 }}
                transition={{ duration: 0.5 }}
                className="bg-white/70 backdrop-blur-md rounded-xl shadow-lg border border-white/20 p-6 mb-12"
              >
                <motion.h3
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl font-semibold mb-4 flex items-center"
                >
                  <div className="p-1 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg mr-2">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    AI Recommendations
                  </span>
                </motion.h3>
                <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
                  {searchResults.map((result, index) => (
                    <motion.div
                      key={index}
                      variants={itemVariants}
                      className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-white to-gray-50"
                      whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-lg text-gray-900">{result.event.title}</h4>
                          <p className="text-gray-600">{result.relevance}</p>
                        </div>
                        <Badge
                          className={`${
                            result.event.type === "academic"
                              ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                              : "bg-gradient-to-r from-emerald-500 to-teal-600"
                          } text-white`}
                        >
                          {result.event.type}
                        </Badge>
                      </div>
                      <motion.div
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <p className="text-sm font-medium text-blue-800 mb-2">
                          📚 Event Information:
                        </p>
                        <motion.ul
                          className="text-sm text-blue-700 space-y-1"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          {result.resources.map((resource, i) => (
                            <motion.li key={i} variants={itemVariants}>
                              • {resource}
                            </motion.li>
                          ))}
                        </motion.ul>
                      </motion.div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Featured Events */}
      <motion.section
        className="py-16 px-4 bg-white/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto">
          <motion.h2
            className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            {user ? "Upcoming Events" : "Featured Events"}
          </motion.h2>
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {events.length > 0 ? (
              events.map((event, index) => {
                const cardStyle = getEventCardStyle(event.type)
                return (
                  <motion.div key={event.id} variants={cardVariants} whileHover="hover" custom={index}>
                    <Card
                      className={`${cardStyle.gradient} ${cardStyle.border} ${cardStyle.shadow} ${cardStyle.hoverShadow} hover:shadow-xl transition-all duration-300 h-full border-2 cursor-pointer group`}
                    >
                      <CardHeader className="relative">
                        <div className="flex justify-between items-start mb-2">
                          <CardTitle className="text-lg text-gray-900 group-hover:text-gray-800 transition-colors">
                            {event.title}
                          </CardTitle>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className={`px-3 py-1 rounded-full text-white text-xs font-medium ${cardStyle.badgeGradient} shadow-lg`}
                          >
                            {event.type === "academic" ? "Academic" : "Club Event"}
                          </motion.div>
                        </div>
                        <CardDescription className="text-gray-600">{event.description}</CardDescription>
                        <motion.div
                          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          whileHover={{ scale: 1.2, rotate: 45 }}
                        >
                          <ArrowRight className="h-5 w-5 text-gray-400" />
                        </motion.div>
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
                          {event.attendees && (
                            <motion.div className="flex items-center" whileHover={{ x: 5 }} transition={{ duration: 0.2 }}>
                              <div className="p-1 bg-white/60 rounded-md mr-3">
                                <Users className="h-4 w-4 text-gray-600" />
                              </div>
                              <span className="font-medium">{event.attendees} registered</span>
                            </motion.div>
                          )}
                        </div>
                        {event.tags && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {String(event.tags).split(',').map((tag, i) => (
                              <motion.div
                                key={i}
                                whileHover={{ scale: 1.05 }}
                                className="px-2 py-1 bg-white/70 text-gray-700 text-xs rounded-full border border-gray-200 font-medium"
                              >
                                {tag.trim()}
                              </motion.div>
                            ))}
                          </div>
                        )}
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          {user ? (
                            <Button
                              onClick={() => handleEnrollInEvent(event.id)}
                              className={`w-full ${cardStyle.badgeGradient} hover:shadow-lg text-white font-medium py-2.5 transition-all duration-300`}
                              disabled={user.role !== 'Student'}
                            >
                              {user.role === 'Student' ? 'Enroll Now' : 'View Details'}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              className={`w-full ${cardStyle.badgeGradient} hover:shadow-lg text-white font-medium py-2.5 transition-all duration-300`}
                              asChild
                            >
                              <Link href="/auth">
                                Register Now
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                        </motion.div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-lg">
                  {user ? "No upcoming events found." : "Please log in to view events."}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        className="py-16 px-4 bg-gradient-to-br from-gray-50 to-slate-100"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto">
          <motion.h2
            className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Why Choose Campusync?
          </motion.h2>
          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Sparkles,
                title: "AI-Powered Discovery",
                description:
                  "Find events based on your interests with intelligent recommendations and prerequisite resources.",
                gradient: "from-yellow-400 to-orange-500",
                bgGradient: "from-yellow-50 to-orange-50",
              },
              {
                icon: Calendar,
                title: "Unified Calendar",
                description: "View all academic and club events in one place. Never double-book again.",
                gradient: "from-green-400 to-emerald-500",
                bgGradient: "from-green-50 to-emerald-50",
              },
              {
                icon: Users,
                title: "Community Driven",
                description: "Clubs and admins can independently manage events while students discover and engage.",
                gradient: "from-purple-400 to-indigo-500",
                bgGradient: "from-purple-50 to-indigo-50",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className={`text-center p-6 rounded-2xl bg-gradient-to-br ${feature.bgGradient} border border-white/50 shadow-lg`}
                whileHover={{ y: -10, scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className={`bg-gradient-to-br ${feature.gradient} rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-lg`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  <feature.icon className="h-8 w-8 text-white" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer
        className="bg-gradient-to-r from-gray-900 to-slate-800 text-white py-12 px-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            className="flex items-center justify-center space-x-2 mb-4"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">Campusync</span>
          </motion.div>
          <p className="text-gray-400">Streamlining campus life, one event at a time.</p>
        </div>
      </motion.footer>
    </div>
  )
}