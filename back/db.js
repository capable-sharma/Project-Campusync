const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.firestore();

// User Management Functions
const createUser = async (userData) => {
  try {
    const { name, email, password, role } = userData;
    // Check if user already exists
    const existingUser = await db.collection('users').where('email', '==', email).get();
    if (!existingUser.empty) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user document
    const userDoc = {
      name,
      email,
      password: hashedPassword,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      registeredEvents: []
    };

    const docRef = await db.collection('users').add(userDoc);
    return { id: docRef.id, ...userDoc };
  } catch (error) {
    throw new Error(`Error creating user: ${error.message}`);
  }
};

const getUserByEmail = async (email) => {
  try {
    const snapshot = await db.collection('users').where('email', '==', email).get();
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    throw new Error(`Error getting user: ${error.message}`);
  }
};

const getUserById = async (userId) => {
  try {
    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    throw new Error(`Error getting user by ID: ${error.message}`);
  }
};

// Event Management Functions
const createEvent = async (eventData) => {
  try {
    const { title, venue, description, date, time, tags, createdBy, type = 'club' } = eventData;
    
    const eventDoc = {
      title,
      venue,
      description,
      date,
      time,
      tags: tags.split(',').map(tag => tag.trim()),
      createdBy,
      type, // 'club' or 'academic'
      approved: type === 'academic' ? true : false,
      attendees: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('events').add(eventDoc);
    return { id: docRef.id, ...eventDoc };
  } catch (error) {
    throw new Error(`Error creating event: ${error.message}`);
  }
};

const getEventsByCreator = async (creatorId) => {
  try {
    const snapshot = await db.collection('events').where('createdBy', '==', creatorId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw new Error(`Error getting events: ${error.message}`);
  }
};

const getApprovedEvents = async () => {
  try {
    const snapshot = await db.collection('events').where('approved', '==', true).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw new Error(`Error getting approved events: ${error.message}`);
  }
};

const getPendingEvents = async () => {
  try {
    const snapshot = await db.collection('events').where('approved', '==', false).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw new Error(`Error getting pending events: ${error.message}`);
  }
};

const approveEvent = async (eventId) => {
  try {
    await db.collection('events').doc(eventId).update({
      approved: true,
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    throw new Error(`Error approving event: ${error.message}`);
  }
};

const deleteEvent = async (eventId) => {
  try {
    await db.collection('events').doc(eventId).delete();
    return { success: true };
  } catch (error) {
    throw new Error(`Error deleting event: ${error.message}`);
  }
};

const updateEvent = async (eventId, updateData) => {
  try {
    const { title, venue, description, date, time, tags } = updateData;
    
    const updateDoc = {
      title,
      venue,
      description,
      date,
      time,
      tags: tags.split(',').map(tag => tag.trim()),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('events').doc(eventId).update(updateDoc);
    return { success: true };
  } catch (error) {
    throw new Error(`Error updating event: ${error.message}`);
  }
};

const enrollInEvent = async (eventId, userId) => {
  try {
    // Add user to event attendees
    await db.collection('events').doc(eventId).update({
      attendees: admin.firestore.FieldValue.arrayUnion(userId)
    });

    // Add event to user's registered events
    await db.collection('users').doc(userId).update({
      registeredEvents: admin.firestore.FieldValue.arrayUnion(eventId)
    });

    return { success: true };
  } catch (error) {
    throw new Error(`Error enrolling in event: ${error.message}`);
  }
};

const getUserRegisteredEvents = async (userId) => {
  try {
    const user = await db.collection('users').doc(userId).get();
    if (!user.exists) {
      throw new Error('User not found');
    }

    const registeredEventIds = user.data().registeredEvents || [];
    if (registeredEventIds.length === 0) {
      return [];
    }

    const events = [];
    for (const eventId of registeredEventIds) {
      const eventDoc = await db.collection('events').doc(eventId).get();
      if (eventDoc.exists) {
        events.push({ id: eventDoc.id, ...eventDoc.data() });
      }
    }

    return events;
  } catch (error) {
    throw new Error(`Error getting user registered events: ${error.message}`);
  }
};

// Statistics Functions
const getStudentCount = async () => {
  try {
    const snapshot = await db.collection('users').where('role', '==', 'Student').get();
    return snapshot.size;
  } catch (error) {
    throw new Error(`Error getting student count: ${error.message}`);
  }
};

const getClubLeadCount = async () => {
  try {
    const snapshot = await db.collection('users').where('role', '==', 'Club Lead').get();
    return snapshot.size;
  } catch (error) {
    throw new Error(`Error getting club lead count: ${error.message}`);
  }
};

const getTotalEvents = async () => {
  try {
    const snapshot = await db.collection('events').get();
    return snapshot.size;
  } catch (error) {
    throw new Error(`Error getting total events: ${error.message}`);
  }
};

const getEventStats = async (creatorId) => {
  try {
    const events = await getEventsByCreator(creatorId);
    const totalEvents = events.length;
    const publishedEvents = events.filter(event => event.approved).length;
    const drafts = events.filter(event => !event.approved).length;
    const totalAttendance = events.reduce((sum, event) => sum + (event.attendees?.length || 0), 0);

    return {
      totalEvents,
      publishedEvents,
      drafts,
      totalAttendance
    };
  } catch (error) {
    throw new Error(`Error getting event stats: ${error.message}`);
  }
};

// Chat History Functions
const saveChatMessage = async (userId, message, response) => {
  try {
    const chatDoc = {
      userId,
      message,
      response,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('chatHistory').add(chatDoc);
    return { id: docRef.id, ...chatDoc };
  } catch (error) {
    throw new Error(`Error saving chat message: ${error.message}`);
  }
};

const getChatHistory = async (userId) => {
  try {
    const snapshot = await db.collection('chatHistory')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw new Error(`Error getting chat history: ${error.message}`);
  }
};

module.exports = {
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
  saveChatMessage,
  getChatHistory
};