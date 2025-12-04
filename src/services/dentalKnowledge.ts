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
  // Basic Oral Hygiene
  {
    question: ['tooth pain', 'toothache', 'tooth hurts', 'painful tooth', 'tooth is hurting'],
    answer: 'Tooth pain can be caused by cavities, tooth decay, infection, or sensitivity. It\'s important to see a dentist soon to identify the cause. Would you like to book an appointment?'
  },
  {
    question: ['gum bleeding', 'bleeding gums', 'gums bleed', 'blood when brushing', 'gums are bleeding'],
    answer: 'Bleeding gums are often a sign of gingivitis (early gum disease) caused by plaque buildup. Regular brushing, flossing, and professional cleanings can help. I\'d recommend booking a cleaning appointment with our periodontist.'
  },
  {
    question: ['how often', 'how often should i', 'when should i', 'frequency', 'how many times'],
    answer: 'General recommendations:\n• Brush teeth: Twice daily (morning and night)\n• Floss: At least once daily\n• Dental checkups: Every 6 months\n• Cleanings: Every 6 months or as recommended by your dentist'
  },
  {
    question: ['brush', 'brushing', 'how to brush', 'brush teeth'],
    answer: 'You should brush your teeth at least twice a day for two minutes each time. Use a soft-bristled toothbrush and fluoride toothpaste. Brush in circular motions, covering all surfaces of your teeth and along the gumline.'
  },
  {
    question: ['flossing', 'how to floss', 'should i floss'],
    answer: 'Yes, you should floss daily! Flossing removes plaque and food particles between teeth that brushing can\'t reach. Wrap floss around each tooth in a C-shape and gently slide up and down. Regular flossing prevents gum disease.'
  },
  {
    question: ['cleaning', 'dental cleaning', 'teeth cleaning', 'professional cleaning'],
    answer: 'Professional dental cleanings remove plaque and tartar that regular brushing can\'t. Most people should have cleanings every 6 months, though some may need them more frequently. Would you like to schedule a cleaning?'
  },
  {
    question: ['toothpaste', 'what toothpaste', 'which toothpaste', 'best toothpaste'],
    answer: 'Choose a toothpaste with fluoride, which helps prevent cavities. For sensitive teeth, use a desensitizing toothpaste. For whitening, look for ADA-approved whitening toothpastes. Your dentist can recommend the best option for your needs.'
  },
  {
    question: ['mouthwash', 'mouth rinse', 'should i use mouthwash'],
    answer: 'Mouthwash can be a helpful addition to brushing and flossing, but it doesn\'t replace them. Therapeutic mouthwashes with fluoride or antimicrobial ingredients can help reduce plaque and prevent cavities. Ask your dentist which type is best for you.'
  },
  
  // Dental Conditions
  {
    question: ['cavity', 'cavities', 'tooth decay', 'decay'],
    answer: 'Cavities are holes in teeth caused by tooth decay. They need to be filled by a dentist. If left untreated, they can cause pain and infection. Would you like to schedule a checkup?'
  },
  {
    question: ['sensitive teeth', 'tooth sensitivity', 'sensitive to cold', 'sensitive to hot'],
    answer: 'Tooth sensitivity is often caused by worn enamel, exposed roots, or cavities. Using sensitive toothpaste, avoiding acidic foods, and seeing a dentist can help. If severe, dental treatment may be needed.'
  },
  {
    question: ['bad breath', 'halitosis', 'breath smells', 'smelly breath'],
    answer: 'Bad breath can be caused by poor oral hygiene, gum disease, certain foods, dry mouth, or medical conditions. Regular brushing, flossing, and dental cleanings help. If it persists, it\'s good to see a dentist to rule out gum disease.'
  },
  {
    question: ['gum disease', 'periodontal', 'gingivitis', 'periodontitis'],
    answer: 'Gum disease starts as gingivitis (inflammation) and can progress to periodontitis (bone loss). Early signs include bleeding gums, redness, and swelling. Regular cleanings and good oral hygiene can prevent and treat it. Would you like to schedule a checkup?'
  },
  {
    question: ['plaque', 'tartar', 'calculus'],
    answer: 'Plaque is a sticky film of bacteria that forms on teeth. If not removed, it hardens into tartar (calculus). Regular brushing and flossing remove plaque, but only professional cleanings can remove tartar.'
  },
  {
    question: ['dry mouth', 'xerostomia'],
    answer: 'Dry mouth can be caused by medications, medical conditions, or dehydration. It increases the risk of cavities and gum disease. Stay hydrated, use sugar-free gum or lozenges, and consider saliva substitutes. Your dentist can help identify the cause.'
  },
  
  // Dental Procedures
  {
    question: ['root canal', 'what is root canal', 'root canal treatment'],
    answer: 'A root canal is a procedure to save an infected or damaged tooth. The dentist removes the infected pulp, cleans the inside of the tooth, and seals it. It\'s usually painless with modern techniques.'
  },
  {
    question: ['crown', 'dental crown', 'cap', 'tooth cap'],
    answer: 'A dental crown is a cap that covers a damaged tooth to restore its shape, size, and strength. It\'s used for severely decayed, cracked, or broken teeth. Our prosthodontists specialize in crowns and restorative work.'
  },
  {
    question: ['filling', 'dental filling', 'tooth filling'],
    answer: 'Fillings repair cavities and restore damaged teeth. Common materials include composite (tooth-colored), amalgam (silver), and gold. Your dentist will recommend the best option based on the location and size of the cavity.'
  },
  {
    question: ['extraction', 'tooth extraction', 'pull tooth', 'remove tooth'],
    answer: 'Tooth extraction is the removal of a tooth, usually done when it\'s severely damaged, infected, or causing crowding. The procedure is typically quick and done under local anesthesia. Recovery is usually straightforward.'
  },
  {
    question: ['wisdom tooth', 'wisdom teeth', 'third molar', 'impacted tooth'],
    answer: 'Wisdom teeth are the last molars that usually appear in late teens or early twenties. They often need removal if they\'re impacted, causing pain, or crowding other teeth. Our oral surgeons can evaluate and remove them if needed.'
  },
  {
    question: ['implant', 'dental implant', 'tooth implant'],
    answer: 'Dental implants are artificial tooth roots made of titanium that are surgically placed in the jawbone. They provide a strong foundation for replacement teeth. They look and function like natural teeth and can last a lifetime with proper care.'
  },
  {
    question: ['bridge', 'dental bridge'],
    answer: 'A dental bridge replaces missing teeth by anchoring artificial teeth to adjacent natural teeth or implants. It restores your smile and ability to chew properly. Bridges can last 10-15 years with good oral hygiene.'
  },
  {
    question: ['dentures', 'denture'],
    answer: 'Dentures are removable replacements for missing teeth. Full dentures replace all teeth, while partial dentures replace some. Modern dentures are more comfortable and natural-looking than ever. Your dentist can help you choose the best option.'
  },
  {
    question: ['veneers', 'dental veneers'],
    answer: 'Veneers are thin shells of porcelain or composite that cover the front of teeth to improve appearance. They can fix discoloration, chips, gaps, or misalignment. The process typically takes 2-3 visits. Our cosmetic dentists can help.'
  },
  
  // Orthodontics
  {
    question: ['braces', 'orthodontics', 'straighten teeth', 'crooked teeth'],
    answer: 'Braces and orthodontic treatment can straighten crooked teeth and correct bite issues. Treatment typically lasts 1-3 years. Our orthodontists can evaluate if you\'re a candidate for braces or clear aligners.'
  },
  {
    question: ['invisalign', 'clear aligners', 'invisible braces'],
    answer: 'Invisalign and clear aligners are removable, nearly invisible alternatives to traditional braces. They gradually move teeth into position. Treatment time varies but is often similar to braces. Our orthodontists can determine if you\'re a candidate.'
  },
  
  // Cosmetic Dentistry
  {
    question: ['whitening', 'teeth whitening', 'bleach teeth', 'white teeth', 'whiten'],
    answer: 'Teeth whitening can be done professionally at the dentist\'s office or at home with dentist-supervised products. Professional whitening is safer and more effective. Our cosmetic dentists can help with whitening options.'
  },
  {
    question: ['cosmetic', 'cosmetic dentistry', 'smile makeover'],
    answer: 'Cosmetic dentistry improves the appearance of your smile through procedures like whitening, veneers, bonding, and crowns. Our cosmetic dentists can create a treatment plan tailored to your goals and budget.'
  },
  
  // Children's Dentistry
  {
    question: ['children', 'kids', 'pediatric', 'baby teeth', 'primary teeth'],
    answer: 'Children should see a dentist by their first birthday or when their first tooth appears. Baby teeth are important for speech, chewing, and holding space for permanent teeth. Regular checkups help prevent problems and establish good habits.'
  },
  {
    question: ['baby bottle', 'bottle decay', 'nursing caries'],
    answer: 'Baby bottle tooth decay occurs when babies\' teeth are frequently exposed to sugary liquids. To prevent it, avoid putting babies to bed with bottles, clean gums after feeding, and start brushing when teeth appear.'
  },
  
  // Emergency & Pain
  {
    question: ['emergency', 'dental emergency', 'urgent', 'broken tooth', 'knocked out'],
    answer: 'For dental emergencies like severe pain, knocked-out teeth, or broken teeth, contact a dentist immediately. If it\'s after hours, go to an emergency room. Time is critical for saving teeth in emergencies.'
  },
  {
    question: ['abscess', 'infection', 'swelling', 'facial swelling'],
    answer: 'A dental abscess is a serious infection that requires immediate treatment. Symptoms include severe pain, swelling, fever, and pus. See a dentist or go to the ER immediately. Don\'t delay treatment as infections can spread.'
  },
  
  // Preventive Care
  {
    question: ['checkup', 'dental exam', 'examination'],
    answer: 'Regular dental checkups (every 6 months) help catch problems early, when they\'re easier and less expensive to treat. Your dentist will examine your teeth, gums, and mouth, and may take X-rays to check for hidden issues.'
  },
  {
    question: ['x-ray', 'xray', 'radiograph'],
    answer: 'Dental X-rays help dentists see problems that aren\'t visible during a regular exam, like cavities between teeth, impacted teeth, or bone loss. Modern digital X-rays use very low radiation and are safe.'
  },
  {
    question: ['fluoride', 'fluoride treatment'],
    answer: 'Fluoride strengthens tooth enamel and helps prevent cavities. It\'s found in toothpaste, water, and professional treatments. Your dentist may recommend additional fluoride treatments if you\'re at high risk for cavities.'
  },
  {
    question: ['sealant', 'dental sealant'],
    answer: 'Sealants are thin protective coatings applied to the chewing surfaces of back teeth. They prevent cavities by sealing out food and bacteria. They\'re especially beneficial for children and teens.'
  },
  
  // General Questions
  {
    question: ['cost', 'price', 'expensive', 'affordable', 'insurance'],
    answer: 'Dental costs vary by procedure and location. Many offices offer payment plans, and dental insurance can help cover costs. Preventive care (cleanings, checkups) is much less expensive than treating problems later. Contact us for specific pricing.'
  },
  {
    question: ['anesthesia', 'numb', 'painful', 'does it hurt'],
    answer: 'Modern dentistry is designed to be as comfortable as possible. Local anesthesia numbs the area being treated, so you shouldn\'t feel pain during procedures. Many patients report feeling only pressure. Your comfort is our priority.'
  },
  {
    question: ['pregnancy', 'pregnant', 'expecting'],
    answer: 'Dental care is safe and important during pregnancy. Hormonal changes can increase the risk of gum disease. Regular cleanings and checkups are recommended. Inform your dentist if you\'re pregnant so they can adjust treatment if needed.'
  },
  {
    question: ['diabetes', 'diabetic'],
    answer: 'People with diabetes are at higher risk for gum disease and other oral health problems. Good blood sugar control and excellent oral hygiene are essential. Regular dental visits are especially important. Inform your dentist about your condition.'
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

