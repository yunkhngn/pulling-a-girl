import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { context, herMessage, tone } = body;

    // Validate herMessage
    if (!herMessage || typeof herMessage !== "string" || herMessage.trim().length === 0) {
      return NextResponse.json(
        { error: "Tin nhắn của cô ấy không được để trống." },
        { status: 400 }
      );
    }

    // 1. Read prompt.md dynamically as the single source of truth for the system prompt
    const promptPath = path.join(process.cwd(), "prompt.md");
    if (!fs.existsSync(promptPath)) {
      return NextResponse.json(
        { error: "Không tìm thấy file prompt.md trong thư mục gốc." },
        { status: 500 }
      );
    }

    const systemPrompt = fs.readFileSync(promptPath, "utf-8").trim();

    // 2. Configure Gemini API key (server-side only)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Chưa cấu hình GEMINI_API_KEY. Vui lòng thiết lập biến môi trường GEMINI_API_KEY trong file .env.local",
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // 3. Format tone guidance if specified
    const toneDescriptions: Record<string, string> = {
      flirty: "Flirty (tán tỉnh tự nhiên, trêu đùa duyên dáng, cuốn hút, tinh tế)",
      neutral: "Neutral (bình thản, điềm đạm, tự nhiên, không vồ vập cũng không lạnh lùng)",
      sympathy: "Sympathy (đồng cảm, dịu dàng, lắng nghe, tạo cảm giác an toàn và được thấu hiểu)",
      playful: "Playful (hóm hỉnh, trêu chọc vui vẻ, đối đáp thông minh, nghịch ngợm)",
    };

    const toneInstruction = tone && toneDescriptions[tone] ? `Desired Tone: ${toneDescriptions[tone]}\n\n` : "";

    // 4. Format user prompt strictly according to context.md specification
    const userPrompt = `Context:\n${(context || "").trim()}\n\n${toneInstruction}Her:\n${herMessage.trim()}`;

    // 5. Try models with fallback if 503 capacity unavailable occurs
    const primaryModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const modelsToTry = Array.from(
      new Set([primaryModel, "gemini-3.8-flash", "gemini-2.5-flash"])
    );

    let lastError: unknown = null;
    let reply = "";

    for (const modelToUse of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelToUse,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
            maxOutputTokens: 300,
          },
        });

        reply = response.text?.trim() || "";
        if (reply) {
          break;
        }
      } catch (err: unknown) {
        lastError = err;
        console.warn(`Model ${modelToUse} failed:`, err instanceof Error ? err.message : err);
        const errMsg = err instanceof Error ? err.message : String(err);
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("capacity") ||
          errMsg.includes("overloaded") ||
          errMsg.includes("high demand") ||
          errMsg.includes("ResourceExhausted") ||
          errMsg.includes("429");
        if (!isTransient) {
          throw err;
        }
      }
    }

    // Strip wrapping quotes or accidental label prefixes if present
    if (
      (reply.startsWith('"') && reply.endsWith('"')) ||
      (reply.startsWith("“") && reply.endsWith("”"))
    ) {
      reply = reply.slice(1, -1).trim();
    }
    if (reply.toLowerCase().startsWith("reply:")) {
      reply = reply.slice(6).trim();
    }
    while (reply.startsWith(".") || reply.startsWith(",") || reply.startsWith("-")) {
      reply = reply.slice(1).trim();
    }

    if (!reply) {
      if (lastError) throw lastError;
      return NextResponse.json(
        { error: "Không nhận được phản hồi từ Gemini. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    console.error("API /api/generate error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Đã xảy ra lỗi khi tạo phản hồi từ Gemini.";
    return NextResponse.json(
      { error: `Lỗi Gemini API: ${errorMessage}` },
      { status: 500 }
    );
  }
}
