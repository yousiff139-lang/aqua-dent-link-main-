// Simple OpenAI client for chatbot
export async function sendChatMessage(messages: Array<{role: string; content: string}>) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey || apiKey === 'sk-proj-test-key-replace-with-real-key') {
    // Fallback to a simple response that encourages using the main chatbot
    return "I'm here to help with your dental needs! For the best experience, please use the main chatbot which is powered by advanced AI. I can help you with:\n\n• Booking appointments\n• Answering dental health questions\n• Finding the right dentist\n• Understanding treatment options\n\nHow can I assist you today?";
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a helpful dental assistant AI. You help patients:
1. Book appointments with dentists
2. Answer questions about dental health
3. Understand their symptoms
4. Find the right dentist for their needs

Be friendly, professional, and helpful. Support both English and Arabic.`
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API error');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI error:', error);
    return getMockResponse(messages[messages.length - 1].content);
  }
}

function getMockResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();
  
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('مرحبا')) {
    return "Hello! 👋 I'm your dental assistant. I can help you:\n\n• Book appointments with dentists\n• Answer dental health questions\n• Find the right dentist for your needs\n• Understand your symptoms\n\nHow can I help you today?";
  }
  
  if (msg.includes('appointment') || msg.includes('book') || msg.includes('موعد')) {
    return "I'd be happy to help you book an appointment! 📅\n\nTo find the best dentist for you, could you tell me:\n1. What type of dental service do you need? (cleaning, checkup, emergency, etc.)\n2. Do you have any specific symptoms or concerns?\n3. When would you prefer to schedule the appointment?";
  }
  
  if (msg.includes('pain') || msg.includes('hurt') || msg.includes('ألم')) {
    return "I'm sorry to hear you're experiencing pain. 😟\n\nDental pain can have various causes:\n• Tooth decay or cavities\n• Gum disease\n• Tooth sensitivity\n• Infection\n\nI recommend booking an appointment with a dentist as soon as possible. Would you like me to help you find an available dentist for an emergency consultation?";
  }
  
  if (msg.includes('dentist') || msg.includes('doctor') || msg.includes('طبيب')) {
    return "We have several excellent dentists available! 🦷\n\nOur dentists specialize in:\n• General Dentistry\n• Orthodontics\n• Cosmetic Dentistry\n• Oral Surgery\n• Pediatric Dentistry\n\nWould you like me to show you available dentists and their schedules?";
  }
  
  if (msg.includes('cost') || msg.includes('price') || msg.includes('سعر')) {
    return "Our pricing varies depending on the service:\n\n• General Checkup: $50-$100\n• Cleaning: $75-$150\n• Filling: $100-$300\n• Root Canal: $500-$1000\n• Cosmetic Procedures: Varies\n\nMany of our dentists offer payment plans. Would you like to book a consultation to discuss your specific needs and get an accurate quote?";
  }
  
  return "I understand. I'm here to help with your dental needs! 😊\n\nI can assist you with:\n• Booking appointments\n• Finding the right dentist\n• Answering dental health questions\n• Understanding treatment options\n\nWhat would you like to know more about?";
}
