import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from backend root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const apiKey = process.env.OPENAI_API_KEY;
console.log('Testing OpenAI Connection...');
console.log('API Key present:', !!apiKey);
if (apiKey) {
    console.log('API Key prefix:', apiKey.substring(0, 10) + '...');
}

const openai = new OpenAI({
    apiKey: apiKey,
});

import fs from 'fs';

async function test() {
    try {
        console.log('Sending request to OpenAI...');
        const completion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: 'Hello' }],
            model: 'gpt-3.5-turbo',
        });

        const result = {
            success: true,
            content: completion.choices[0].message.content
        };
        fs.writeFileSync('result.json', JSON.stringify(result, null, 2));
        console.log('Success!');
    } catch (error: any) {
        const result = {
            success: false,
            message: error.message,
            status: error.status || error.response?.status,
            code: error.code || error.error?.code,
            type: error.type || error.error?.type
        };
        fs.writeFileSync('result.json', JSON.stringify(result, null, 2));
        console.error('Error:', error.message);
    }
}

test();
