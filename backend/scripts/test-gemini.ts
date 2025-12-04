import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load .env from root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const apiKey = process.env.GEMINI_API_KEY;
console.log('Testing Gemini Connection...');
console.log('API Key present:', !!apiKey);

const genAI = new GoogleGenerativeAI(apiKey || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

async function test() {
    try {
        console.log('Sending request to Gemini (2.0-flash)...');
        const result = await model.generateContent('Hello, are you working?');
        const response = await result.response;

        const output = {
            success: true,
            content: response.text()
        };
        fs.writeFileSync('gemini_result.json', JSON.stringify(output, null, 2));
        console.log('Success!');
    } catch (error: any) {
        const output = {
            success: false,
            message: error.message,
            status: error.status || error.response?.status,
            details: error.response?.data || error.toString()
        };
        fs.writeFileSync('gemini_result.json', JSON.stringify(output, null, 2));
        console.error('❌ Error testing Gemini:', error.message);
    }
}

test();
