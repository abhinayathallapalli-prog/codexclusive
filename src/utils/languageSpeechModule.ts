import { LanguageCode } from '../types';

export interface RegionalVoiceConfig {
  code: LanguageCode;
  name: string;
  nativeName: string;
  scriptName: string;
  speechRecognitionLang: string;
  speechRecognitionFallbacks: string[];
  speechSynthesisLang: string;
  samplePhrases: Array<{ title: string; text: string; complaint: string }>;
  keywords: {
    chiefComplaints: Record<string, string[]>;
    durations: Array<{ pattern: RegExp; value: string }>;
    locations: Array<{ pattern: RegExp; value: string }>;
    triggers: Array<{ pattern: RegExp; value: string }>;
    associations: Array<{ pattern: RegExp; value: string }>;
    redFlags: string[];
  };
}

/**
 * Dedicated Multi-Language Voice-to-Text & Clinical NLP Module
 * Specifically engineered for Hindi (हिन्दी), Marathi (मराठी), and Telugu (తెలుగు),
 * as well as all supported Indian regional languages.
 */
export const REGIONAL_VOICE_CONFIGS: Record<LanguageCode, RegionalVoiceConfig> = {
  // 1. HINDI (हिन्दी)
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    scriptName: 'Devanagari',
    speechRecognitionLang: 'hi-IN',
    speechRecognitionFallbacks: ['hi-IN', 'hi', 'en-IN'],
    speechSynthesisLang: 'hi-IN',
    samplePhrases: [
      {
        title: 'पेट में जलन व उल्टी',
        text: 'मुझे 3 दिन से पेट के ऊपरी हिस्से में तेज जलन और दर्द है, मसालेदार खाने के बाद बढ़ जाता है और उल्टी जैसा लगता है।',
        complaint: 'Stomach Pain & Gas',
      },
      {
        title: 'घुटने में दर्द व सूजन',
        text: 'दोनों घुटनों में 2 हफ्ते से तेज दर्द और अकड़न है, सीढ़ियां चढ़ते समय और चलने में बहुत दर्द होता है।',
        complaint: 'Joint or Knee Pain',
      },
      {
        title: 'तेज बुखार व ठंड',
        text: 'कल सुबह से तेज बुखार, ठंड और सिरदर्द है, पूरे शरीर में कमजोरी लग रही है।',
        complaint: 'High Fever & Chills',
      },
    ],
    keywords: {
      chiefComplaints: {
        'Stomach Pain & Gas': [
          'पेट', 'दर्द', 'जलन', 'गैस', 'खट्टी डकार', 'उल्टी', 'मतली', 'कब्ज', 'दस्त', 'अजीर्ण',
          'अम्लपित्त', 'मरोड़', 'भूख नहीं', 'पेट फूला', 'अपच', 'पेट में भारीपन', 'सीने में जलन',
        ],
        'Joint or Knee Pain': [
          'घुटना', 'घुटने', 'जोड़', 'जोड़ों', 'हड्डी', 'कमर', 'पीठ', 'अकड़न', 'संधिवात',
          'सूजन', 'चलने में तकलीफ', 'कटकट', 'मोच', 'गांठ', 'हड्डियों में दर्द',
        ],
        'High Fever & Chills': [
          'बुखार', 'ताप', 'ज्वर', 'ठंड', 'कंपकंपी', 'हरारत', 'गर्म शरीर', 'पसीना', 'टूटना',
        ],
        'Cough & Throat Pain': [
          'खांसी', 'खराश', 'गला', 'गले में दर्द', 'कफ', 'बलगम', 'जुकाम', 'छींक', 'गला बैठना',
        ],
        'Headache & Dizziness': [
          'सिरदर्द', 'सर दर्द', 'माथा', 'चक्कर', 'सिर भारी', 'माइग्रेन', 'आंखों के आगे अंधेरा',
        ],
        'Skin Itching or Rash': [
          'खुजली', 'चकत्ते', 'दाने', 'खारिश', 'लालिमा', 'पित्ती', 'एलर्जी', 'त्वचा', 'फोड़े',
        ],
        'Severe Chest Pain': [
          'सीने में दर्द', 'छाती में दर्द', 'दिल', 'दबाव', 'दिल की धड़कन', 'सीने में भारीपन',
        ],
        'Difficulty Breathing': [
          'सांस फूलना', 'दम घुटना', 'सांस लेने में तकलीफ', 'सांस नहीं आ रही', 'घरघराहट',
        ],
      },
      durations: [
        { pattern: /(आज|कुछ घंटे|अभी)/i, value: 'Today (Few hours ago)' },
        { pattern: /(\d+)\s*(दिन|दोन|तीन)/i, value: '2 to 3 days ago' },
        { pattern: /(कल से|परसों से)/i, value: '2 to 3 days ago' },
        { pattern: /(\d+)\s*(हफ्ते|हफ़्ते|सप्ताह)/i, value: '1 to 2 weeks ago' },
        { pattern: /(महीने|महीनों|साल)/i, value: 'More than a month' },
      ],
      locations: [
        { pattern: /(ऊपरी पेट|पेट के ऊपर|छाती के नीचे)/i, value: 'Upper Stomach (Epigastric)' },
        { pattern: /(निचला पेट|नाभि के नीचे)/i, value: 'Lower Abdomen' },
        { pattern: /(दाहिने घुटने|दायां घुटना)/i, value: 'Right Knee Joint' },
        { pattern: /(बाएं घुटने|बायां घुटना)/i, value: 'Left Knee Joint' },
        { pattern: /(दोनों घुटनों|दोनों घुटने)/i, value: 'Both Knee Joints (Bilateral)' },
        { pattern: /(गले|कंठ)/i, value: 'Throat & Pharynx' },
        { pattern: /(माथे|सिर|कनपटी)/i, value: 'Frontal Forehead & Temples' },
        { pattern: /(पूरे शरीर|हाथ पैर|सारे बदन)/i, value: 'Generalized / Throughout Body' },
      ],
      triggers: [
        { pattern: /(मसालेदार|तीखा|तला भुना|मिर्च|खट्टा)/i, value: 'Worse after spicy, oily, or heavy meals' },
        { pattern: /(खाली पेट|भूखे रहने)/i, value: 'Worse on empty stomach / prolonged fasting' },
        { pattern: /(चलने|सीढ़ियां चढ़ने|खड़े रहने)/i, value: 'Aggravated by walking, stairs, or prolonged standing' },
        { pattern: /(ठंड|सर्द|ठंडा पानी)/i, value: 'Worse in cold weather or with cold beverages' },
        { pattern: /(तनाव|चिंता|नींद न आने)/i, value: 'Triggered by stress, screen strain, or sleep deprivation' },
      ],
      associations: [
        { pattern: /(उल्टी|मतली)/i, value: 'Nausea & Vomiting' },
        { pattern: /(जलन|खट्टी डकार)/i, value: 'Retrosternal Burning & Acid Belching' },
        { pattern: /(सूजन|अकड़न)/i, value: 'Joint Swelling & Stiffness' },
        { pattern: /(चक्कर|कमजोरी)/i, value: 'Dizziness & Lightheadedness' },
        { pattern: /(बुखार|हरारत)/i, value: 'Low-grade Fever & Weakness' },
      ],
      redFlags: ['सीने में दर्द', 'छाती में दर्द', 'दिल', 'सांस फूलना', 'दम घुटना', 'बेहोश'],
    },
  },

  // 2. MARATHI (मराठी)
  mr: {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    scriptName: 'Devanagari',
    speechRecognitionLang: 'mr-IN',
    speechRecognitionFallbacks: ['mr-IN', 'mr', 'hi-IN', 'en-IN'],
    speechSynthesisLang: 'mr-IN',
    samplePhrases: [
      {
        title: 'पोटात जळजळ व मळमळ',
        text: 'मला ३ दिवसांपासून पोटात खूप जळजळ आणि उलट्यांसारखे वाटत आहे, तेलकट किंवा तिखट खाल्ल्यावर त्रास वाढतो.',
        complaint: 'Stomach Pain & Gas',
      },
      {
        title: 'गुडघेदुखी व सूज',
        text: 'दोन्ही गुडघ्यांमध्ये २ आठवड्यांपासून तीव्र वेदना आणि सूज आहे, पायऱ्या चढताना आणि चालताना खूप त्रास होतो.',
        complaint: 'Joint or Knee Pain',
      },
      {
        title: 'ताप, थंडी व खोकला',
        text: 'कालपासून अंगात खूप ताप, थंडी आणि खोकला आहे, डोके खूप दुखत आहे आणि अशक्तपणा वाटतो.',
        complaint: 'High Fever & Chills',
      },
    ],
    keywords: {
      chiefComplaints: {
        'Stomach Pain & Gas': [
          'पोट', 'पोटात', 'वेदना', 'जळजळ', 'मळमळ', 'उलटी', 'उलट्या', 'गॅस', 'आंबट ढेकर', 'बद्धकोष्ठता',
          'अजीर्ण', 'पोट फुगणे', 'पोटदुखी', 'अम्लपित्त', 'भूक लागत नाही', 'अपचन', 'छातीत जळजळ',
        ],
        'Joint or Knee Pain': [
          'गुडघा', 'गुडघे', 'गुडघेदुखी', 'सांधे', 'सांधेदुखी', 'हाडे', 'कंबर', 'पाठ', 'कंबरदुखी',
          'सूज', 'अकडणे', 'चालताना त्रास', 'कटकट आवाज', 'संधिवात', 'वातरोग',
        ],
        'High Fever & Chills': [
          'ताप', 'अंगात ताप', 'थंडी', 'कडकडीत ताप', 'कापरे', 'अंगदुखी', 'घाम', 'अशक्तपणा',
        ],
        'Cough & Throat Pain': [
          'खोकला', 'खवखव', 'घसा', 'घशात दुखणे', 'कफ', 'थुंकी', 'सर्दी', 'शिंका', 'आवाज बसणे',
        ],
        'Headache & Dizziness': [
          'डोकेदुखी', 'डोके दुखणे', 'माथा', 'चक्कर', 'डोके जड', 'भोवळ', 'डोळ्यांसमोर अंधारी',
        ],
        'Skin Itching or Rash': [
          'खाज', 'खाज सुटणे', 'पुरळ', 'गांधी उठणे', 'लाल डाग', 'ऍलर्जी', 'त्वचा', 'फोड',
        ],
        'Severe Chest Pain': [
          'छातीत दुखणे', 'छातीत वेदना', 'हृदय', 'छातीवर दडपण', 'छाती भरून येणे',
        ],
        'Difficulty Breathing': [
          'श्वास घेण्यास त्रास', 'दम लागणे', 'श्वास गुदमरणे', 'दम भरणे', 'श्वास लागणे',
        ],
      },
      durations: [
        { pattern: /(आज|काही तास|आत्ताच)/i, value: 'Today (Few hours ago)' },
        { pattern: /(\d+)\s*(दिवस|दिवसांपासून)/i, value: '2 to 3 days ago' },
        { pattern: /(कालपासून|परवापासून)/i, value: '2 to 3 days ago' },
        { pattern: /(\d+)\s*(आठवडे|आठवड्यांपासून)/i, value: '1 to 2 weeks ago' },
        { pattern: /(महिने|महिन्यांपासून|वर्ष)/i, value: 'More than a month' },
      ],
      locations: [
        { pattern: /(वरचे पोट|पोटाच्या वरच्या भागात|छातीखाली)/i, value: 'Upper Stomach (Epigastric)' },
        { pattern: /(खालचे पोट|बेंबीच्या खाली)/i, value: 'Lower Abdomen' },
        { pattern: /(उजवा गुडघा|उजव्या गुडघ्यात)/i, value: 'Right Knee Joint' },
        { pattern: /(डावा गुडघा|डाव्या गुडघ्यात)/i, value: 'Left Knee Joint' },
        { pattern: /(दोन्ही गुडघे|दोन्ही गुडघ्यांत)/i, value: 'Both Knee Joints (Bilateral)' },
        { pattern: /(घसा|घशात)/i, value: 'Throat & Pharynx' },
        { pattern: /(कपाळ|डोके|टाळू)/i, value: 'Frontal Forehead & Temples' },
        { pattern: /(संपूर्ण शरीर|हातपाय|सगळ्या अंगात)/i, value: 'Generalized / Throughout Body' },
      ],
      triggers: [
        { pattern: /(तिखट|तेलकट|जड जेवण|मसालेदार|आंबट)/i, value: 'Worse after spicy, oily, or heavy meals' },
        { pattern: /(उपाशी पोटी|उपाशी राहिल्याने)/i, value: 'Worse on empty stomach / prolonged fasting' },
        { pattern: /(चालताना|पायऱ्या चढताना|उभे राहिल्यावर)/i, value: 'Aggravated by walking, stairs, or prolonged standing' },
        { pattern: /(थंडीत|थंड पाण्याने|गार वारे)/i, value: 'Worse in cold weather or with cold beverages' },
        { pattern: /(ताण|काळजी|झोप न झाल्याने)/i, value: 'Triggered by stress, screen strain, or sleep deprivation' },
      ],
      associations: [
        { pattern: /(उलटी|मळमळ)/i, value: 'Nausea & Vomiting' },
        { pattern: /(जळजळ|आंबट ढेकर)/i, value: 'Retrosternal Burning & Acid Belching' },
        { pattern: /(सूज|अकडणे)/i, value: 'Joint Swelling & Stiffness' },
        { pattern: /(चक्कर|भोवळ)/i, value: 'Dizziness & Lightheadedness' },
        { pattern: /(ताप|अंगदुखी)/i, value: 'Low-grade Fever & Weakness' },
      ],
      redFlags: ['छातीत दुखणे', 'छातीत वेदना', 'हृदय', 'श्वास गुदमरणे', 'दम लागणे', 'बेहोश'],
    },
  },

  // 3. TELUGU (తెలుగు)
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    scriptName: 'Telugu',
    speechRecognitionLang: 'te-IN',
    speechRecognitionFallbacks: ['te-IN', 'te', 'en-IN'],
    speechSynthesisLang: 'te-IN',
    samplePhrases: [
      {
        title: 'కడుపులో మంట & వికారం',
        text: 'నాకు 3 రోజుల నుండి కడుపులో విపరీతమైన మంట మరియు వికారం, వాంతులు అవుతున్నాయి, కారం తిన్న తర్వాత నొప్పి ఎక్కువవుతోంది.',
        complaint: 'Stomach Pain & Gas',
      },
      {
        title: 'మోకాళ్ళ నొప్పులు & వాపు',
        text: 'రెండు మోకాళ్ళలో 2 వారాల నుండి తీవ్రమైన నొప్పి మరియు వాపు ఉంది, మెట్లు ఎక్కేటప్పుడు మరియు నడిచేటప్పుడు చాలా బాధగా ఉంది.',
        complaint: 'Joint or Knee Pain',
      },
      {
        title: 'తీవ్ర జ్వరం & చలి',
        text: 'నిన్నటి నుండి తీవ్రమైన జ్వరం, వణుకుతో కూడిన చలి, ఒళ్ళు నొప్పులు మరియు తలనొప్పి ఉన్నాయి.',
        complaint: 'High Fever & Chills',
      },
    ],
    keywords: {
      chiefComplaints: {
        'Stomach Pain & Gas': [
          'కడుపు', 'కడుపులో', 'నొప్పి', 'మంట', 'గ్యాస్', 'వికారం', 'వాంతి', 'వాంతులు', 'తేన్పులు',
          'అజీర్ణం', 'కడుపుబ్బరం', 'ఆకలి లేదు', 'కడుపు నొప్పి', 'అసిడిటీ', 'గుండెల్లో మంట',
        ],
        'Joint or Knee Pain': [
          'మోకాలు', 'మోకాళ్ళు', 'మోకాళ్ళ', 'కీళ్ళు', 'కీళ్ళ నొప్పులు', 'ఎముకలు', 'నడుము', 'నడుము నొప్పి',
          'వాపు', 'బిగుతు', 'నడవలేకపోవడం', 'కీళ్లవాతం', 'వాతం',
        ],
        'High Fever & Chills': [
          'జ్వరం', 'తీవ్ర జ్వరం', 'చలి', 'వణుకు', 'ఒళ్ళు నొప్పులు', 'వేడి', 'చెమట', 'నీరసం',
        ],
        'Cough & Throat Pain': [
          'దగ్గు', 'గొంతు', 'గొంతు నొప్పి', 'కఫం', 'గొంతు గరగర', 'జలుబు', 'తుమ్ములు', 'గొంతు బొంగురు',
        ],
        'Headache & Dizziness': [
          'తలనొప్పి', 'తల నొప్పి', 'తల్లెలపి', 'తలతిరుగుడు', 'తల బరువు', 'కళ్ళు తిరగడం', 'మైగ్రేన్',
        ],
        'Skin Itching or Rash': [
          'దురద', 'దద్దుర్లు', 'ఎర్రటి మచ్చలు', 'అలెర్జీ', 'చర్మం', 'పొక్కులు',
        ],
        'Severe Chest Pain': [
          'ఛాతీలో నొప్పి', 'గుండె నొప్పి', 'ఛాతీ బరువు', 'ఛాతీలో పట్టేసినట్లు',
        ],
        'Difficulty Breathing': [
          'శ్వాస తీసుకోవడంలో ఇబ్బంది', 'ఆయాసం', 'ఊపిరి ఆడకపోవడం', 'దమ్ము',
        ],
      },
      durations: [
        { pattern: /(ఈ రోజు|కొన్ని గంటలు|ఇప్పుడే)/i, value: 'Today (Few hours ago)' },
        { pattern: /(\d+)\s*(రోజులు|రోజుల నుండి)/i, value: '2 to 3 days ago' },
        { pattern: /(నిన్నటి నుండి|మొన్నటి నుండి)/i, value: '2 to 3 days ago' },
        { pattern: /(\d+)\s*(వారాలు|వారాల నుండి)/i, value: '1 to 2 weeks ago' },
        { pattern: /(నెలలు|నెలల నుండి|సంవత్సరం)/i, value: 'More than a month' },
      ],
      locations: [
        { pattern: /(పై కడుపు|కడుపు పైభాగం|ఛాతీ కింద)/i, value: 'Upper Stomach (Epigastric)' },
        { pattern: /(క్రింది కడుపు|పొత్తికడుపు)/i, value: 'Lower Abdomen' },
        { pattern: /(కుడి మోకాలు|కుడి మోకాలి)/i, value: 'Right Knee Joint' },
        { pattern: /(ఎడమ మోకాలు|ఎడమ మోకాలి)/i, value: 'Left Knee Joint' },
        { pattern: /(రెండు మోకాళ్ళు|రెండు కాళ్ళు)/i, value: 'Both Knee Joints (Bilateral)' },
        { pattern: /(గొంతు|కంఠం)/i, value: 'Throat & Pharynx' },
        { pattern: /(నుదురు|తల|కణతలు)/i, value: 'Frontal Forehead & Temples' },
        { pattern: /(శరీరం మొత్తం|ఒళ్లంతా|చేతులు కాళ్ళు)/i, value: 'Generalized / Throughout Body' },
      ],
      triggers: [
        { pattern: /(కారం|మసాలా|నూనె పదార్థాలు|పులుపు)/i, value: 'Worse after spicy, oily, or heavy meals' },
        { pattern: /(ఖాళీ కడుపుతో|ఉపవాసం)/i, value: 'Worse on empty stomach / prolonged fasting' },
        { pattern: /(నడవడం|మెట్లు ఎక్కడం|ఎక్కువసేపు నిలబడటం)/i, value: 'Aggravated by walking, stairs, or prolonged standing' },
        { pattern: /(చలిలో|చల్లని నీరు|శీతాకాలం)/i, value: 'Worse in cold weather or with cold beverages' },
        { pattern: /(ఒత్తిడి|ఆందోళన|నిద్రలేమి)/i, value: 'Triggered by stress, screen strain, or sleep deprivation' },
      ],
      associations: [
        { pattern: /(వాంతులు|వికారం)/i, value: 'Nausea & Vomiting' },
        { pattern: /(మంట|పుల్లని తేన్పులు)/i, value: 'Retrosternal Burning & Acid Belching' },
        { pattern: /(వాపు|బిగుతు)/i, value: 'Joint Swelling & Stiffness' },
        { pattern: /(తలతిరుగుడు|నీరసం)/i, value: 'Dizziness & Lightheadedness' },
        { pattern: /(జ్వరం|ఒళ్ళు నొప్పులు)/i, value: 'Low-grade Fever & Weakness' },
      ],
      redFlags: ['ఛాతీలో నొప్పి', 'గుండె నొప్పి', 'ఆయాసం', 'ఊపిరి ఆడకపోవడం', 'స్పృహ కోల్పోవడం'],
    },
  },

  // Fallbacks for other regional languages
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    scriptName: 'Bengali',
    speechRecognitionLang: 'bn-IN',
    speechRecognitionFallbacks: ['bn-IN', 'bn', 'en-IN'],
    speechSynthesisLang: 'bn-IN',
    samplePhrases: [
      {
        title: 'পেট জ্বালা ও বমি ভাব',
        text: 'আমার ৩ দিন ধরে পেটের উপরের অংশে তীব্র জ্বালা ও ব্যথা, ঝাল খাবারের পর বাড়ে ও বমি ভাব হয়।',
        complaint: 'Stomach Pain & Gas',
      },
    ],
    keywords: {
      chiefComplaints: {
        'Stomach Pain & Gas': ['পেট', 'ব্যথা', 'জ্বালা', 'বমি', 'গ্যাস', 'অম্বল'],
        'Joint or Knee Pain': ['হাঁটু', 'গাঁট', 'হাড়', 'কোমর', 'ব্যথা', 'ফোলা'],
        'High Fever & Chills': ['জ্বর', 'কাঁপুনি', 'গরম', 'দুর্বলতা'],
        'Cough & Throat Pain': ['কাশি', 'গলা', 'সর্দি'],
        'Headache & Dizziness': ['মাথা ব্যথা', 'ঘোরা'],
        'Skin Itching or Rash': ['চুলকানি', 'ফুসকুড়ি'],
        'Severe Chest Pain': ['বুকে ব্যথা', 'হৃদরোগ'],
        'Difficulty Breathing': ['শ্বাসকষ্ট', 'দম বন্ধ'],
      },
      durations: [],
      locations: [],
      triggers: [],
      associations: [],
      redFlags: ['বুকে ব্যথা', 'শ্বাসকষ্ট'],
    },
  },
  gu: {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    scriptName: 'Gujarati',
    speechRecognitionLang: 'gu-IN',
    speechRecognitionFallbacks: ['gu-IN', 'gu', 'hi-IN', 'en-IN'],
    speechSynthesisLang: 'gu-IN',
    samplePhrases: [],
    keywords: {
      chiefComplaints: {},
      durations: [],
      locations: [],
      triggers: [],
      associations: [],
      redFlags: [],
    },
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    scriptName: 'Tamil',
    speechRecognitionLang: 'ta-IN',
    speechRecognitionFallbacks: ['ta-IN', 'ta', 'en-IN'],
    speechSynthesisLang: 'ta-IN',
    samplePhrases: [],
    keywords: {
      chiefComplaints: {},
      durations: [],
      locations: [],
      triggers: [],
      associations: [],
      redFlags: [],
    },
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    scriptName: 'Kannada',
    speechRecognitionLang: 'kn-IN',
    speechRecognitionFallbacks: ['kn-IN', 'kn', 'en-IN'],
    speechSynthesisLang: 'kn-IN',
    samplePhrases: [],
    keywords: {
      chiefComplaints: {},
      durations: [],
      locations: [],
      triggers: [],
      associations: [],
      redFlags: [],
    },
  },
  ml: {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    scriptName: 'Malayalam',
    speechRecognitionLang: 'ml-IN',
    speechRecognitionFallbacks: ['ml-IN', 'ml', 'en-IN'],
    speechSynthesisLang: 'ml-IN',
    samplePhrases: [],
    keywords: {
      chiefComplaints: {},
      durations: [],
      locations: [],
      triggers: [],
      associations: [],
      redFlags: [],
    },
  },
  pa: {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    scriptName: 'Gurmukhi',
    speechRecognitionLang: 'pa-IN',
    speechRecognitionFallbacks: ['pa-IN', 'pa', 'hi-IN', 'en-IN'],
    speechSynthesisLang: 'pa-IN',
    samplePhrases: [],
    keywords: {
      chiefComplaints: {},
      durations: [],
      locations: [],
      triggers: [],
      associations: [],
      redFlags: [],
    },
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    scriptName: 'Latin',
    speechRecognitionLang: 'en-IN',
    speechRecognitionFallbacks: ['en-IN', 'en-US', 'en-GB'],
    speechSynthesisLang: 'en-IN',
    samplePhrases: [],
    keywords: {
      chiefComplaints: {},
      durations: [],
      locations: [],
      triggers: [],
      associations: [],
      redFlags: ['chest pain', 'heart', 'difficulty breathing', 'shortness of breath'],
    },
  },
};

/**
 * Get optimal SpeechRecognition language code with regional fallback
 */
export function getVoiceRecognitionLang(lang: LanguageCode): string {
  const config = REGIONAL_VOICE_CONFIGS[lang];
  return config?.speechRecognitionLang || 'hi-IN';
}

/**
 * Get list of fallback speech recognition tags if browser speech service has limited locale support
 */
export function getVoiceRecognitionFallbacks(lang: LanguageCode): string[] {
  const config = REGIONAL_VOICE_CONFIGS[lang];
  return config?.speechRecognitionFallbacks || ['hi-IN', 'en-IN'];
}
