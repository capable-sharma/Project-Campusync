"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, User, Users, Shield, AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useRouter } from "next/navigation"

const API_BASE_URL = 'http://localhost:3001/api'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const handleAuth = async () => {
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      if (isLogin) {
        // Login request
        if (!email || !password) {
          setError("Email and password are required")
          setLoading(false)
          return
        }

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password
          })
        })

        const data = await response.json()

        if (response.ok) {
          // Store JWT token in localStorage
          localStorage.setItem('authToken', data.token)
          localStorage.setItem('user', JSON.stringify(data.user))
          
          setSuccess("Login successful! Redirecting...")
          
          // Redirect based on role
          setTimeout(() => {
            if (data.user.role === 'Admin') {
              router.push("/dashboard/admin")
            } else if (data.user.role === 'Club Lead') {
              router.push("/dashboard/club")
            } else if (data.user.role === 'Student') {
              router.push("/dashboard/student")
            }
          }, 1500)
        } else {
          setError(data.error || "Login failed")
        }
      } else {
        // Registration request
        if (!name || !email || !password || !role) {
          setError("All fields are required")
          setLoading(false)
          return
        }

        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            email,
            password,
            role
          })
        })

        const data = await response.json()

        if (response.ok) {
          // Store JWT token in localStorage
          localStorage.setItem('authToken', data.token)
          localStorage.setItem('user', JSON.stringify(data.user))
          
          setSuccess("Account created successfully! Redirecting...")
          
          // Redirect based on role
          setTimeout(() => {
            if (data.user.role === 'Admin') {
              router.push("/dashboard/admin")
            } else if (data.user.role === 'Club Lead') {
              router.push("/dashboard/club")
            } else if (data.user.role === 'Student') {
              router.push("/dashboard/student")
            }
          }, 1500)
        } else {
          setError(data.error || "Registration failed")
        }
      }
    } catch (error) {
      setError("Network error. Please check if the server is running.")
      console.error('Auth error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Link href="/" className="flex items-center justify-center space-x-2 mb-4">
            <motion.div whileHover={{ scale: 1.1, rotate: 5 }} transition={{ duration: 0.2 }}>
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </motion.div>
            <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Campusync
            </span>
          </Link>
          <motion.h1
            className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {isLogin ? "Welcome Back" : "Join Campusync"}
          </motion.h1>
          <motion.p
            className="text-gray-600 mt-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {isLogin ? "Sign in to your account" : "Create your account to get started"}
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {isLogin ? "Sign In" : "Sign Up"}
              </CardTitle>
              <CardDescription>
                {isLogin
                  ? "Enter your credentials to access your dashboard"
                  : "Fill in your details to create an account"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error Alert */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Alert className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-700">
                        {error}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success Alert */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700">
                        {success}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Label htmlFor="name">Full Name</Label>
                    <motion.div whileFocus={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                      <Input
                        id="name"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                        disabled={loading}
                      />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                <Label htmlFor="email">Email</Label>
                <motion.div whileFocus={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                    disabled={loading}
                  />
                </motion.div>
              </motion.div>

              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <Label htmlFor="password">Password</Label>
                <motion.div whileFocus={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                    disabled={loading}
                  />
                </motion.div>
              </motion.div>

              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Label htmlFor="role">Role</Label>
                    <Select value={role} onValueChange={setRole} disabled={loading}>
                      <SelectTrigger className="border-gray-200 focus:border-blue-400 focus:ring-blue-400">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Student">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>Student</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Club Lead">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <span>Club Lead</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Admin">
                          <div className="flex items-center space-x-2">
                            <Shield className="h-4 w-4" />
                            <span>Admin</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
                <Button
                  onClick={handleAuth}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{isLogin ? "Signing in..." : "Creating account..."}</span>
                    </div>
                  ) : (
                    isLogin ? "Sign In" : "Create Account"
                  )}
                </Button>
              </motion.div>

              <motion.div
                className="text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <motion.button
                  onClick={() => {
                    setIsLogin(!isLogin)
                    setError("")
                    setSuccess("")
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                  disabled={loading}
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </motion.button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Role Information */}
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <p className="text-sm text-gray-600 mb-3">Different roles, different powers:</p>
          <motion.div
            className="grid grid-cols-3 gap-2 text-xs"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
            initial="hidden"
            animate="visible"
          >
            {[
              { icon: User, title: "Student", desc: "Discover & Register", gradient: "from-green-400 to-emerald-500" },
              { icon: Users, title: "Club Lead", desc: "Create Events", gradient: "from-blue-400 to-indigo-500" },
              { icon: Shield, title: "Admin", desc: "Manage Campus", gradient: "from-purple-400 to-indigo-500" },
            ].map((role, index) => (
              <motion.div
                key={index}
                className="bg-white/70 backdrop-blur-md rounded-lg p-3 border border-white/20 shadow-lg"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className={`p-2 bg-gradient-to-br ${role.gradient} rounded-lg mx-auto mb-2 w-fit`}>
                  <role.icon className="h-4 w-4 text-white" />
                </div>
                <p className="font-medium text-gray-900">{role.title}</p>
                <p className="text-gray-500">{role.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}