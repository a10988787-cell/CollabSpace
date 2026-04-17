// backend/services/groqService.js
// Gemini-powered AI service for title suggestions, hashtag generation, and content analysis

const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

function getGemini() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[Gemini] GEMINI_API_KEY not set — using fallback mode.');
      return null;
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/* ── Call Gemini and parse JSON from response ────────────────────── */
// async function geminiJSON(prompt, maxTokens = 2048) {
//   console.log("NEW GEMINI CODE RUNNING 🚀");
//   const client = getGemini();
//   if (!client) return null;

//   const model = client.getGenerativeModel({
//   // Change 'gemini-1.5-flash' to:
//   model: 'gemini-1.5-flash-latest', 
//   generationConfig: {
//     maxOutputTokens: maxTokens,
//     temperature: 0.85,
//     responseMimeType: "application/json",
//   },
// });

//   const result = await model.generateContent({
//   contents: [
//     {
//       parts: [{ text: prompt }]
//     }
//   ]
// });
//   const text = result.response.text();

//   try {
//     // Strip any markdown fences just in case
//     const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
//     return JSON.parse(clean);
//   } catch (e) {
//     console.error('[Gemini] JSON parse error:', text.slice(0, 300));
//     return null;
//   }
// }
async function geminiJSON(prompt, maxTokens = 2048) {
  console.log("API is hitting");
  const client = getGemini();
  if (!client) return null;

  let attempt = 0;
  const maxRetries = 2;

  while (attempt <= maxRetries) {
    try {
      const model = client.getGenerativeModel({
        model: 'gemini-3-flash-preview',
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent(`${prompt}\n\nStrictly return JSON.`);
      return JSON.parse(result.response.text());

    } catch (e) {
      // If it's a 503 (Busy), wait 2 seconds and try again
      if (e.message.includes('503') && attempt < maxRetries) {
        console.warn(`[Gemini] Server busy, retry ${attempt + 1}...`);
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second pause
        continue;
      }
      
      console.error('[Gemini] Error:', e.message);
      return null; // Triggers your fallbacks
    }
  }
}
/* ────────────────────────────────────────────────────────────────────
   1. TITLE SUGGESTIONS
   ──────────────────────────────────────────────────────────────────── */
async function generateTitles({ topic, platform, niche, count = 5 }) {
  const prompt = `You are a viral content strategist expert in high-CTR titles for social media creators.

Generate ${count} high-CTR title suggestions for a ${niche} creator on ${platform}.
Topic/theme: "${topic || niche + ' content'}"
Make them attention-grabbing, scroll-stopping, and optimised for the ${platform} algorithm.
Include a variety of hooks: curiosity gap, number lists, how-to, personal story, controversy.

Return ONLY valid JSON in this exact shape, no explanation, no markdown:
{
  "titles": [
    { "title": "actual title text here", "ctrScore": 8.5, "hook": "Curiosity gap", "emoji": "🔥" }
  ]
}`;

  const result = await geminiJSON(prompt, 1000);
  if (result?.titles?.length) return result.titles;
  return generateFallbackTitles(topic, platform, niche, count);
}

/* ────────────────────────────────────────────────────────────────────
   2. HASHTAG SUGGESTIONS
   ──────────────────────────────────────────────────────────────────── */
async function generateHashtags({ topic, platform, niche, count = 20 }) {
  const prompt = `You are a hashtag strategy expert for social media content creators.

Generate ${count} optimised hashtags for a ${niche} creator on ${platform}.
Content topic: "${topic || niche}"
Mix trending broad tags, niche-specific tags, and community tags.
Prioritise hashtags that maximise reach AND CTR on ${platform}.

Return ONLY valid JSON in this exact shape, no explanation, no markdown:
{
  "hashtags": [
    { "tag": "#exampletag", "reach": "massive", "ctrScore": 7.5, "category": "trending" }
  ]
}

Rules:
- reach must be one of: massive, large, medium, niche
- category must be one of: trending, niche, branded, community
- ctrScore is a number between 1 and 10
- tag must start with #`;

  const result = await geminiJSON(prompt, 800);
  if (result?.hashtags?.length) return result.hashtags;
  return generateFallbackHashtags(topic, platform, niche);
}

/* ────────────────────────────────────────────────────────────────────
   3. FULL POST GENERATION
   ──────────────────────────────────────────────────────────────────── */
async function generateFullPost({ type, prompt, platform, niche }) {
  const fullPrompt = `You are an expert content creator and copywriter for ${platform} in the ${niche} niche.

Task: Create a complete ${(type || 'full_post').replace('_', ' ')} for ${platform}.
${prompt ? `Creator's topic/idea: "${prompt}"` : `Create something viral for a ${niche} ${platform} creator.`}

Requirements:
- Write an authentic, engaging caption optimised for ${platform}'s algorithm (2-4 paragraphs)
- Generate 4 high-CTR title/hook options with variety
- Generate 15 strategic hashtags
- Include a content strategy tip
- Include a strong call-to-action

Return ONLY valid JSON in this exact shape, no explanation, no markdown:
{
  "generatedCaption": "full caption text here with emojis and line breaks",
  "titleSuggestions": [
    { "title": "title text", "ctrScore": 8.5, "hook": "Curiosity gap", "emoji": "🔥" }
  ],
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "hashtagDetails": [
    { "tag": "#tag1", "reach": "massive", "ctrScore": 7.5, "category": "trending" }
  ],
  "contentIdea": "content strategy tip text here",
  "callToAction": "CTA text here"
}`;

  const result = await geminiJSON(fullPrompt, 2000);
  if (result?.generatedCaption) return result;
  return generateFallbackPost({ type, prompt, platform, niche });
}

/* ────────────────────────────────────────────────────────────────────
   4. CONTENT ANALYSIS FROM UPLOADED MEDIA
   ──────────────────────────────────────────────────────────────────── */
async function analyzeContentFromText({ contentDescription, fileType, platform, niche }) {
  const fullPrompt = `You are a content strategy AI that analyses creator content and suggests high-CTR titles and hashtags.

Analyse this ${fileType} content for ${platform} in the ${niche} niche.
Content description: "${contentDescription}"
The creator wants maximum CTR and reach on ${platform}.

Return ONLY valid JSON in this exact shape, no explanation, no markdown:
{
  "contentSummary": "2-sentence summary of what this content is about",
  "suggestedTitles": [
    { "title": "title text", "ctrScore": 8.5, "hook": "hook type", "emoji": "🔥" }
  ],
  "suggestedHashtags": [
    { "tag": "#tag", "reach": "massive", "ctrScore": 7.5, "category": "trending" }
  ],
  "suggestedCaption": "ready-to-post caption with emojis",
  "contentTips": ["tip 1", "tip 2", "tip 3"]
}`;

  const result = await geminiJSON(fullPrompt, 1500);
  if (result?.suggestedTitles?.length) return result;
  return generateFallbackAnalysis(platform, niche);
}

/* ── Fallbacks (when GEMINI_API_KEY is missing) ──────────────────── */
function generateFallbackTitles(topic, platform, niche, count) {
  return [
    { title: `${count} ${niche} Secrets That Will Change Your Life`, ctrScore: 8.5, hook: 'Number list', emoji: '🔥' },
    { title: `Why Every ${niche} Creator Needs to Know This in 2025`, ctrScore: 7.8, hook: 'Curiosity gap', emoji: '💡' },
    { title: `I Tried ${topic || niche} for 30 Days — Here's What Happened`, ctrScore: 8.2, hook: 'Personal story', emoji: '✨' },
    { title: `The ${niche} Strategy No One Is Talking About`, ctrScore: 7.5, hook: 'Exclusivity', emoji: '🚀' },
    { title: `How to Go Viral on ${platform} as a ${niche} Creator`, ctrScore: 9.0, hook: 'How-to', emoji: '📱' },
  ].slice(0, count);
}

function generateFallbackHashtags(topic, platform, niche) {
  return [
    { tag: `#${niche.toLowerCase()}`, reach: 'large', ctrScore: 7.5, category: 'niche' },
    { tag: `#${niche.toLowerCase()}creator`, reach: 'medium', ctrScore: 8.0, category: 'community' },
    { tag: `#${platform.toLowerCase()}`, reach: 'massive', ctrScore: 6.5, category: 'trending' },
    { tag: '#contentcreator', reach: 'massive', ctrScore: 7.0, category: 'trending' },
    { tag: '#creatortips', reach: 'large', ctrScore: 7.8, category: 'community' },
    { tag: '#viral', reach: 'massive', ctrScore: 6.0, category: 'trending' },
    { tag: '#trending', reach: 'massive', ctrScore: 5.5, category: 'trending' },
    { tag: `#${(topic || niche).toLowerCase().replace(/\s+/g, '')}`, reach: 'medium', ctrScore: 8.5, category: 'niche' },
  ];
}

function generateFallbackPost({ type, prompt, platform, niche }) {
  return {
    generatedCaption: `✨ ${prompt || `Exploring the world of ${niche}`}\n\nSharing everything I know to help you level up your ${platform} game. This is the content I wish I had when I started.\n\nDrop a 🔥 in the comments if this helped you!`,
    titleSuggestions: generateFallbackTitles(prompt, platform, niche, 4),
    hashtags: generateFallbackHashtags(prompt, platform, niche).map(h => h.tag),
    hashtagDetails: generateFallbackHashtags(prompt, platform, niche),
    contentIdea: `Create an authentic ${platform} post about ${prompt || niche}. Use storytelling, show behind-the-scenes moments, and end with a strong CTA to drive engagement.`,
    callToAction: 'Save this for later and tag a friend who needs to see this! 👇',
  };
}

function generateFallbackAnalysis(platform, niche) {
  return {
    contentSummary: `${niche} content optimised for ${platform} audience engagement.`,
    suggestedTitles: generateFallbackTitles('', platform, niche, 5),
    suggestedHashtags: generateFallbackHashtags('', platform, niche),
    suggestedCaption: `Amazing ${niche} content that your ${platform} audience will absolutely love! ✨\n\nSave this post and share with someone who needs it!`,
    contentTips: [
      `Post during peak hours on ${platform} for maximum reach`,
      'Use all suggested hashtags in your first comment for cleaner captions',
      'Engage with every comment in the first 30 minutes to boost the algorithm',
    ],
  };
}

module.exports = { generateTitles, generateHashtags, generateFullPost, analyzeContentFromText };