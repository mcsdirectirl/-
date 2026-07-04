import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini AI client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not configured in the environment. Please add it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Structured output schema matching academic and scientific guidelines
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      description: "تصنيف الشبهة أو السؤال: 'عقدية'، 'فقهية'، 'تاريخية'، 'متعلقة بالسيرة'، 'متعلقة بالنصوص (قرآن/حديث)'، أو 'عامة'"
    },
    categoryExplanation: {
      type: Type.STRING,
      description: "توضيح ميسر لسبب تصنيف السؤال تحت هذا المجال الشرعي."
    },
    doubtOrigin: {
      type: Type.STRING,
      description: "تفنيد أصل الشبهة ومصدرها وتاريخ أو سياق إثارتها وسبب لجوء المشككين إليها."
    },
    scientificReply: {
      type: Type.STRING,
      description: "الرد العلمي المنهجي الرصين المفصل المدعوم بالآيات القرآنية الكريمة والأحاديث النبوية الصحيحة مع شرح الدلالة بلغة واضحة."
    },
    scholarsQuotes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          scholar: {
            type: Type.STRING,
            description: "اسم العالم المعتبر (مثل: ابن تيمية، ابن القيم، ابن باز، ابن عثيمين، الألباني)"
          },
          quote: {
            type: Type.STRING,
            description: "القول المنسوب بدقة أو ملخص الفتوى والتوجيه العلمي الصادر عنه."
          },
          source: {
            type: Type.STRING,
            description: "اسم المرجع، الفتوى، أو الكتاب المنقول عنه القول بالتفصيل."
          }
        },
        required: ["scholar", "quote"]
      },
      description: "أقوال محددة ومنسوبة بدقة لعلماء السلف تفيد في حل هذه المسألة وتفصيلها."
    },
    referenceWebsites: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "اسم الموقع المرجعي (مثل: islamqa.info، binbaz.org.sa، dorar.net، alukah.net، islamweb.net)"
          },
          url: {
            type: Type.STRING,
            description: "الرابط الرئيسي للموقع أو رابط البحث المقترح للموضوع."
          },
          relevance: {
            type: Type.STRING,
            description: "فائدة هذا الموقع بخصوص المسألة وطبيعة المواد المتوفرة فيه."
          }
        },
        required: ["name", "url", "relevance"]
      },
      description: "المواقع الخمسة الأساسية التي يستأنس بمحتواها بخصوص هذه المسألة."
    },
    summary: {
      type: Type.STRING,
      description: "خلاصة موجزة، مبسطة، ومباشرة تناسب عامة الناس وتلخص المسألة بوضوح ودون تطويل."
    },
    suggestedFollowUps: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING
      },
      description: "3 أسئلة استيضاحية أو متابعة شرعية منطقية ومترابطة قد يطرحها المستخدم تالياً."
    }
  },
  required: [
    "category",
    "categoryExplanation",
    "doubtOrigin",
    "scientificReply",
    "scholarsQuotes",
    "referenceWebsites",
    "summary",
    "suggestedFollowUps"
  ]
};

// API Endpoint for generating answers
app.post("/api/chat", async (req, res) => {
  try {
    const { question, category = "auto", style = "detailed", focusedScholars = [], focusedWebsites = [], history = [] } = req.body;

    if (!question || typeof question !== "string" || question.trim() === "") {
      return res.status(400).json({ error: "الرجاء كتابة سؤال أو شبهة صحيحة." });
    }

    const ai = getAiClient();

    // Construct custom prompt constraints based on user preferences
    let customDirectives = "";
    if (category && category !== "auto") {
      customDirectives += `\n- هذا السؤال ينتمي مبدئياً لتصنيف: [${category}]، يرجى تأكيد هذا التصنيف أو تكييفه شرعياً بمرونة.`;
    }
    if (style === "summary") {
      customDirectives += `\n- يرجى التركيز على الإجابة المختصرة والمباشرة والتبسيط الشديد مع إيجاز تفنيد الشبهة لعامة الناس.`;
    }
    if (focusedScholars && focusedScholars.length > 0) {
      customDirectives += `\n- ركّز بشكل خاص في قسم أقوال العلماء على أقوال هؤلاء الأعلام إن وجدت فتاوى لهم متعلقة بالموضوع: [${focusedScholars.join(", ")}].`;
    }
    if (focusedWebsites && focusedWebsites.length > 0) {
      customDirectives += `\n- ركّز على الإحالة المباشرة للمواقع التالية في قسم المواقع المرجعية مع تقديم شرح لكيفية الاستفادة منها: [${focusedWebsites.join(", ")}].`;
    }

    // Build chat history for conversational context if available
    let historyContext = "";
    if (history && history.length > 0) {
      historyContext = "\nالسياق الحالي للمحادثة السابقة:\n" + history.map((h: any) => `${h.role === "user" ? "السائل" : "المستشار"}: ${h.text}`).join("\n");
    }

    const systemInstruction = `أنت مساعد خبير ومستشار شرعي متقدم متخصص في الرد على الشبهات والأسئلة المثارة حول الإسلام، معتمداً حصراً على المنهج السلفي في الاستدلال (القرآن الكريم والسنة النبوية المطهرة بفهم السلف الصالح رضي الله عنهم).

مهامك ومحددات عملك الصارمة:
1. صنف السؤال أو الشبهة في حقل 'category' المخصص إلى أحد الأنواع بدقة: عقدية، فقهية، تاريخية، متعلقة بالسيرة، متعلقة بالنصوص (قرآن/حديث)، أو عامة.
2. قدم ردك العلمي المنهجي بأسلوب رصين ومقنع، وقسمه في حقول الـ JSON المطالب بها.
3. التزم التزاماً مطلقاً بما يلي:
   - تفنيد الشبهة في مهدها وتوضيح وجه الخلل العقلي أو المنهجي في إثارتها.
   - الرد العلمي الرصين المدعم بأدلة صحيحة صريحة من القرآن الكريم والسنة النبوية الصحيحة.
   - الإحالة بدقة إلى أقوال الأئمة الأعلام وعلماء أهل السنة والجماعة السلفيين المعتبرين (ابن تيمية، ابن القيم، ابن باز، ابن عثيمين، الألباني، إلخ).
   - توفير خلاصة شديدة البساطة والوضوح تناسب عامة الناس وتقطع الشبهة في عقولهم بلطف.
4. استخدم المواقع الخمسة التالية كمرجع أساسي للاستئناس وتوجيه المستخدمين إليها:
   - islamqa.info (موقع الإسلام سؤال وجواب - الشيخ محمد صالح المنجد)
   - binbaz.org.sa (الموقع الرسمي لسماحة الشيخ ابن باز)
   - dorar.net (مؤسسة الدرر السنية للتأكد من الأحاديث)
   - alukah.net (شبكة الألوكة العلمية)
   - islamweb.net (إسلام ويب - مركز الفتوى)
5. يجب أن تكون نبرتك هادئة، علمية، وقورة، رحيمة بالسائل، خالية تماماً من الاستعلاء أو الغلظة أو الجدال المذموم.
6. في المسائل الخلافية بين المذاهب الفقهية، وضح موقف المنهج السلفي الملتزم بالدليل الأثرى بوضوح تام، مع ذكر المذاهب الأخرى بأدب واحترام ودون تجريح أو قدح.
7. الأمانة العلمية والدقة القصوى: إذا لم تجد دليلاً صحيحاً أو قولاً مسنداً لعالم أو فروعاً مسألة في المواقع المذكورة بخصوص السؤال، لا تخترع أحاديث أو درجات أو أرقام فتاوى أو اقتباسات مطلقاً! بل وضح في حقل الرد العلمي عدم تأكدك بخصوص هذه الجزئية بدقة وأرشد المستخدم للبحث المباشر في هذه المواقع.
8. يجب أن تكون جميع النصوص في حقول الإجابة باللغة العربية الفصحى الميسرة والواضحة والخالية من التعقيد.
`;

    const prompt = `السؤال أو الشبهة المقدمة من السائل:
"${question}"

المحددات الإضافية المطلوبة من المستخدم:
${customDirectives}
${historyContext}

يرجى توليد الإجابة كاملةً ككائن JSON ملتزماً بالـ Schema المحددة ومستعيناً بالحقائق الشرعية والمنهجية السلفية والأدلة الصحيحة.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2, // Low temperature for high factual recall and consistency
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("فشل توليد الرد من الذكاء الاصطناعي.");
    }

    const data = JSON.parse(responseText.trim());
    return res.json(data);

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({
      error: error.message || "حدث خطأ غير متوقع أثناء معالجة طلبك. يرجى التحقق من إعدادات المفتاح السري والمحاولة مجدداً."
    });
  }
});

// Configure Vite or Static Files depending on environment
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
