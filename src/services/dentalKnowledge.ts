/**
 * Dental Knowledge Base
 * A curated database of common dental questions and answers
 * Used by the chatbot to answer dental questions
 */

export interface DentalQnA {
  question: string[];
  answer: string;
}

/**
 * Dental Knowledge Database
 * Contains common dental questions and professional answers
 */
export const DENTAL_KNOWLEDGE_BASE: DentalQnA[] = [
  {
    question: ['tooth pain', 'toothache', 'tooth hurts', 'painful tooth'],
    answer: 'Tooth pain can be caused by cavities, tooth decay, infection, or sensitivity. It\'s important to see a dentist soon to identify the cause. Would you like to book an appointment?'
  },
  {
    question: ['gum bleeding', 'bleeding gums', 'gums bleed', 'blood when brushing'],
    answer: 'Bleeding gums are often a sign of gingivitis (early gum disease) caused by plaque buildup. Regular brushing, flossing, and professional cleanings can help. I\'d recommend booking a cleaning appointment with our periodontist.'
  },
  {
    question: ['how often', 'how often should i', 'when should i', 'frequency'],
    answer: 'General recommendations:\n• Brush teeth: Twice daily (morning and night)\n• Floss: At least once daily\n• Dental checkups: Every 6 months\n• Cleanings: Every 6 months or as recommended by your dentist'
  },
  {
    question: ['cavity', 'cavities', 'tooth decay', 'decay'],
    answer: 'Cavities are holes in teeth caused by tooth decay. They need to be filled by a dentist. If left untreated, they can cause pain and infection. Would you like to schedule a checkup?'
  },
  {
    question: ['root canal', 'what is root canal', 'root canal treatment'],
    answer: 'A root canal is a procedure to save an infected or damaged tooth. The dentist removes the infected pulp, cleans the inside of the tooth, and seals it. It\'s usually painless with modern techniques.'
  },
  {
    question: ['whitening', 'teeth whitening', 'bleach teeth', 'white teeth'],
    answer: 'Teeth whitening can be done professionally at the dentist\'s office or at home with dentist-supervised products. Professional whitening is safer and more effective. Our cosmetic dentists can help with whitening options.'
  },
  {
    question: ['bad breath', 'halitosis', 'breath smells'],
    answer: 'Bad breath can be caused by poor oral hygiene, gum disease, certain foods, dry mouth, or medical conditions. Regular brushing, flossing, and dental cleanings help. If it persists, it\'s good to see a dentist to rule out gum disease.'
  },
  {
    question: ['wisdom tooth', 'wisdom teeth', 'third molar', 'impacted tooth'],
    answer: 'Wisdom teeth are the last molars that usually appear in late teens or early twenties. They often need removal if they\'re impacted, causing pain, or crowding other teeth. Our oral surgeons can evaluate and remove them if needed.'
  },
  {
    question: ['braces', 'orthodontics', 'straighten teeth', 'crooked teeth'],
    answer: 'Braces and orthodontic treatment can straighten crooked teeth and correct bite issues. Treatment typically lasts 1-3 years. Our orthodontists can evaluate if you\'re a candidate for braces or clear aligners.'
  },
  {
    question: ['sensitive teeth', 'tooth sensitivity', 'sensitive to cold', 'sensitive to hot'],
    answer: 'Tooth sensitivity is often caused by worn enamel, exposed roots, or cavities. Using sensitive toothpaste, avoiding acidic foods, and seeing a dentist can help. If severe, dental treatment may be needed.'
  },
  {
    question: ['flossing', 'how to floss', 'should i floss'],
    answer: 'Yes, you should floss daily! Flossing removes plaque and food particles between teeth that brushing can\'t reach. Wrap floss around each tooth in a C-shape and gently slide up and down. Regular flossing prevents gum disease.'
  },
  {
    question: ['crown', 'dental crown', 'cap', 'tooth cap'],
    answer: 'A dental crown is a cap that covers a damaged tooth to restore its shape, size, and strength. It\'s used for severely decayed, cracked, or broken teeth. Our prosthodontists specialize in crowns and restorative work.'
  },
  {
    question: ['extraction', 'tooth extraction', 'pull tooth', 'remove tooth'],
    answer: 'Tooth extraction is the removal of a tooth, usually done when it\'s severely damaged, infected, or causing crowding. The procedure is typically quick and done under local anesthesia. Recovery is usually straightforward.'
  }
];

/**
 * Search dental knowledge base for an answer
 * @param question - User's question
 * @returns Answer if found, null otherwise
 */
export function searchDentalKnowledge(question: string): string | null {
  const lowerQuestion = question.toLowerCase();
  
  // Search through knowledge base
  for (const qna of DENTAL_KNOWLEDGE_BASE) {
    // Check if any keyword in the question matches
    const found = qna.question.some(keyword => lowerQuestion.includes(keyword));
    
    if (found) {
      return qna.answer;
    }
  }
  
  return null;
}

/**
 * Check if question is dental-related
 */
export function isDentalQuestion(question: string): boolean {
  const dentalKeywords = [
    'tooth', 'teeth', 'dental', 'dentist', 'gum', 'mouth', 'oral',
    'cavity', 'pain', 'bleeding', 'brushing', 'flossing', 'braces',
    'crown', 'root canal', 'extraction', 'whitening', 'sensitive',
    'wisdom', 'bad breath', 'halitosis', 'plaque', 'gingivitis'
  ];
  
  const lowerQuestion = question.toLowerCase();
  return dentalKeywords.some(keyword => lowerQuestion.includes(keyword));
}

