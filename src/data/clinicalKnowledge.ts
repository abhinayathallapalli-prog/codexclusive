import { DashavidhaPariksha, SocratesHPI, MedicalDocument, PatientProfile } from '../types';

export interface ChiefComplaintTemplate {
  id: string;
  nameEn: string;
  nameHi: string;
  icon: string;
  category: 'cardio' | 'gastro' | 'neuro' | 'ayush_joint' | 'respiratory' | 'metabolic' | 'general';
  isRedFlagPotential: boolean;
  initialInquiryEn?: string;
  initialInquiryHi?: string;
  topicSummary?: string;
  defaultQuestions: {
    key: keyof SocratesHPI | 'specialAyush';
    questionEn: string;
    questionHi: string;
    options: {
      labelEn: string;
      labelHi: string;
      value: string;
      isRedFlagTrigger?: boolean;
    }[];
  }[];
}

export const CHIEF_COMPLAINTS: ChiefComplaintTemplate[] = [
  {
    id: 'chest_pain',
    nameEn: 'Chest Pain / Discomfort',
    nameHi: 'सीने में दर्द या भारीपन (Chest Pain)',
    icon: 'HeartPulse',
    category: 'cardio',
    isRedFlagPotential: true,
    topicSummary: 'Cardiovascular assessment for acute coronary symptoms, radiation, and diaphoresis',
    initialInquiryEn: 'I understand you are having chest discomfort. To assess this properly: When exactly did the chest pain start, and is it a crushing pressure, sharp stabbing, or burning sensation?',
    initialInquiryHi: 'मैं समझ रहा हूँ कि आपको सीने में तकलीफ है। इसे ठीक से समझने के लिए: यह दर्द कब शुरू हुआ, और क्या यह भारी दबाव, तेज चुभन या जलन जैसा महसूस हो रहा है?',
    defaultQuestions: [
      {
        key: 'onset',
        questionEn: 'When did the chest pain start and how quickly?',
        questionHi: 'सीने का दर्द कब और कैसे शुरू हुआ?',
        options: [
          { labelEn: 'Sudden onset (within minutes)', labelHi: 'अचानक (कुछ ही मिनटों में)', value: 'Sudden onset <2 hours', isRedFlagTrigger: true },
          { labelEn: 'Gradual over several hours', labelHi: 'धीरे-धीरे कुछ घंटों में', value: 'Gradual over 6-12 hours' },
          { labelEn: 'Recurrent episodes over days/weeks', labelHi: 'कई दिनों से बार-बार होता है', value: 'Intermittent episodes for weeks' },
        ],
      },
      {
        key: 'character',
        questionEn: 'How would you describe the sensation?',
        questionHi: 'दर्द किस तरह का महसूस हो रहा है?',
        options: [
          { labelEn: 'Crushing, heavy pressure (like a weight)', labelHi: 'दबाव या भारीपन (जैसे छाती पर पत्थर रखा हो)', value: 'Crushing pressure retrosternal', isRedFlagTrigger: true },
          { labelEn: 'Sharp, stabbing on deep breath', labelHi: 'तेज चुभन वाला दर्द', value: 'Sharp pleuritic' },
          { labelEn: 'Burning sensation behind breastbone', labelHi: 'सीने में जलन (एसिडिटी जैसी)', value: 'Retrosternal burning' },
          { labelEn: 'Dull ache / muscle soreness', labelHi: 'हल्का मीठा दर्द / मांसपेशियों में खिंचाव', value: 'Dull musculoskeletal' },
        ],
      },
      {
        key: 'radiation',
        questionEn: 'Does the pain spread anywhere else?',
        questionHi: 'क्या दर्द शरीर के किसी अन्य हिस्से में फैल रहा है?',
        options: [
          { labelEn: 'Spreading to left arm, neck, or jaw', labelHi: 'बाएं हाथ, गर्दन या जबड़े की तरफ', value: 'Radiating to left arm and jaw', isRedFlagTrigger: true },
          { labelEn: 'Spreading to back between shoulder blades', labelHi: 'पीठ में दोनों कंधों के बीच', value: 'Radiating to interscapular region' },
          { labelEn: 'Spreading to upper abdomen', labelHi: 'पेट के ऊपरी भाग में', value: 'Radiating to epigastrium' },
          { labelEn: 'No radiation (stays in one spot)', labelHi: 'कहीं नहीं फैलता (एक ही जगह है)', value: 'Localized, non-radiating' },
        ],
      },
      {
        key: 'associations',
        questionEn: 'Are you experiencing any other symptoms with this?',
        questionHi: 'क्या दर्द के साथ इनमें से कोई अन्य लक्षण भी हैं?',
        options: [
          { labelEn: 'Cold sweating & breathlessness (Ghabrahat)', labelHi: 'ठंडा पसीना और सांस फूलना (घबराहट)', value: 'Cold diaphoresis and dyspnea', isRedFlagTrigger: true },
          { labelEn: 'Dizziness, fainting or vomiting', labelHi: 'चक्कर आना, उल्टी या बेहोशी', value: 'Syncope and nausea', isRedFlagTrigger: true },
          { labelEn: 'Sour burping / acid water in throat', labelHi: 'खट्टी डकारें / गले में खट्टा पानी', value: 'Acid regurgitation' },
          { labelEn: 'None of these', labelHi: 'इनमें से कोई नहीं', value: 'None' },
        ],
      },
    ],
  },
  {
    id: 'sandhivata_joints',
    nameEn: 'Joint Pain & Swelling (Sandhivata / Arthritis)',
    nameHi: 'जोड़ों में दर्द व सूजन (संधिवात / गठिया)',
    icon: 'Bone',
    category: 'ayush_joint',
    isRedFlagPotential: false,
    topicSummary: 'Musculoskeletal and Ayush Sandhivata assessment for joint crepitus, stiffness, and Ama lakshanas',
    initialInquiryEn: 'I see you are consulting for Joint Pain & Swelling (Sandhivata). Let us examine this topic specifically: Which exact joints are bothering you most (knees, hips, or fingers), and how long have you had this pain?',
    initialInquiryHi: 'मैं देख रहा हूँ कि आप जोड़ों में दर्द व सूजन (संधिवात) के लिए परामर्श ले रहे हैं। सबसे पहले बताएं कि मुख्य रूप से कौन से जोड़ों में तकलीफ है और यह समस्या कितने समय से है?',
    defaultQuestions: [
      {
        key: 'site',
        questionEn: 'Which joints are primarily affected?',
        questionHi: 'मुख्य रूप से कौन से जोड़ों में तकलीफ है?',
        options: [
          { labelEn: 'Both Knees (Janu Sandhi)', labelHi: 'दोनों घुटनों में (जानु संधि)', value: 'Bilateral Knees (Janu Sandhi)' },
          { labelEn: 'Small joints of hands and feet', labelHi: 'हाथों और पैरों के छोटे जोड़ों में', value: 'Small peripheral joints' },
          { labelEn: 'Lower back & Hip joint (Kati Shoola)', labelHi: 'कमर और कूल्हे में (कटि शूल)', value: 'Lumbosacral & hip joints' },
          { labelEn: 'Multiple wandering joints', labelHi: 'कभी एक जोड़ कभी दूसरा (चल संधिवात)', value: 'Polyarticular migratory' },
        ],
      },
      {
        key: 'timing',
        questionEn: 'When is the joint stiffness worst?',
        questionHi: 'जोड़ों में जकड़न (Stiffness) किस समय सबसे ज्यादा होती है?',
        options: [
          { labelEn: 'Morning stiffness lasting > 45 mins', labelHi: 'सुबह सोकर उठने पर (45 मिनट से अधिक)', value: 'Morning stiffness >45 mins (Ama lakshana)' },
          { labelEn: 'Evening or after walking/standing', labelHi: 'शाम को या चलने-फिरने के बाद', value: 'End of day / post-exertional' },
          { labelEn: 'Constant stiffness in cold weather', labelHi: 'सर्द मौसम या ठंडी हवा में लगातार', value: 'Aggravated in cold/rainy weather (Shita asahatva)' },
        ],
      },
      {
        key: 'relievingFactors',
        questionEn: 'What gives you relief in joint pain?',
        questionHi: 'किस चीज़ से दर्द में आराम मिलता है?',
        options: [
          { labelEn: 'Warm fomentation & oil massage (Snehana/Swedana)', labelHi: 'गर्म सिकाई और तेल मालिश से (स्वेदन)', value: 'Relieved by warm fomentation' },
          { labelEn: 'Complete rest without moving', labelHi: 'बिल्कुल आराम करने से', value: 'Relieved by complete rest' },
          { labelEn: 'Painkillers / Ayurvedic decoctions (Kwatha)', labelHi: 'दर्द निवारक दवा या काढ़े से', value: 'Relieved by analgesics/Guggulu' },
        ],
      },
    ],
  },
  {
    id: 'amlapitta_digestion',
    nameEn: 'Acidity, Gas & Bloating (Amlapitta / Agnimandya)',
    nameHi: 'एसिडिटी, पेट में जलन व अपच (अम्लपित्त / अग्निमांद्य)',
    icon: 'Flame',
    category: 'ayush_joint',
    isRedFlagPotential: false,
    topicSummary: 'Gastrointestinal & Ayush Agni inquiry for acid reflux, sour eructations, and epigastric burning',
    initialInquiryEn: 'You are consulting for Digestive & Acidity concerns (Amlapitta). What is your main sensation — is it burning behind the breastbone, sour water rising into your throat, or heaviness and bloating after meals?',
    initialInquiryHi: 'आप एसिडिटी, पेट में जलन व अपच (अम्लपित्त) के लिए परामर्श ले रहे हैं। मुख्य लक्षण क्या महसूस होता है — छाती में जलन, खट्टी डकारें, या भोजन के बाद पेट में भारीपन?',
    defaultQuestions: [
      {
        key: 'character',
        questionEn: 'What is the primary digestive complaint?',
        questionHi: 'पेट की मुख्य परेशानी क्या है?',
        options: [
          { labelEn: 'Burning in chest and throat (Hrit-Kantha Daha)', labelHi: 'छाती और गले में तेज जलन (हृत्-कण्ठ दाह)', value: 'Retrosternal and throat pyrosis' },
          { labelEn: 'Sour or bitter water coming up (Amla-Tikta Udgara)', labelHi: 'खट्टी या कड़वी डकारें आना (अम्ल-तिक्त उद्गार)', value: 'Sour regurgitation' },
          { labelEn: 'Heaviness in stomach even after light food (Gaurava)', labelHi: 'थोड़ा खाने पर भी पेट भारी होना (अग्निमांद्य)', value: 'Post-prandial fullness and bloating' },
          { labelEn: 'Irregular/hard bowel movement (Vibandha)', labelHi: 'कब्जियत और मल त्याग में कठिनाई (विबन्ध)', value: 'Chronic constipation (Krura Koshtha)' },
        ],
      },
      {
        key: 'exacerbatingFactors',
        questionEn: 'Does eating spicy, oily or tea/coffee trigger it?',
        questionHi: 'क्या तीखा, तला-भुना या चाय पीने से यह बढ़ता है?',
        options: [
          { labelEn: 'Yes, heavily increases with spicy/fried food & tea', labelHi: 'हाँ, मिर्च-मसाले, चाय या बासी भोजन से बढ़ता है', value: 'Aggravated by spicy, fried, tea (Katu-Amla-Lavana)' },
          { labelEn: 'Worse when meals are delayed (empty stomach)', labelHi: 'खाली पेट रहने या भोजन में देरी होने पर', value: 'Aggravated by fasting / irregular meal timings' },
          { labelEn: 'Worse after late night dinner and sleep', labelHi: 'देर रात भोजन करके तुरंत सोने से', value: 'Aggravated by late meals and day sleep (Divasvapna)' },
        ],
      },
    ],
  },
  {
    id: 'breathlessness',
    nameEn: 'Breathlessness & Cough (Shwasa / Kasa)',
    nameHi: 'सांस फूलना या पुरानी खांसी (श्वास / कास)',
    icon: 'Wind',
    category: 'respiratory',
    isRedFlagPotential: true,
    topicSummary: 'Respiratory assessment for dyspnea on exertion, orthopnea, productive cough, and wheezing',
    initialInquiryEn: 'You are consulting for Breathlessness & Cough. Let us check this closely: Is your breathlessness sudden and severe, or has it been gradually worsening, and do you also have a cough?',
    initialInquiryHi: 'आप सांस फूलने या खांसी की परेशानी के लिए परामर्श ले रहे हैं। क्या सांस अचानक फूलने लगी है या कुछ दिनों से धीरे-धीरे बढ़ रही है, और क्या साथ में खांसी या बलगम भी है?',
    defaultQuestions: [
      {
        key: 'onset',
        questionEn: 'How long have you had shortness of breath?',
        questionHi: 'सांस फूलने की समस्या कब से है?',
        options: [
          { labelEn: 'Severe and sudden onset today', labelHi: 'आज अचानक बहुत तेज शुरू हुई', value: 'Acute sudden dyspnea', isRedFlagTrigger: true },
          { labelEn: 'Gradual increase over weeks/months', labelHi: 'कुछ हफ्तों या महीनों से धीरे-धीरे बढ़ रही है', value: 'Chronic progressive dyspnea' },
          { labelEn: 'Triggered by dust, cold breeze or pollen', labelHi: 'धूल, धुएं या ठंडी हवा से दौरा पड़ता है (तमक श्वास)', value: 'Episodic allergen/cold induced (Tamaka Shwasa)' },
        ],
      },
      {
        key: 'associations',
        questionEn: 'Are you unable to lie flat or have swollen feet?',
        questionHi: 'क्या सीधे लेटने पर सांस रुकती है या पैरों में सूजन है?',
        options: [
          { labelEn: 'Cannot lie flat without 2-3 pillows (Orthopnea)', labelHi: 'सीधे लेट नहीं पाते, उठकर बैठना पड़ता है', value: 'Orthopnea & paroxysmal nocturnal dyspnea', isRedFlagTrigger: true },
          { labelEn: 'Productive cough with yellowish/greenish phlegm', labelHi: 'बलगम वाली खांसी (कफ निकलना)', value: 'Productive purulent cough' },
          { labelEn: 'Wheezing sound from chest while breathing', labelHi: 'सांस लेते समय सीटी जैसी आवाज (Wheeze)', value: 'Audible wheeze' },
          { labelEn: 'None of the above', labelHi: 'इनमें से कोई नहीं', value: 'Isolated exertion dyspnea' },
        ],
      },
    ],
  },
  {
    id: 'back_pain_sciatica',
    nameEn: 'Lower Back Pain & Sciatica (Kati Shoola / Gridhrasi)',
    nameHi: 'कमर दर्द व साइटिका (कटि शूल / गृध्रसी)',
    icon: 'Activity',
    category: 'ayush_joint',
    isRedFlagPotential: false,
    topicSummary: 'Lumbosacral spine assessment for radicular nerve pain, lifting strain, and mobility restriction',
    initialInquiryEn: 'You are consulting for Lower Back Pain & Sciatica. Does the pain stay centered in your lower back, or does it shoot down the buttocks into your leg and foot?',
    initialInquiryHi: 'आप कमर दर्द या साइटिका (कटि शूल) के लिए परामर्श ले रहे हैं। क्या यह दर्द केवल कमर में है, या कूल्हे से होकर पैर के तलवे तक नीचे जाता है?',
    defaultQuestions: [
      {
        key: 'radiation',
        questionEn: 'Does the pain travel down your legs?',
        questionHi: 'क्या दर्द पैर में नीचे की तरफ जाता है?',
        options: [
          { labelEn: 'Shoots down one leg into calf/foot (Sciatica / Gridhrasi)', labelHi: 'एक पैर में नीचे पिंडली या पंजे तक खिंचता है', value: 'Radicular pain down posterior leg (Gridhrasi)' },
          { labelEn: 'Localized in lumbar lower back only', labelHi: 'केवल कमर के निचले हिस्से में सीमित है', value: 'Localized lumbar tenderness' },
          { labelEn: 'Spreads across both hips and buttocks', labelHi: 'दोनों कूल्हों और नितंबों में फैलता है', value: 'Bilateral buttock and sacral pain' },
        ],
      },
      {
        key: 'exacerbatingFactors',
        questionEn: 'What movements make the back pain worse?',
        questionHi: 'किस गतिविधि से कमर का दर्द बढ़ जाता है?',
        options: [
          { labelEn: 'Bending forward, sitting long or lifting weight', labelHi: 'आगे झुकने, देर तक बैठने या वजन उठाने से', value: 'Worse with flexion and sitting' },
          { labelEn: 'Standing or walking long distances', labelHi: 'खड़े रहने या ज्यादा चलने से', value: 'Worse with standing / spinal stenosis' },
          { labelEn: 'Coughing or sneezing triggers sharp shock', labelHi: 'खांसने या छींकने पर तेज झटका लगता है', value: 'Aggravated by Valsalva / disc herniation' },
        ],
      },
    ],
  },
  {
    id: 'headache_migraine',
    nameEn: 'Headache / Migraine (Shirahshula / Ardhavabhedaka)',
    nameHi: 'सिरदर्द व माइग्रेन (शिरःशूल / आधासीसी)',
    icon: 'Activity',
    category: 'neuro',
    isRedFlagPotential: true,
    topicSummary: 'Cranial neurology assessment for unilateral throbbing, aura, nausea, and photophobia',
    initialInquiryEn: 'You are consulting for Headache / Migraine. Is the headache on one side of your head with throbbing, or is it a band-like tight pressure all over?',
    initialInquiryHi: 'आप सिरदर्द या माइग्रेन (शिरःशूल) के लिए परामर्श ले रहे हैं। क्या यह सिर के एक तरफ धड़कन जैसा दर्द है, या पूरे माथे पर कसाव जैसा?',
    defaultQuestions: [
      {
        key: 'site',
        questionEn: 'Where is the headache focused?',
        questionHi: 'सिरदर्द मुख्य रूप से कहाँ महसूस होता है?',
        options: [
          { labelEn: 'One side only (Temples & Eye / Ardhavabhedaka)', labelHi: 'केवल एक तरफ (कनपटी और आंख के पास)', value: 'Unilateral hemicranial throbbing' },
          { labelEn: 'Band-like pressure across forehead and back of head', labelHi: 'पूरे माथे और गर्दन के पीछे तनाव जैसा', value: 'Bilateral band-like tension' },
          { labelEn: 'Sudden explosive "thunderclap" headache', labelHi: 'अचानक बहुत तेज विस्फोट जैसा दर्द', value: 'Thunderclap acute headache', isRedFlagTrigger: true },
        ],
      },
      {
        key: 'associations',
        questionEn: 'Are you feeling nauseous or sensitive to light and sound?',
        questionHi: 'क्या जी मिचलाना, उल्टी या रोशनी/आवाज से परेशानी होती है?',
        options: [
          { labelEn: 'Nausea, vomiting and irritation from bright light (Photophobia)', labelHi: 'जी मिचलाना, उल्टी और तेज रोशनी से चिड़चिड़ाहट', value: 'Nausea, vomiting, photophobia & phonophobia' },
          { labelEn: 'Visual zigzag lines or blurry vision before pain (Aura)', labelHi: 'दर्द से पहले आंखों के आगे चमक या धुंधलापन', value: 'Visual migraine aura' },
          { labelEn: 'No nausea or visual changes', labelHi: 'कोई उल्टी या दृष्टि में बदलाव नहीं', value: 'Isolated cephalalgia' },
        ],
      },
    ],
  },
  {
    id: 'fever_infection',
    nameEn: 'Fever, Chills & Bodyache (Jwara)',
    nameHi: 'बुखार, कंपकंपी व बदन दर्द (ज्वर)',
    icon: 'Flame',
    category: 'general',
    isRedFlagPotential: true,
    topicSummary: 'Infectious disease screen for pyrexia pattern, rigors, body ache, and hydration status',
    initialInquiryEn: 'You are consulting for Fever & Bodyache. How many days have you had the fever, and does it come with chills and shivering, or body rashes?',
    initialInquiryHi: 'आप बुखार, कंपकंपी व बदन दर्द (ज्वर) के लिए परामर्श ले रहे हैं। बुखार कितने दिनों से आ रहा है, और क्या साथ में ठंड लगकर कंपकंपी या चकत्ते भी हैं?',
    defaultQuestions: [
      {
        key: 'onset',
        questionEn: 'How long has the fever been present?',
        questionHi: 'बुखार कितने दिनों से है?',
        options: [
          { labelEn: 'High fever started suddenly 1-2 days ago', labelHi: '1-2 दिन पहले अचानक तेज बुखार शुरू हुआ', value: 'Acute high fever (1-2 days)' },
          { labelEn: 'Low grade lingering fever for > 2 weeks', labelHi: '2 हफ्ते से अधिक समय से हल्का बुखार', value: 'Prolonged subacute pyrexia (>2 weeks)' },
          { labelEn: 'Comes and goes at specific times with severe chills', labelHi: 'ठंड लगकर निश्चित समय पर आता है (मलेरिया जैसा)', value: 'Intermittent fever with rigors' },
        ],
      },
      {
        key: 'associations',
        questionEn: 'Do you have severe bodyache or burning urination?',
        questionHi: 'क्या बहुत तेज बदन दर्द, खांसी या पेशाब में जलन है?',
        options: [
          { labelEn: 'Severe bone-breaking body ache & eye pain (Dengue-like)', labelHi: 'हड्डियों में तेज दर्द और आंखों के पीछे दर्द', value: 'Severe myalgia and retro-orbital pain' },
          { labelEn: 'Burning sensation or pain while urinating (Mutrakrichhra)', labelHi: 'पेशाब करते समय तेज जलन या दर्द (मूत्रकृच्छ्र)', value: 'Dysuria and urinary frequency' },
          { labelEn: 'Cough, throat irritation and runny nose', labelHi: 'खांसी, गले में खराश और जुकाम', value: 'Upper respiratory infection symptoms' },
        ],
      },
    ],
  },
  {
    id: 'diabetes_hypertension',
    nameEn: 'Diabetes / Blood Pressure Routine Follow-up (Prameha)',
    nameHi: 'मधुमेह एवं उच्च रक्तचाप फॉलो-अप (प्रमेह / उच्च रक्तचाप)',
    icon: 'Activity',
    category: 'metabolic',
    isRedFlagPotential: false,
    topicSummary: 'Chronic metabolic surveillance for glycemic stability, blood pressure readings, and microvascular signs',
    initialInquiryEn: 'You are consulting for Diabetes & Blood Pressure follow-up. How have your recent blood sugar and BP readings been, and are you taking your prescribed medicines regularly?',
    initialInquiryHi: 'आप मधुमेह (शुगर) और बीपी फॉलो-अप के लिए परामर्श ले रहे हैं। हाल ही में आपकी शुगर और बीपी की जांच कैसी रही है, और क्या आप नियमित दवाइयां ले रहे हैं?',
    defaultQuestions: [
      {
        key: 'character',
        questionEn: 'How well are your blood sugar / BP levels controlled?',
        questionHi: 'आपकी शुगर और बीपी का स्तर कैसा रहता है?',
        options: [
          { labelEn: 'High sugar readings (>200 mg/dL) or uncontrolled', labelHi: 'अक्सर 200 से अधिक या अनियंत्रित रहता है', value: 'Uncontrolled glycemic levels' },
          { labelEn: 'Tingling / numbness in feet (Neuropathy)', labelHi: 'पैरों के तलवों में सुन्नपन या झनझनाहट (सुप्ति/हस्तपाद दाह)', value: 'Diabetic peripheral neuropathy symptoms' },
          { labelEn: 'Excessive thirst and frequent nighttime urination', labelHi: 'बहुत ज्यादा प्यास और रात में बार-बार पेशाब आना (प्रभूत मूत्रता)', value: 'Polydipsia and polyuria' },
          { labelEn: 'Stable on current medicines, here for renewal', labelHi: 'दवाइयों से सामान्य है, केवल दवा लिखवाने आए हैं', value: 'Stable control, routine prescription renewal' },
        ],
      },
    ],
  },
];

export const INITIAL_SAMPLE_DOCUMENTS: MedicalDocument[] = [
  {
    id: 'doc-001',
    name: 'OPD Prescription - Safdarjung Hospital',
    documentType: 'Prescription',
    date: '2025-11-14',
    hospitalName: 'Safdarjung Hospital, New Delhi (Dept. of Medicine)',
    fileSize: '1.4 MB',
    ocrStatus: 'completed',
    extractedText: 'Rx: Tab Metformin 500mg BD PO, Tab Telmisartan 40mg OD PO, Tab Atorvastatin 20mg HS PO. Advised: Strict diabetic diet, HbA1c, Lipid Profile review in 3 months.',
    extractedDiagnoses: ['Type 2 Diabetes Mellitus', 'Essential Hypertension', 'Dyslipidemia'],
    extractedMedications: [
      { name: 'Metformin Hydrochloride', dosage: '500 mg', frequency: 'Twice daily after meals', duration: 'Ongoing (3 months)', prescribedBy: 'Dr. S. K. Sharma (MD)' },
      { name: 'Telmisartan', dosage: '40 mg', frequency: 'Once daily morning', duration: 'Ongoing', prescribedBy: 'Dr. S. K. Sharma (MD)' },
      { name: 'Atorvastatin', dosage: '20 mg', frequency: 'Once daily at bedtime', duration: 'Ongoing', prescribedBy: 'Dr. S. K. Sharma (MD)' },
    ],
    extractedLabResults: [],
    notes: 'Handwritten Hindi & English prescription successfully extracted via Indian-Medical OCR Pipeline. Medication adherence noted as irregular.',
    abnormalWarnings: ['Drug interaction check: No contraindication between Telmisartan and Metformin.'],
  },
  {
    id: 'doc-002',
    name: 'Biochemistry & HbA1c Lab Report - Dr Lal PathLabs',
    documentType: 'Lab Report',
    date: '2025-12-02',
    hospitalName: 'NABL Accredited Diagnostics Lab',
    fileSize: '890 KB',
    ocrStatus: 'completed',
    extractedText: 'HbA1c: 9.2 % (Ref: 4.0 - 5.6 %). Fasting Plasma Glucose: 188 mg/dL (Ref: 70 - 100 mg/dL). Post-Prandial Glucose: 274 mg/dL. Serum Creatinine: 1.28 mg/dL (Ref: 0.7 - 1.2). eGFR: 58 mL/min/1.73m2.',
    extractedDiagnoses: ['Uncontrolled Hyperglycemia', 'Stage 3a Mildly Decreased Renal Function'],
    extractedMedications: [],
    extractedLabResults: [
      { testName: 'Glycated Hemoglobin (HbA1c)', resultValue: '9.2', unit: '%', referenceRange: '4.0 - 5.6 %', isAbnormal: true, flagType: 'CRITICAL' },
      { testName: 'Fasting Blood Sugar', resultValue: '188', unit: 'mg/dL', referenceRange: '70 - 100 mg/dL', isAbnormal: true, flagType: 'HIGH' },
      { testName: 'Post-Prandial Blood Sugar', resultValue: '274', unit: 'mg/dL', referenceRange: '< 140 mg/dL', isAbnormal: true, flagType: 'HIGH' },
      { testName: 'Serum Creatinine', resultValue: '1.28', unit: 'mg/dL', referenceRange: '0.7 - 1.20 mg/dL', isAbnormal: true, flagType: 'HIGH' },
      { testName: 'Estimated GFR', resultValue: '58', unit: 'mL/min/1.73m²', referenceRange: '> 90 mL/min', isAbnormal: true, flagType: 'LOW' },
    ],
    notes: 'Extracted digital lab result from tabular PDF/image. Critical glycemic elevation flagged for physician dose titration.',
    abnormalWarnings: [
      'CRITICAL: HbA1c is 9.2% (Target < 7.0%). High risk of microvascular complications.',
      'ELEVATED: Serum Creatinine 1.28 mg/dL with eGFR 58 indicates mild renal impairment. Review Metformin dose safety.',
    ],
  },
  {
    id: 'doc-003',
    name: 'AIIA Kayachikitsa Prior Prescription - All India Institute of Ayurveda',
    documentType: 'Prescription',
    date: '2026-01-18',
    hospitalName: 'All India Institute of Ayurveda (AIIA), Sarita Vihar, New Delhi',
    fileSize: '2.1 MB',
    ocrStatus: 'completed',
    extractedText: 'Kayachikitsa OPD: Yogaraj Guggulu 2 tab BD with warm water. Dashamoola Kwatha 20ml with equal warm water BD. Mahanarayana Taila for local abhyanga followed by Patra Pinda Sweda.',
    extractedDiagnoses: ['Sandhivata (Osteoarthritis Janu)', 'Kapha-Vata Prakopa with Sama Lakshana'],
    extractedMedications: [
      { name: 'Yogaraj Guggulu', dosage: '2 tablets (500mg ea)', frequency: 'Twice daily after meals', duration: '30 days', prescribedBy: 'Dr. R. K. Sharma (BAMS, MD Ayur)' },
      { name: 'Dashamoola Kwatha', dosage: '20 ml', frequency: 'Twice daily with warm water', duration: '30 days', prescribedBy: 'Dr. R. K. Sharma (BAMS, MD Ayur)' },
      { name: 'Mahanarayana Taila', dosage: 'External use', frequency: 'Gentle abhyanga over knees twice daily', duration: '30 days' },
    ],
    extractedLabResults: [],
    notes: 'Ayurvedic formulation OCR recognized classical pharmacopoeia names. Patient reported 40% reduction in knee pain score after course.',
    abnormalWarnings: ['Ensure gap of 1 hour between allopathic anti-hypertensives and Ayurvedic Kwatha.'],
  },
];

export const DEMO_PATIENTS: PatientProfile[] = [
  {
    id: 'pat-001',
    abhaId: '91-4523-8891-2304',
    name: 'Rajendra Prasad Sharma',
    age: 58,
    gender: 'male',
    phone: '+91 98102 45892',
    address: 'H-42, Sector 12, Dwarka',
    district: 'South West Delhi',
    state: 'Delhi',
    tokenNumber: 'AIIA-OPD-104',
    department: 'Kayachikitsa (Internal Medicine)',
    opdTrack: 'ayush',
    isAyushSpecific: true,
    registeredAt: '2026-09-10 09:15 AM',
    consentGranted: true,
    consentTimestamp: '2026-09-10 09:18:22 IST',
  },
  {
    id: 'pat-002',
    abhaId: '91-7812-4439-9021',
    name: 'Sunita Devi',
    age: 49,
    gender: 'female',
    phone: '+91 94120 78231',
    address: 'Vill. Behrampur, P.O. Mandi',
    district: 'Gurugram',
    state: 'Haryana',
    tokenNumber: 'AIIA-OPD-105',
    department: 'Shalya / Shalakya / General OPD',
    opdTrack: 'allopathic',
    isAyushSpecific: false,
    registeredAt: '2026-09-10 09:30 AM',
    consentGranted: true,
    consentTimestamp: '2026-09-10 09:31:05 IST',
  },
];

export const DEFAULT_AYUSH_PARIKSHA: DashavidhaPariksha = {
  prakriti: 'Vata-Kapha',
  vikriti: 'Vata-Pitta Prakopa (Agnimandya & Sandhishoola)',
  sara: 'Madhyama',
  samhanana: 'Madhyama',
  pramana: 'Sama',
  satmya: 'Madhyama',
  sattva: 'Madhyama',
  aharaShakti: {
    abhyavaharana: 'Madhyama',
    jarana: 'Hina',
  },
  vyayamaShakti: 'Hina',
  vaya: 'Madhya',
  agni: 'Vishama',
  koshtha: 'Krura',
  aharaVihara: {
    dietType: 'Shakahari (Veg)',
    sleepPattern: 'Anidra (Insomnia)',
    dailyRoutine: 'Irregular lunch times, high intake of dry snacks & cold water.',
  },
};
