import { NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

export async function GET() {
  try {
    // Ping Ollama root endpoint
    const response = await fetch(OLLAMA_URL, {
      method: "GET",
      // Short timeout to avoid hanging if Ollama is not running
      signal: AbortSignal.timeout(2000), 
    });

    if (response.ok) {
      return NextResponse.json({ available: true });
    }
    
    return NextResponse.json({ available: false });
  } catch (error) {
    return NextResponse.json({ available: false });
  }
}
