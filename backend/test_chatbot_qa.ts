// Test script for chatbot dental Q&A
// Run with: node --loader ts-node/esm backend/test_chatbot_qa.ts

import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

// Sample questions from each category
const testQuestions = [
    // Basic (3 questions)
    { level: 'BASIC', q: 'What causes dental caries?' },
    { level: 'BASIC', q: 'What is the difference between plaque and tartar?' },
    { level: 'BASIC', q: 'Why is fluoride important?' },

    // Intermediate (3 questions)  
    { level: 'INTERMEDIATE', q: 'What are the signs of early gum disease?' },
    { level: 'INTERMEDIATE', q: 'When is a root canal recommended?' },
    { level: 'INTERMEDIATE', q: 'How does smoking affect oral tissues?' },

    // Advanced/Clinical (3 questions)
    { level: 'ADVANCED', q: 'A patient complains of sharp pain only when biting—what are the likely causes?' },
    { level: 'ADVANCED', q: 'How do you differentiate reversible vs. irreversible pulpitis clinically?' },
    { level: 'ADVANCED', q: 'What is the protocol if a patient presents with an avulsed permanent tooth?' },

    // Trick Questions (3 questions)
    { level: 'TRICK', q: 'If a tooth stops hurting, does that mean the infection is gone?' },
    { level: 'TRICK', q: 'Can you whiten crowns or veneers?' },
    { level: 'TRICK', q: 'If someone has no pain, can they still have severe gum disease?' },

    // Patient Scenarios (3 questions)
    { level: 'SCENARIO', q: 'A 30-year-old patient has spontaneous night pain in a molar—what does this indicate?' },
    { level: 'SCENARIO', q: 'A patient has a broken tooth but no pain—does it still require treatment?' },
    { level: 'SCENARIO', q: 'How to manage dental anxiety in a highly nervous patient?' },
];

async function startConversation() {
    // Start with a mock user
    const response = await axios.post(`${API_URL}/chat/message`, {
        message: 'Hi',
        userId: 'test-user-123',
        userName: 'Test Patient',
        userEmail: 'test@example.com'
    });

    return response.data.conversationId;
}

async function askQuestion(conversationId: string, question: string) {
    // First select "Ask a Dentistry Question" if needed
    const response = await axios.post(`${API_URL}/chat/message`, {
        message: question,
        conversationId
    });

    return response.data.response?.content || response.data.message;
}

async function runTests() {
    console.log('='.repeat(80));
    console.log('CHATBOT DENTAL Q&A TEST');
    console.log('Testing enhanced AI responses across difficulty levels');
    console.log('='.repeat(80));
    console.log('');

    try {
        // Start conversation
        console.log('Starting conversation...');
        const convId = await startConversation();
        console.log(`Conversation ID: ${convId}`);
        console.log('');

        // Select Q&A mode
        await askQuestion(convId, 'Ask a Dentistry Question');

        // Test each question
        for (const { level, q } of testQuestions) {
            console.log('-'.repeat(80));
            console.log(`📋 [${level}] Question:`);
            console.log(`   "${q}"`);
            console.log('');

            try {
                const answer = await askQuestion(convId, q);
                console.log('🤖 Chatbot Response:');
                console.log('');
                // Indent the response for readability
                const indented = answer.split('\n').map((line: string) => `   ${line}`).join('\n');
                console.log(indented);
            } catch (error: any) {
                console.log(`❌ Error: ${error.message}`);
            }

            console.log('');
            // Small delay between questions
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('='.repeat(80));
        console.log('TEST COMPLETE');
        console.log('='.repeat(80));

    } catch (error: any) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

runTests();
