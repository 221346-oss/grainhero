import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { messages, grainBatch } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not set" }, { status: 500 });
  }

  // Add the full grain batch object as a JSON string in the system prompt
  const grainBatchInfo = grainBatch ? `\nGrain Batch details (JSON):\n${JSON.stringify(grainBatch, null, 2)}` : '';
  const systemPrompt = `You are GrainHero AI Assistant, an expert in grain storage management, spoilage prediction, and agricultural technology. You help farmers and storage managers optimize grain storage conditions, predict spoilage risks, and provide actionable recommendations.

Your expertise includes:
- Grain storage best practices (temperature, humidity, moisture control)
- Spoilage prediction and risk assessment
- Environmental monitoring and IoT sensors
- Preventive measures and corrective actions
- Storage optimization strategies
- Quality management and traceability

Always provide practical, actionable advice based on scientific principles and industry best practices. Be conversational but professional.${grainBatchInfo}`;

  const openaiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m: { role: string; text: string }) => ({
      role: m.role,
      content: m.text,
    })),
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: openaiMessages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "OpenAI API error" }, { status: 500 });
  }

  const data = await response.json();
  const aiMessage = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

  return NextResponse.json({ aiMessage });
} 