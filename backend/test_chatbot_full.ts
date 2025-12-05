// Comprehensive test for chatbot dental Q&A
// Run with: npx tsx test_chatbot_full.ts

import { geminiService } from './src/services/gemini.service.js';

const questions = [
    // --- Basic General Dentistry Questions ---
    "What causes dental caries?",
    "How often should someone get a dental cleaning?",
    "What is dental plaque made of?",
    "What is the difference between plaque and tartar?",
    "Why is fluoride important?",
    "What causes tooth sensitivity to hot and cold?",
    "How often should toothbrushes be replaced?",
    "What is gingivitis?",
    "Is bleeding during brushing normal?",
    "Why do some people grind their teeth?",

    // --- Intermediate Questions ---
    "What are the signs of early gum disease?",
    "How does diet affect oral health?",
    "What is the recommended treatment for a cracked tooth?",
    "Can cavities heal on their own?",
    "How does smoking affect oral tissues?",
    "What are dental sealants and who needs them?",
    "When is a root canal recommended?",
    "What is dental erosion and how is it treated?",
    "How can jaw pain be related to the teeth?",
    "What factors determine whether a tooth needs extraction or restoration?",

    // --- Advanced / Clinical Reasoning Questions ---
    "A patient complains of sharp pain only when biting—what are the likely causes?",
    "How do you differentiate reversible vs. irreversible pulpitis clinically?",
    "What is the best management for a vertical root fracture?",
    "A patient has chronic halitosis despite brushing—what are the possible dental and systemic causes?",
    "Why would a tooth with no visible cavity still cause severe pain?",
    "What is the protocol if a patient presents with an avulsed permanent tooth?",
    "How does diabetes influence periodontal disease progression?",
    "What are the contraindications for using local anesthesia with epinephrine?",
    "When should a periapical radiograph be preferred over a panoramic?",
    "What are common causes of a periapical radiolucency besides infection?",

    // --- Clever & Trick Questions ---
    "Can a cavity form under a filling?",
    "Why might a tooth still hurt after a root canal?",
    "Can wisdom teeth cause sinus problems?",
    "If a tooth stops hurting, does that mean the infection is gone?",
    "Can you whiten crowns or veneers?",
    "Why do gums recede even without gum disease?",
    "If a patient brushes very hard, why could that cause sensitivity?",
    "Can a cracked tooth show up clearly on X-rays?",
    "If someone has no pain, can they still have severe gum disease?",
    "Is it possible for baby teeth to get root canals?",

    // --- Patient Scenario Questions ---
    "A 30-year-old patient has spontaneous night pain in a molar—what does this indicate?",
    "A child presents with white spots on teeth—what are potential causes?",
    "A patient experiences pain when drinking cold water but not hot—interpretation?",
    "A patient with braces develops swollen gums—likely cause and management?",
    "A patient reports jaw clicking when chewing—possible diagnoses?",
    "A patient has a metallic taste in the mouth—what are possible oral sources?",
    "A smoker with persistent leukoplakia—next steps?",
    "Patient asks if they should remove tartar at home—how to respond?",
    "A patient has a broken tooth but no pain—does it still require treatment?",
    "How to manage dental anxiety in a highly nervous patient?"
];

async function runFullTest() {
    console.log('='.repeat(80));
    console.log('FULL CHATBOT DENTAL Q&A TEST (50 Questions)');
    console.log('='.repeat(80));
    console.log('');

    let successCount = 0;

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        console.log(`[${i + 1}/50] Q: "${q}"`);

        try {
            const startTime = Date.now();
            const answer = await geminiService.answerDentistryQuestion(q);
            const duration = Date.now() - startTime;

            console.log(`✅ Answered in ${duration}ms`);
            console.log('-'.repeat(40));
            console.log(answer.substring(0, 300) + '...'); // Show first 300 chars
            console.log('-'.repeat(40));
            console.log('');

            successCount++;

            // Wait to avoid rate limits (important for free tier)
            await new Promise(r => setTimeout(r, 4000));

        } catch (error: any) {
            console.log(`❌ FAILED: ${error.message}`);
            console.log('');
            // Wait longer on error
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    console.log('='.repeat(80));
    console.log(`TEST COMPLETE: ${successCount}/50 Successful`);
    console.log('='.repeat(80));
}

runFullTest().catch(console.error);
