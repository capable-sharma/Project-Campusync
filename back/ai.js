const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getUserRegisteredEvents, getApprovedEvents, saveChatMessage } = require('./db');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Helper function to format events for AI context
const formatEventsForAI = (events) => {
  return events.map(event => ({
    title: event.title,
    date: event.date,
    time: event.time,
    venue: event.venue,
    description: event.description,
    tags: event.tags
  }));
};

// Helper function to filter events by date range
const filterEventsByDateRange = (events, days) => {
  const now = new Date();
  const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  
  return events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate >= now && eventDate <= futureDate;
  });
};

// Helper function to get events by tags
const filterEventsByTags = (events, tags) => {
  const searchTags = tags.map(tag => tag.toLowerCase());
  return events.filter(event => 
    event.tags.some(tag => 
      searchTags.some(searchTag => tag.toLowerCase().includes(searchTag))
    )
  );
};

// Main AI processing function
const processAIQuery = async (userId, userPrompt) => {
  try {
    // Get user's registered events and all approved events
    const [userRegisteredEvents, allApprovedEvents] = await Promise.all([
      getUserRegisteredEvents(userId),
      getApprovedEvents()
    ]);

    // Analyze the prompt to determine what information to include
    const promptLower = userPrompt.toLowerCase();
    let relevantEvents = [];
    let contextType = 'general';

    // Check if user is asking about their registered events
    if (promptLower.includes('my events') || promptLower.includes('registered') || promptLower.includes('enrolled')) {
      relevantEvents = userRegisteredEvents;
      contextType = 'registered';
    }
    // Check if user is asking about upcoming events in specific time frame
    else if (promptLower.includes('next week') || promptLower.includes('this week')) {
      relevantEvents = filterEventsByDateRange(allApprovedEvents, 7);
      contextType = 'upcoming_week';
    }
    else if (promptLower.includes('next month') || promptLower.includes('this month')) {
      relevantEvents = filterEventsByDateRange(allApprovedEvents, 30);
      contextType = 'upcoming_month';
    }
    else if (promptLower.includes('today') || promptLower.includes('tomorrow')) {
      relevantEvents = filterEventsByDateRange(allApprovedEvents, 1);
      contextType = 'today_tomorrow';
    }
    // Check if user is asking about specific types of events
    else if (promptLower.includes('academic') || promptLower.includes('exam') || promptLower.includes('holiday')) {
      relevantEvents = allApprovedEvents.filter(event => event.type === 'academic');
      contextType = 'academic';
    }
    else if (promptLower.includes('club') || promptLower.includes('cultural') || promptLower.includes('technical')) {
      relevantEvents = allApprovedEvents.filter(event => event.type === 'club');
      contextType = 'club';
    }
    // Check for specific event categories by tags
    else if (promptLower.includes('technical') || promptLower.includes('coding') || promptLower.includes('programming')) {
      relevantEvents = filterEventsByTags(allApprovedEvents, ['technical', 'coding', 'programming', 'hackathon']);
      contextType = 'technical';
    }
    else if (promptLower.includes('cultural') || promptLower.includes('dance') || promptLower.includes('music')) {
      relevantEvents = filterEventsByTags(allApprovedEvents, ['cultural', 'dance', 'music', 'art']);
      contextType = 'cultural';
    }
    else if (promptLower.includes('sports') || promptLower.includes('game') || promptLower.includes('tournament')) {
      relevantEvents = filterEventsByTags(allApprovedEvents, ['sports', 'game', 'tournament', 'athletics']);
      contextType = 'sports';
    }
    // Default to all upcoming events
    else {
      relevantEvents = allApprovedEvents;
      contextType = 'all';
    }

    // Format events for AI context
    const formattedEvents = formatEventsForAI(relevantEvents);

    // Create context-aware prompt
    let systemPrompt = `You are Campusync AI, a helpful assistant for college students. You help students with information about college events, academics, and campus life.

Context Information:
- User is asking: "${userPrompt}"
- Context type: ${contextType}
- Available events: ${formattedEvents.length} events

Events data:
${JSON.stringify(formattedEvents, null, 2)}

Instructions:
1. Provide a helpful, friendly response to the user's query
2. If the user asks about events, include relevant event details from the provided data
3. Format event information clearly with titles, dates, times, venues, and descriptions
4. If no relevant events are found, politely inform the user
5. Keep responses concise but informative
6. Be encouraging and supportive
7. If the user asks about enrollment or registration, remind them they can enroll through the app
8. Use a conversational, student-friendly tone`;

    // Generate AI response
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `User Query: ${userPrompt}` }
    ]);

    const aiResponse = result.response.text();

    // Save chat message to database
    await saveChatMessage(userId, userPrompt, aiResponse);
    console.log(aiResponse);
    return {
      success: true,
      response: aiResponse,
      relevantEvents: formattedEvents,
      contextType
    };

  } catch (error) {
    console.error('AI Processing Error:', error);
    
    // Fallback response
    const fallbackResponse = "I'm sorry, I encountered an error while processing your request. Please try again or contact support if the problem persists.";
    
    // Still try to save the chat message
    try {
      await saveChatMessage(userId, userPrompt, fallbackResponse);
    } catch (saveError) {
      console.error('Error saving fallback message:', saveError);
    }

    return {
      success: false,
      response: fallbackResponse,
      error: error.message
    };
  }
};

// Function to get event recommendations based on user's past enrollments
const getEventRecommendations = async (userId) => {
  try {
    const userRegisteredEvents = await getUserRegisteredEvents(userId);
    const allApprovedEvents = await getApprovedEvents();

    // Extract tags from user's registered events
    const userTags = userRegisteredEvents.flatMap(event => event.tags || []);
    const tagFrequency = {};
    
    userTags.forEach(tag => {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    });

    // Get events user is not registered for
    const userEventIds = userRegisteredEvents.map(event => event.id);
    const unregisteredEvents = allApprovedEvents.filter(event => !userEventIds.includes(event.id));

    // Score events based on tag similarity
    const scoredEvents = unregisteredEvents.map(event => {
      let score = 0;
      event.tags?.forEach(tag => {
        score += tagFrequency[tag] || 0;
      });
      return { ...event, score };
    });

    // Sort by score and return top 5
    const recommendations = scoredEvents
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(event => ({
        title: event.title,
        date: event.date,
        time: event.time,
        venue: event.venue,
        description: event.description,
        tags: event.tags,
        score: event.score
      }));

    return {
      success: true,
      recommendations
    };

  } catch (error) {
    console.error('Recommendation Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Function to generate event summaries
const generateEventSummary = async (eventData) => {
  try {
    const prompt = `Generate a concise, engaging summary for this college event:

Event Details:
- Title: ${eventData.title}
- Date: ${eventData.date}
- Time: ${eventData.time}
- Venue: ${eventData.venue}
- Description: ${eventData.description}
- Tags: ${eventData.tags?.join(', ')}

Please create a 2-3 sentence summary that would attract students to attend this event. Focus on the key benefits and what makes it interesting.`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return {
      success: true,
      summary: summary.trim()
    };

  } catch (error) {
    console.error('Summary Generation Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  processAIQuery,
  getEventRecommendations,
  generateEventSummary
};