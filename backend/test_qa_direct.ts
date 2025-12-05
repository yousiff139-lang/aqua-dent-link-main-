// Simple test for chatbot Q&A
// Run from backend folder with: npx tsx test_qa_direct.ts

import { geminiService } from './src/services/gemini.service.js';

const testQuestions = [
    // Basic
    { level: 'BASIC', q: 'What causes dental caries?' },
    { level: 'BASIC', q: 'What is the difference between plaque and tartar?' },

    // Intermediate
    { level: 'INTERMEDIATE', q: 'What are the signs of early gum disease?' },
    { level: 'INTERMEDIATE', q: 'When is a root canal recommended?' },

    // Advanced
    { level: 'ADVANCED', q: 'A patient complains of sharp pain only when biting—what are the likely causes?' },

    // Trick
    { level: 'TRICK', q: 'If a tooth stops hurting, does that mean the infection is gone?' },

    // Scenario
    { level: 'SCENARIO', q: 'A 30-year-old patient has spontaneous night pain in a molar—what does this indicate?' },
];

async function runTest() {
    console.log('='.repeat(80));
    console.log('CHATBOT Q&A ENHANCEMENT TEST');
    console.log('='.repeat(80));
    console.log('');

    for (const { level, q } of testQuestions) {
        console.log('-'.repeat(80));
        console.log(`📋 [${level}] QUESTION: ${q}`);
        console.log('-'.repeat(80));

        try {
            const startTime = Date.now();
            const answer = await geminiService.answerDentistryQuestion(q);
            const duration = Date.now() - startTime;

            console.log('');
            console.log('🤖 CHATBOT RESPONSE:');
            console.log('');
            console.log(answer);
            console.log('');
            console.log(`⏱️ Response time: ${duration}ms`);
            console.log('');
        } catch (error: any) {
            console.log(`❌ ERROR: ${error.message}`);
            console.log('');
        }

        // Rate limit delay
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('='.repeat(80));
    console.log('TEST COMPLETE');
    console.log('='.repeat(80));
}

runTest().catch(console.error);
