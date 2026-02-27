const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import database functions
const {
  createUser,
  getUserByEmail,
  getUserById,
  createEvent,
  getEventsByCreator,
  getApprovedEvents,
  getPendingEvents,
  approveEvent,
  deleteEvent,
  updateEvent,
  enrollInEvent,
  getUserRegisteredEvents,
  getStudentCount,
  getClubLeadCount,
  getTotalEvents,
  getEventStats,
  getChatHistory
} = require('./db');

// Import AI functions
const {
  processAIQuery,
  getEventRecommendations,
  generateEventSummary
} = require('./ai');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'saksham@sharma';

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log(err.message)
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Role-based access control
const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// ==================== AUTH ROUTES ====================

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['Admin', 'Club Lead', 'Student'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Create user
    const user = await createUser({ name, email, password, role });
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.log(error.message)
    res.status(400).json({ error: error.message });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== EVENT ROUTES ====================

// Get all approved events (for students)
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const events = await getApprovedEvents();
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get events created by current user (for club leads)
app.get('/api/events/my', authenticateToken, authorizeRole(['Club Lead']), async (req, res) => {
  try {
    const events = await getEventsByCreator(req.user.id);
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending events (for admin)
app.get('/api/events/pending', authenticateToken, authorizeRole(['Admin']), async (req, res) => {
  try {
    const events = await getPendingEvents();
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new event
app.post('/api/events', authenticateToken, authorizeRole(['Club Lead', 'Admin']), async (req, res) => {
  try {
    const { title, venue, description, date, time, tags } = req.body;

    if (!title || !venue || !description || !date || !time) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const eventType = req.user.role === 'Admin' ? 'academic' : 'club';
    const event = await createEvent({
      title,
      venue,
      description,
      date,
      time,
      tags: tags || '',
      createdBy: req.user.id,
      type: eventType
    });

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update event
app.put('/api/events/:id', authenticateToken, authorizeRole(['Club Lead', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, venue, description, date, time, tags } = req.body;

    await updateEvent(id, {
      title,
      venue,
      description,
      date,
      time,
      tags: tags || ''
    });

    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete event
app.delete('/api/events/:id', authenticateToken, authorizeRole(['Club Lead', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await deleteEvent(id);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve event (admin only)
app.post('/api/events/:id/approve', authenticateToken, authorizeRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await approveEvent(id);
    res.json({ message: 'Event approved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enroll in event (students only)
app.post('/api/events/:id/enroll', authenticateToken, authorizeRole(['Student']), async (req, res) => {
  try {
    const { id } = req.params;
    await enrollInEvent(id, req.user.id);
    res.json({ message: 'Successfully enrolled in event' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's registered events
app.get('/api/events/registered', authenticateToken, authorizeRole(['Student']), async (req, res) => {
  try {
    const events = await getUserRegisteredEvents(req.user.id);
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== STATISTICS ROUTES ====================

// Get admin dashboard stats
app.get('/api/stats/admin', authenticateToken, authorizeRole(['Admin']), async (req, res) => {
  try {
    const [studentCount, clubLeadCount, totalEvents, pendingEvents] = await Promise.all([
      getStudentCount(),
      getClubLeadCount(),
      getTotalEvents(),
      getPendingEvents()
    ]);

    res.json({
      totalStudents: studentCount,
      activeClubs: clubLeadCount,
      totalEvents,
      pendingApproval: pendingEvents.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get club lead dashboard stats
app.get('/api/stats/club-lead', authenticateToken, authorizeRole(['Club Lead']), async (req, res) => {
  try {
    const stats = await getEventStats(req.user.id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AI ROUTES ====================

// AI Chat
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await processAIQuery(req.user.id, message);
    
    if (result.success) {
      res.json({
        success : result.success,
        response: result.response
      });
    } else {
      res.status(500).json({
        error: 'AI processing failed',
        message: result.response
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI event recommendations
app.get('/api/ai/recommendations', authenticateToken, authorizeRole(['Student']), async (req, res) => {
  try {
    const result = await getEventRecommendations(req.user.id);
    
    if (result.success) {
      res.json({
        recommendations: result.recommendations
      });
    } else {
      res.status(500).json({
        error: 'Failed to get recommendations',
        message: result.error
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate event summary
app.post('/api/ai/event-summary', authenticateToken, authorizeRole(['Club Lead', 'Admin']), async (req, res) => {
  try {
    const eventData = req.body;
    const result = await generateEventSummary(eventData);
    
    if (result.success) {
      res.json({
        summary: result.summary
      });
    } else {
      res.status(500).json({
        error: 'Failed to generate summary',
        message: result.error
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get chat history
app.get('/api/ai/chat-history', authenticateToken, async (req, res) => {
  try {
    const history = await getChatHistory(req.user.id);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== UTILITY ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Campusync Backend'
  });
});

// Get all events with filters
app.get('/api/events/filter', authenticateToken, async (req, res) => {
  try {
    const { type, date, tags } = req.query;
    let events = await getApprovedEvents();

    // Filter by type
    if (type) {
      events = events.filter(event => event.type === type);
    }

    // Filter by date
    if (date) {
      const targetDate = new Date(date);
      events = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.toDateString() === targetDate.toDateString();
      });
    }

    // Filter by tags
    if (tags) {
      const searchTags = tags.split(',').map(tag => tag.trim().toLowerCase());
      events = events.filter(event => 
        event.tags && event.tags.some(tag => 
          searchTags.some(searchTag => tag.toLowerCase().includes(searchTag))
        )
      );
    }

    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get upcoming events (next 7 days)
app.get('/api/events/upcoming', authenticateToken, async (req, res) => {
  try {
    const events = await getApprovedEvents();
    const now = new Date();
    const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    const upcomingEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= now && eventDate <= nextWeek;
    });

    // Sort by date
    upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ events: upcomingEvents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get event details by ID
app.get('/api/events/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const events = await getApprovedEvents();
    const event = events.find(e => e.id === id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if user is enrolled in event
app.get('/api/events/:id/enrollment-status', authenticateToken, authorizeRole(['Student']), async (req, res) => {
  try {
    const { id } = req.params;
    const registeredEvents = await getUserRegisteredEvents(req.user.id);
    const isEnrolled = registeredEvents.some(event => event.id === id);

    res.json({ isEnrolled });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get events by date range
app.get('/api/events/date-range', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const events = await getApprovedEvents();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const filteredEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= start && eventDate <= end;
    });

    // Sort by date
    filteredEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ events: filteredEvents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// ==================== SERVER START ====================

app.listen(PORT, () => {
  console.log(`🚀 Campusync Backend Server running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 AI Chat endpoint: http://localhost:${PORT}/api/ai/chat`);
  console.log(`📅 Events endpoint: http://localhost:${PORT}/api/events`);
});