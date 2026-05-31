import { NextRequest, NextResponse } from "next/server";

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

type EmergencyClassification = {
  isEmergency: boolean;
  reason: string;
};

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma4:latest";

const allowedTopicPattern =
  /\b(road|roads|street|streets|highway|traffic|transport|transportation|vehicle|car|bus|truck|bike|bicycle|motorcycle|scooter|pedestrian|crosswalk|signal|speed|seatbelt|helmet|driving|driver|accident|crash|collision|ambulance|first aid|medical emergency|injury|injured|bleeding|fracture|unconscious|emergency lane|road safety|safe driving|health|healthcare|medicine|illness|pain|cpr|burn|poison|choking|faint|sickness|fever|doctor|hospital|clinic|symptoms|wound|bandages)\b/i;

const emergencyPattern =
  /\b(danger|emergency|help|help me|save me|sos|i am dying|i'm dying|dying|in danger|harm'?s way|harm way|being followed|someone is following|attacked|attack|assault|kidnapped|trapped|threatened|threatening me|serious crash|major accident|bad accident|i hit|hit a|hit by|ran over|run over|child on road|person on road|pedestrian hit|bleeding|blood|unconscious|fainted|can't breathe|cannot breathe|not breathing|medical emergency|injured badly|badly injured|severely injured|need ambulance|call ambulance|call police|call authorities|stranded|stuck on highway)\b/i;

const fastEmergencyCases: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern:
      /\b(i am dying|i'm dying|dying|can't breathe|cannot breathe|not breathing|unconscious|fainted|heart attack|stroke|seizure|chest pain|severe bleeding|bleeding heavily)\b/i,
    reason: "possible life-threatening medical emergency",
  },
  {
    pattern:
      /\b(i hit|hit a|hit by|ran over|run over|pedestrian hit|child on road|person on road|cyclist hit|biker hit)\b/i,
    reason: "person may have been hit on or near the road",
  },
  {
    pattern:
      /\b(serious crash|major accident|bad accident|car flipped|vehicle flipped|trapped|stuck in car|fire|smoke|fuel leak)\b/i,
    reason: "serious crash or unsafe road scene",
  },
  {
    pattern:
      /\b(danger|emergency|sos|help me|save me|in danger|harm'?s way|being followed|attacked|assault|kidnapped|threatened|call police|call authorities)\b/i,
    reason: "immediate danger or threat to safety",
  },
  {
    pattern:
      /\b(need ambulance|call ambulance|injured badly|badly injured|severely injured|broken bone|fracture|blood)\b/i,
    reason: "serious injury needing urgent help",
  },
];

async function askOllama(message: string) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      think: false,
      options: {
        temperature: 0.3,
        num_predict: 120,
      },
      messages: [
        {
          role: "system",
          content:
            "You are RoadAid, a concise road safety, transportation, healthcare, and medical-emergency assistant. Answer in 1-3 short sentences. Give practical safety steps or first aid advice. If a question is outside road safety, transportation, healthcare, or medical emergencies, say you only answer questions about road safety, transportation, healthcare, and immediate first aid.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as OllamaChatResponse;
  return data.message?.content?.trim() || "I could not generate a response.";
}

function emergencyReply(reason: string) {
  return `Emergency mode activated: ${reason}. Authorities have been contacted. If this is real, call your local emergency number now and move to a safer, visible place if you can.`;
}

function getFastEmergencyClassification(message: string) {
  for (const emergencyCase of fastEmergencyCases) {
    if (emergencyCase.pattern.test(message)) {
      return {
        isEmergency: true,
        reason: emergencyCase.reason,
      };
    }
  }

  if (emergencyPattern.test(message)) {
    return {
      isEmergency: true,
      reason: "urgent danger or emergency language detected",
    };
  }

  return null;
}

function parseEmergencyClassification(text: string): EmergencyClassification {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] || text) as Partial<EmergencyClassification>;

    return {
      isEmergency: Boolean(parsed.isEmergency),
      reason:
        typeof parsed.reason === "string" && parsed.reason.trim()
          ? parsed.reason.trim()
          : "urgent safety risk",
    };
  } catch {
    return { isEmergency: false, reason: "not classified as an emergency" };
  }
}

async function classifyEmergency(message: string): Promise<EmergencyClassification> {
  const fastClassification = getFastEmergencyClassification(message);
  if (fastClassification) return fastClassification;

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      think: false,
      format: "json",
      options: {
        temperature: 0,
        num_predict: 80,
      },
      messages: [
        {
          role: "system",
          content:
            "Classify whether the user's message is an emergency. Emergency means immediate danger to a person, serious injury, possible death, someone hit on/near a road, severe crash, trapped person, unsafe highway situation, fire, drowning, violence, threat, need for police, or need for ambulance. Not emergency means general transport advice, routine road safety questions, mild inconvenience, or unrelated questions. Return only JSON: {\"isEmergency\": boolean, \"reason\": string}.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    }),
  });

  if (!response.ok) {
    return { isEmergency: false, reason: "not classified as an emergency" };
  }

  const data = (await response.json()) as OllamaChatResponse;
  return parseEmergencyClassification(data.message?.content?.trim() || "{}");
}

export async function POST(request: NextRequest) {
  try {
    const { message } = (await request.json()) as { message?: string };
    const prompt = String(message || "").trim();

    if (!prompt) {
      return NextResponse.json(
        { reply: "Please enter a question.", emergency: false },
        { status: 400 },
      );
    }

    const emergencyClassification = await classifyEmergency(prompt);

    if (emergencyClassification.isEmergency) {
      return NextResponse.json({
        reply: emergencyReply(emergencyClassification.reason),
        emergency: true,
        emergencyReason: emergencyClassification.reason,
      });
    }

    if (!allowedTopicPattern.test(prompt)) {
      return NextResponse.json({
        reply:
          "I only answer questions about road safety, transportation, healthcare, and immediate first aid.",
        emergency: false,
      });
    }

    const reply = await askOllama(prompt);
    return NextResponse.json({ reply, emergency: false });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        reply:
          "I could not reach the local Gemma model right now. Please make sure Ollama is running.",
        emergency: false,
      },
      { status: 500 },
    );
  }
}
