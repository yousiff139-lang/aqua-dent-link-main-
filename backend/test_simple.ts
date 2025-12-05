// Ultra simple test
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key found:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');

if (!apiKey) {
    console.error('No API key!');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

async function test() {
    console.log('Testing simple question with gemini-2.0-flash...');
    try {
        const result = await model.generateContent('What causes dental caries? Answer briefly.');
        const response = await result.response;
        console.log('\n✅ SUCCESS!\n');
        console.log('Response:', response.text());
    } catch (error: any) {
        console.error('\n❌ ERROR:', error.message);
    }
}

test();
