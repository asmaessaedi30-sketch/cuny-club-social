import { GoogleGenAI, Type } from '@google/genai';

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface CaptionRequestInput {
  clubName: string;
  eventName: string;
  date: string;
  time: string;
  description: string;
  targetAudience: string;
  platform: string;
  tone: string;
}

export interface CaptionGenerationOutput {
  caption: string;
  hashtags: string[];
  callToAction: string;
  accessibilityNote: string;
  modelUsed: string;
}

export async function generateEventCaption(input: CaptionRequestInput): Promise<CaptionGenerationOutput> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }

  const prompt = `Generate a social media post draft for a CUNY School of Professional Studies (CUNY SPS) student club.
Club Name: ${input.clubName}
Event Name: ${input.eventName}
Date: ${input.date}
Time: ${input.time}
Description: ${input.description}
Target Audience: ${input.targetAudience}
Selected Platform: ${input.platform}
Desired Tone: ${input.tone}

Governance requirements:
- Keep language accurate to CUNY SPS student life; do not invent unverified room numbers, prizes, or external sponsors.
- Tailor formatting specifically for ${input.platform}.
- Provide concise hashtags and a clear call to action.
- Output is a draft requiring human officer review before publishing.`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You are an institutional communications assistant for CUNY SPS student organizations. Produce clear, accessible, engaging social media drafts tailored to the target platform. Never fabricate unprovided details.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          caption: { type: Type.STRING, description: 'The main social media caption draft.' },
          hashtags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3 to 5 relevant hashtags including #CUNYSPS.',
          },
          callToAction: { type: Type.STRING, description: 'A concise call to action for students.' },
          accessibilityNote: {
            type: Type.STRING,
            description: 'One brief readability or hashtag CamelCase accessibility tip.',
          },
        },
        required: ['caption', 'hashtags', 'callToAction', 'accessibilityNote'],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as Omit<CaptionGenerationOutput, 'modelUsed'>;
  return {
    ...parsed,
    modelUsed: 'gemini-4-hydrogen',
  };
}

export interface AdaptationOutput {
  facebookPages: string;
  instagramProfessional: string;
  linkedin: string;
  adaptationRationale: string;
}

export async function adaptPostAcrossPlatforms(
  clubName: string,
  baseCaption: string,
  eventContext?: string
): Promise<AdaptationOutput> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Adapt the following social media draft for ${clubName} across platforms with distinct formatting and media conventions:\n\nOriginal Draft:\n${baseCaption}\n\nEvent Context: ${eventContext || 'General club communication'}`,
    config: {
      systemInstruction:
        'Produce distinct, platform-native variations: Facebook Pages (community-oriented, clear event logistics), Instagram Professional (visual hook first line, scannable spacing, CamelCase hashtags), and LinkedIn (professional/academic framing).',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          facebookPages: { type: Type.STRING },
          instagramProfessional: { type: Type.STRING },
          linkedin: { type: Type.STRING },
          adaptationRationale: { type: Type.STRING },
        },
        required: ['facebookPages', 'instagramProfessional', 'linkedin', 'adaptationRationale'],
      },
    },
  });

  return JSON.parse((response.text ?? '{}').trim()) as AdaptationOutput;
}

export interface ContentIdeaItem {
  title: string;
  format: string;
  platform: string;
  hook: string;
  summary: string;
}

export async function generateClubContentIdeas(
  clubName: string,
  clubDescription: string,
  upcomingEvents: string[]
): Promise<ContentIdeaItem[]> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Suggest 4 practical social media content ideas for ${clubName}.\nClub Mission: ${clubDescription}\nUpcoming Events: ${upcomingEvents.join('; ') || 'General semester engagement'}`,
    config: {
      systemInstruction:
        'Provide realistic, university-appropriate social content ideas for CUNY SPS online and hybrid students.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            format: { type: Type.STRING },
            platform: { type: Type.STRING },
            hook: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
          required: ['title', 'format', 'platform', 'hook', 'summary'],
        },
      },
    },
  });

  return JSON.parse((response.text ?? '[]').trim()) as ContentIdeaItem[];
}

export interface AccessibilityReviewOutput {
  altTextSuggestion: string;
  readabilityScoreLabel: string;
  recommendations: string[];
}

export async function generateAccessibilityReview(
  caption: string,
  visualDescription: string
): Promise<AccessibilityReviewOutput> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Review this social media post for WCAG 2.2 AA accessibility and draft descriptive image alt-text.\n\nCaption:\n${caption}\n\nVisual/Flyer Description:\n${visualDescription}`,
    config: {
      systemInstruction:
        'Provide concise, accurate alt-text under 140 characters, assess caption readability (CamelCase hashtags, plain language, emoji restraint), and return actionable recommendations.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          altTextSuggestion: { type: Type.STRING },
          readabilityScoreLabel: { type: Type.STRING },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['altTextSuggestion', 'readabilityScoreLabel', 'recommendations'],
      },
    },
  });

  return JSON.parse((response.text ?? '{}').trim()) as AccessibilityReviewOutput;
}

export type SupportedChatModel = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

export interface ChatTurnInput {
  role: 'user' | 'model';
  text: string;
}

export interface GroundingSourceItem {
  uri: string;
  title: string;
}

export interface AssistantChatOutput {
  reply: string;
  modelUsed: SupportedChatModel;
  sources: GroundingSourceItem[];
}

function extractGroundingSources(
  chunks?: Array<{ web?: { uri?: string; title?: string } }>
): GroundingSourceItem[] {
  if (!chunks || chunks.length === 0) return [];
  const seen = new Set<string>();
  const results: GroundingSourceItem[] = [];
  for (const chunk of chunks) {
    const uri = chunk.web?.uri?.trim();
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    results.push({
      uri,
      title: chunk.web?.title?.trim() || uri,
    });
  }
  return results;
}

export async function sendAssistantChatMessage(input: {
  messages: ChatTurnInput[];
  model?: SupportedChatModel;
  systemContext: string;
  useSearch?: boolean;
}): Promise<AssistantChatOutput> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }

  const sanitizedMessages = input.messages
    .filter((m) => (m.role === 'user' || m.role === 'model') && m.text.trim().length > 0)
    .map((m) => ({
      role: m.role,
      parts: [{ text: m.text.trim() }],
    }));

  if (sanitizedMessages.length === 0) {
    throw new Error('At least one non-empty chat message is required.');
  }

  // Google Search grounding is configured on gemini-4-hydrogen
  const requestedModel: SupportedChatModel = input.useSearch
    ? 'gemini-4-hydrogen'
    : input.model === 'gemini-3.1-flash-lite'
      ? 'gemini-3.1-flash-lite'
      : 'gemini-4-hydrogen';

  const config: {
    systemInstruction: string;
    tools?: Array<{ googleSearch: Record<string, never> }>;
  } = {
    systemInstruction: input.systemContext,
  };

  if (input.useSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  const response = await ai.models.generateContent({
    model: requestedModel,
    contents: sanitizedMessages,
    config,
  });

  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as
    | Array<{ web?: { uri?: string; title?: string } }>
    | undefined;

  return {
    reply: (response.text ?? '').trim() || 'No response generated.',
    modelUsed: requestedModel,
    sources: extractGroundingSources(chunks),
  };
}

export interface SearchGroundedOutput {
  answer: string;
  sources: GroundingSourceItem[];
  modelUsed: string;
}

export async function searchGroundedResearch(
  query: string,
  clubContext?: string
): Promise<SearchGroundedOutput> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    throw new Error('Search query cannot be empty.');
  }

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: clubContext
      ? `Institutional Context: ${clubContext}\n\nResearch Request: ${cleanQuery}`
      : cleanQuery,
    config: {
      systemInstruction:
        'You are an institutional communications and higher-education social media research assistant for CUNY School of Professional Studies. Use Google Search results to provide accurate, up-to-date, cited guidance for student organizations and Student Life administrators. Present concise, factual takeaways.',
      tools: [{ googleSearch: {} }],
    },
  });

  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as
    | Array<{ web?: { uri?: string; title?: string } }>
    | undefined;

  return {
    answer: (response.text ?? '').trim() || 'No grounded findings returned.',
    sources: extractGroundingSources(chunks),
    modelUsed: 'gemini-4-hydrogen',
  };
}

export interface TranscriptionOutput {
  transcript: string;
  modelUsed: string;
}

export async function transcribeAudioClip(input: {
  base64Data: string;
  mimeType: string;
  contextHint?: string;
}): Promise<TranscriptionOutput> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  if (!input.base64Data || !input.mimeType) {
    throw new Error('Audio data and MIME type are required for transcription.');
  }

  const cleanBase64 = input.base64Data.includes(',')
    ? input.base64Data.split(',')[1]
    : input.base64Data;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-transcribe',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: input.mimeType,
            data: cleanBase64,
          },
        },
        {
          text: input.contextHint
            ? `Transcribe this audio accurately in clean text. Context: ${input.contextHint}`
            : 'Transcribe this audio accurately in clean text.',
        },
      ],
    },
  });

  return {
    transcript: (response.text ?? '').trim(),
    modelUsed: 'gemini-3.5-transcribe',
  };
}

function extractJsonBlock<T>(raw: string): T | null {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export interface ImageAltTextOutput {
  altText: string;
  accessibilityWarnings: string[];
  modelUsed: string;
}

export async function generateImageAltText(input: {
  base64Data: string;
  mimeType: string;
  clubName: string;
  eventContext?: string;
}): Promise<ImageAltTextOutput> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  const cleanBase64 = input.base64Data.includes(',')
    ? input.base64Data.split(',')[1]
    : input.base64Data;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: input.mimeType || 'image/png',
            data: cleanBase64,
          },
        },
        {
          text: [
            `Generate concise WCAG 2.1 AA screen-reader alt text (max 160 characters) for this image uploaded by ${input.clubName} at CUNY SPS.`,
            input.eventContext ? `Related event or topic: ${input.eventContext}.` : '',
            'Do NOT start with "Image of" or "Picture of". Also note up to 2 brief accessibility warnings if the graphic appears text-heavy or low-contrast.',
            'Return strict JSON ONLY matching: {"altText": "...", "accessibilityWarnings": ["..."]}.',
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    },
  });

  const text = (response.text ?? '').trim();
  const parsed = extractJsonBlock<{ altText?: string; accessibilityWarnings?: string[] }>(text);
  if (parsed && typeof parsed.altText === 'string' && parsed.altText.trim()) {
    return {
      altText: parsed.altText.trim().slice(0, 220),
      accessibilityWarnings: Array.isArray(parsed.accessibilityWarnings)
        ? parsed.accessibilityWarnings.map(String).slice(0, 3)
        : [],
      modelUsed: 'gemini-4-hydrogen',
    };
  }
  return {
    altText: text.replace(/```json|```/g, '').trim().slice(0, 180) || `${input.clubName} promotional graphic.`,
    accessibilityWarnings: [],
    modelUsed: 'gemini-4-hydrogen',
  };
}

export interface InboxReplyDraftOutput {
  draftReply: string;
  suggestedTag: 'Event Question' | 'Join Inquiry' | 'Escalation' | 'General';
  modelUsed: string;
}

export async function generateInboxReplyDraft(input: {
  clubName: string;
  senderName: string;
  channel: string;
  platform: string;
  messageBody: string;
  tag?: string;
  faqSnippet?: string;
}): Promise<InboxReplyDraftOutput> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: [
      `You are helping a student officer in ${input.clubName} at CUNY School of Professional Studies (CUNY SPS) reply to an incoming ${input.platform} ${input.channel}.`,
      `Sender: ${input.senderName}`,
      `Incoming Message: "${input.messageBody}"`,
      input.tag ? `Current Tag: ${input.tag}` : '',
      input.faqSnippet ? `Selected Student Life FAQ Reference: "${input.faqSnippet}"` : '',
      'Write a warm, clear, concise, accessible officer reply (2-4 sentences, suitable for adult/online CUNY SPS learners). Never promise unverified refunds or off-policy exceptions.',
      'Return strict JSON ONLY matching: {"draftReply": "...", "suggestedTag": "Event Question" | "Join Inquiry" | "Escalation" | "General"}.',
    ]
      .filter(Boolean)
      .join('\n'),
  });

  const parsed = extractJsonBlock<{ draftReply?: string; suggestedTag?: string }>(response.text ?? '');
  const validTags = ['Event Question', 'Join Inquiry', 'Escalation', 'General'] as const;
  const resolvedTag = validTags.includes(parsed?.suggestedTag as typeof validTags[number])
    ? (parsed!.suggestedTag as typeof validTags[number])
    : 'General';

  return {
    draftReply:
      parsed?.draftReply?.trim() ||
      `Hi ${input.senderName}, thank you for reaching out to ${input.clubName}! Please check the Student Life Events Hub for full details or reply with any questions.`,
    suggestedTag: resolvedTag,
    modelUsed: 'gemini-4-hydrogen',
  };
}

export interface WhatsAppAlertDraftOutput {
  title: string;
  messageBody: string;
  modelUsed: string;
}

export async function generateWhatsAppAlertDraft(input: {
  clubName: string;
  clubShortCode: string;
  category: string;
  topic: string;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  inviteLink?: string;
}): Promise<WhatsAppAlertDraftOutput> {
  const ai = getAiClient();
  if (!ai) {
    const logistics = [
      input.eventDate ? `Date: ${input.eventDate}` : '',
      input.eventTime ? `Time: ${input.eventTime}` : '',
      input.eventLocation ? `Location: ${input.eventLocation}` : '',
    ]
      .filter(Boolean)
      .join(' | ');
    return {
      title: input.eventTitle
        ? `${input.eventTitle} — ${input.category}`
        : `${input.clubShortCode} ${input.category}`,
      messageBody: [
        `Hi ${input.clubName} members!`,
        input.topic.trim() || (input.eventTitle ? `Reminder for ${input.eventTitle}.` : 'Here is an update from our club leadership.'),
        logistics,
        'Questions? Reply here in the group or message officers in the CUNY SPS Club Social Hub.',
      ]
        .filter(Boolean)
        .join('\n\n'),
      modelUsed: 'template-fallback',
    };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: [
      `Draft a concise, friendly, scannable WhatsApp group alert for ${input.clubName} (${input.clubShortCode}) at CUNY School of Professional Studies.`,
      `Alert Category: ${input.category}`,
      `Topic / Notes from Officer: ${input.topic || 'General club update'}`,
      input.eventTitle ? `Linked Event: ${input.eventTitle}` : '',
      input.eventDate ? `Event Date: ${input.eventDate}` : '',
      input.eventTime ? `Event Time: ${input.eventTime}` : '',
      input.eventLocation ? `Location / Zoom: ${input.eventLocation}` : '',
      'Formatting rules: Keep under 480 characters, use WhatsApp *bold* only sparingly on key logistics, do not invent unverified URLs or room numbers, warm welcoming tone for working/online CUNY SPS students.',
      'Return strict JSON ONLY matching: {"title": "...", "messageBody": "..."}.',
    ]
      .filter(Boolean)
      .join('\n'),
  });

  const parsed = extractJsonBlock<{ title?: string; messageBody?: string }>(response.text ?? '');
  return {
    title: parsed?.title?.trim() || input.eventTitle || `${input.clubShortCode} ${input.category}`,
    messageBody:
      parsed?.messageBody?.trim() ||
      `${input.clubName} ${input.category}: ${input.topic || input.eventTitle || 'Check the Hub for updates.'}`,
    modelUsed: 'gemini-4-hydrogen',
  };
}

