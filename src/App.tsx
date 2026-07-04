import React, { useState, useEffect, useRef } from "react";
import { 
  BookOpen, 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  Send, 
  History, 
  Bookmark, 
  Copy, 
  Check, 
  ExternalLink, 
  Filter, 
  Sparkles, 
  HelpCircle, 
  RefreshCw, 
  FileText, 
  X, 
  MessageSquare, 
  Share2, 
  Trash2, 
  Info,
  ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  PRELOADED_DOUBTS, 
  SCHOLARS, 
  REFERENCE_SITES, 
  PreloadedDoubt, 
  ScholarInfo, 
  ReferenceSite 
} from "./data";

interface ScholarQuote {
  scholar: string;
  quote: string;
  source?: string;
}

interface ReferenceWeb {
  name: string;
  url: string;
  relevance: string;
}

interface ChatResponse {
  category: string;
  categoryExplanation: string;
  doubtOrigin: string;
  scientificReply: string;
  scholarsQuotes: ScholarQuote[];
  referenceWebsites: ReferenceWeb[];
  summary: string;
  suggestedFollowUps: string[];
}

interface SavedResponse {
  id: string;
  question: string;
  timestamp: string;
  response: ChatResponse;
}

export default function App() {
  // Chat Query States
  const [question, setQuestion] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("auto");
  const [styleMode, setStyleMode] = useState<"detailed" | "summary">("detailed");
  const [focusedScholars, setFocusedScholars] = useState<string[]>([]);
  const [focusedWebsites, setFocusedWebsites] = useState<string[]>([]);

  // System States
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [activeResponse, setActiveResponse] = useState<ChatResponse | null>(null);
  const [activeQuestion, setActiveQuestion] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successCopy, setSuccessCopy] = useState(false);
  const [activeTab, setActiveTab] = useState<"deconstruction" | "evidence" | "scholars" | "websites">("evidence");

  // Local Storage Saved Data
  const [savedResponses, setSavedResponses] = useState<SavedResponse[]>([]);
  const [historyItems, setHistoryItems] = useState<{ question: string; timestamp: string; response: ChatResponse }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Refs and Audio/UI Helpers
  const responseEndRef = useRef<HTMLDivElement | null>(null);

  // Loading Steps Phrases
  const loadingPhrases = [
    "جارٍ تصنيف طبيعة السؤال والتحقق من مجاله الشرعي بذكاء...",
    "جارٍ تفكيك الشبهة وبناء الأساس الاستدلالي من الكتاب والسنة الصحيحة...",
    "جارٍ تتبع أقوال أئمة السلف وتخريج المرويات عبر الدرر السنية...",
    "جارٍ صياغة الخلاصة الميسرة وربط المراجع والمواقع الخمسة المعتمدة..."
  ];

  // Load Saved Data from Local Storage
  useEffect(() => {
    const saved = localStorage.getItem("basira_saved");
    if (saved) {
      try {
        setSavedResponses(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading saved responses", e);
      }
    }

    const history = localStorage.getItem("basira_history");
    if (history) {
      try {
        setHistoryItems(JSON.parse(history));
      } catch (e) {
        console.error("Error loading history", e);
      }
    }
  }, []);

  // Interval for loading phrases
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setLoadingStage(0);
      interval = setInterval(() => {
        setLoadingStage((prev) => (prev < loadingPhrases.length - 1 ? prev + 1 : prev));
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Scroll response into view
  useEffect(() => {
    if (activeResponse) {
      responseEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeResponse, loading]);

  // Handle Scholar selection toggle
  const toggleScholar = (scholarName: string) => {
    setFocusedScholars((prev) => 
      prev.includes(scholarName) 
        ? prev.filter((s) => s !== scholarName) 
        : [...prev, scholarName]
    );
  };

  // Handle Website selection toggle
  const toggleWebsite = (siteDomain: string) => {
    setFocusedWebsites((prev) => 
      prev.includes(siteDomain) 
        ? prev.filter((w) => w !== siteDomain) 
        : [...prev, siteDomain]
    );
  };

  // Trigger main API call
  const handleQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    setLoading(true);
    setErrorMsg("");
    setActiveResponse(null);
    setActiveQuestion(queryText);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: queryText,
          category: selectedCategory,
          style: styleMode,
          focusedScholars,
          focusedWebsites,
          history: [] // Can be extended with conversation context
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "فشل الاتصال بالخادم. يرجى مراجعة الإعدادات.");
      }

      const data: ChatResponse = await res.json();
      setActiveResponse(data);
      setActiveTab("evidence"); // default tab

      // Add to local history
      const newHistoryItem = {
        question: queryText,
        timestamp: new Date().toLocaleDateString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
        response: data
      };
      const updatedHistory = [newHistoryItem, ...historyItems.slice(0, 19)];
      setHistoryItems(updatedHistory);
      localStorage.setItem("basira_history", JSON.stringify(updatedHistory));

    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ غير متوقع أثناء معالجة طلبك.");
    } finally {
      setLoading(false);
    }
  };

  // Save/Bookmark current response
  const saveCurrentResponse = () => {
    if (!activeResponse || !activeQuestion) return;

    const isAlreadySaved = savedResponses.some((s) => s.question === activeQuestion);
    if (isAlreadySaved) return;

    const newSaved: SavedResponse = {
      id: Date.now().toString(),
      question: activeQuestion,
      timestamp: new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }),
      response: activeResponse
    };

    const updated = [newSaved, ...savedResponses];
    setSavedResponses(updated);
    localStorage.setItem("basira_saved", JSON.stringify(updated));
  };

  // Delete saved response
  const deleteSavedResponse = (id: string) => {
    const updated = savedResponses.filter((s) => s.id !== id);
    setSavedResponses(updated);
    localStorage.setItem("basira_saved", JSON.stringify(updated));
  };

  // Clear History
  const clearHistory = () => {
    setHistoryItems([]);
    localStorage.removeItem("basira_history");
  };

  // Copy output to clipboard
  const copyToClipboard = () => {
    if (!activeResponse) return;

    const scholarsText = activeResponse.scholarsQuotes
      .map((s) => `• قال ${s.scholar}: "${s.quote}" [المرجع: ${s.source || 'غير محدد'}]`)
      .join("\n\n");

    const textToCopy = `
بصيرة | الرد الشرعي المنهجي على الشبهات
-----------------------------------------
السؤال/الشبهة: ${activeQuestion}
التصنيف: ${activeResponse.category}

[1] تفنيد الشبهة وأصلها:
${activeResponse.doubtOrigin}

[2] الرد العلمي المفصل والأدلة:
${activeResponse.scientificReply}

[3] من أقوال العلماء المعتبرين:
${scholarsText}

[4] الخلاصة الموجزة:
${activeResponse.summary}

-----------------------------------------
تم التوليد بواسطة منصة "بصيرة" للرد المنهجي المعتمد على الكتاب والسنة وفهم سلف الأمة.
`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setSuccessCopy(true);
      setTimeout(() => setSuccessCopy(false), 2000);
    });
  };

  // Regex utility to style curly bracket Quran verses {...} or quotes elegantly
  const formatTextWithVerses = (text: string) => {
    if (!text) return "";
    
    // Split by {...} or ((...)) or "..."
    const parts = text.split(/(\{.*?\})|(\(.*?\))/g);
    
    return parts.map((part, index) => {
      if (!part) return null;
      
      // Match Quran verses enclosed in {...}
      if (part.startsWith("{") && part.endsWith("}")) {
        return (
          <span 
            key={index} 
            className="font-serif text-emerald-800 font-bold bg-emerald-50/70 border border-emerald-100 px-2 py-0.5 rounded mx-1 inline-block text-[1.05rem] leading-relaxed"
            dir="rtl"
          >
            {part}
          </span>
        );
      }
      
      // Match Hadiths or crucial quotes enclosed in (...)
      if (part.startsWith("(") && part.endsWith(")")) {
        return (
          <span 
            key={index} 
            className="font-serif text-amber-900 font-medium bg-amber-50/50 px-1.5 py-0.5 border border-amber-100 rounded mx-1 inline-block text-[1rem]"
          >
            {part}
          </span>
        );
      }
      
      return <span key={index}>{part}</span>;
    });
  };

  // Filter saved responses based on search
  const filteredSaved = savedResponses.filter(s => 
    s.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.response.scientificReply.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#05080a] text-slate-200 font-sans antialiased selection:bg-[#b49650]/30 selection:text-white relative overflow-hidden" dir="rtl">
      
      {/* Immersive background glow effects */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#b49650] opacity-[0.03] blur-[150px] rounded-full -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-900 opacity-[0.02] blur-[180px] rounded-full -z-10 pointer-events-none"></div>

      {/* Top Beautiful Header Banner */}
      <header className="sticky top-0 z-40 bg-[#080d12]/85 backdrop-blur-md border-b border-white/5 shadow-lg px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 bg-gradient-to-br from-[#b49650] to-[#7A612F] rounded-2xl flex items-center justify-center shadow-lg shadow-[#b49650]/10 border border-[#b49650]/30">
              <BookOpen className="h-5.5 w-5.5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">بَصِيرَة</h1>
                <span className="bg-[#b49650]/20 text-[#b49650] text-[10px] font-bold px-1.5 py-0.5 rounded-sm border border-[#b49650]/30">مستشار الشبهات</span>
              </div>
              <p className="text-xs text-slate-450 font-medium mt-0.5">مستشار شرعي للرد على الشبهات والأسئلة المثارة بدقة وأمانة وفق منهج السلف</p>
            </div>
          </div>

          {/* Quick Stats & References Banner */}
          <div className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 shadow-xs">
              <ShieldCheck className="h-4 w-4 text-[#b49650]" />
              منهج سلف الأمة الصالح
            </span>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">المرجعيات:</span>
              <span className="hover:text-[#b49650] cursor-help transition-colors">islamqa</span>
              <span className="text-slate-700">•</span>
              <span className="hover:text-[#b49650] cursor-help transition-colors">binbaz</span>
              <span className="text-slate-700">•</span>
              <span className="hover:text-[#b49650] cursor-help transition-colors">dorar</span>
              <span className="text-slate-700">•</span>
              <span className="hover:text-[#b49650] cursor-help transition-colors">alukah</span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ================= LEFT COLUMN: Sidebar - Tools, Presets, saved bookmarks ================= */}
          <section className="lg:col-span-4 space-y-6">
            
            {/* Interactive Settings and Filters */}
            <div className="bg-[#080d12]/60 rounded-2xl border border-white/5 p-5 shadow-lg space-y-5 glass accent-glow">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Filter className="h-5 w-5 text-[#b49650]" />
                <h2 className="text-base font-bold text-[#b49650]">محددات ومقاييس الاستدلال</h2>
              </div>

              {/* 1. Category selector */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">مجال السؤال المقترح:</label>
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-sm bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#b49650]/20 focus:border-[#b49650] transition-all font-medium"
                >
                  <option value="auto" className="bg-[#080d12]">كشف آلي تلقائي (موصى به)</option>
                  <option value="عقدية" className="bg-[#080d12]">شبهة عقدية (توحيد، صفات، غيبيات)</option>
                  <option value="فقهية" className="bg-[#080d12]">مسألة فقهية (معاملات، عبادات، شريعة)</option>
                  <option value="تاريخية" className="bg-[#080d12]">مروية تاريخية (فتوحات، تاريخ إسلامي)</option>
                  <option value="متعلقة بالسيرة" className="bg-[#080d12]">السيرة النبوية والمغازي</option>
                  <option value="متعلقة بالنصوص (قرآن/حديث)" className="bg-[#080d12]">نصوص شرعية وتدوين الحديث</option>
                </select>
              </div>

              {/* 2. Scholar focus */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">إبراز فتاوى وأقوال أئمة بعينهم (اختياري):</label>
                <div className="flex flex-wrap gap-1.5">
                  {SCHOLARS.map((scholar) => {
                    const isSelected = focusedScholars.includes(scholar.name);
                    return (
                      <button
                        key={scholar.id}
                        type="button"
                        onClick={() => toggleScholar(scholar.name)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all duration-150 cursor-pointer ${
                          isSelected 
                            ? "bg-[#b49650]/20 border-[#b49650] text-[#b49650] shadow-md accent-glow" 
                            : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/10"
                        }`}
                        title={`${scholar.title} - ${scholar.era}`}
                      >
                        {scholar.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Preferred Source Websites */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">تركيز البحث وتوجيه المراجع إلى:</label>
                <div className="flex flex-wrap gap-1.5">
                  {REFERENCE_SITES.map((site) => {
                    const isSelected = focusedWebsites.includes(site.domain);
                    return (
                      <button
                        key={site.id}
                        type="button"
                        onClick={() => toggleWebsite(site.domain)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-mono transition-all duration-150 cursor-pointer ${
                          isSelected 
                            ? "bg-[#b49650] border-[#b49650] text-black font-bold shadow-md" 
                            : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                        title={site.description}
                      >
                        {site.domain}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Formatting Depth */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">عمق ومنهجية الإجابة:</label>
                <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setStyleMode("detailed")}
                    className={`text-xs py-2 rounded-lg font-bold transition-all cursor-pointer ${
                      styleMode === "detailed"
                        ? "bg-[#b49650] text-black shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    أكاديمي مفصل بالدليل
                  </button>
                  <button
                    type="button"
                    onClick={() => setStyleMode("summary")}
                    className={`text-xs py-2 rounded-lg font-bold transition-all cursor-pointer ${
                      styleMode === "summary"
                        ? "bg-[#b49650] text-black shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    موجز ومبسط للعامة
                  </button>
                </div>
              </div>

            </div>

            {/* Presets and Library */}
            <div className="bg-[#080d12]/60 rounded-2xl border border-white/5 p-5 shadow-lg space-y-4 glass accent-glow">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#b49650]" />
                  <h2 className="text-base font-bold text-white">مكتبة الشبهات الشائعة</h2>
                </div>
                <span className="text-[11px] bg-[#b49650]/20 text-[#b49650] px-2 py-0.5 rounded-full font-bold border border-[#b49650]/30">٥ مسائل نموذجية</span>
              </div>
              <p className="text-xs text-slate-450">اختر مسألة نموذجية أدناه لتشهد آلية تفكيك الرد وتفنيده وفق محاور علمية معتمدة:</p>
              
              <div className="space-y-2.5">
                {PRELOADED_DOUBTS.map((doubt) => (
                  <button
                    key={doubt.id}
                    type="button"
                    onClick={() => {
                      setQuestion(doubt.question);
                      setSelectedCategory(doubt.category);
                      handleQuery(doubt.question);
                    }}
                    className="w-full text-right p-3 rounded-xl border border-white/5 hover:border-[#b49650]/30 hover:bg-[#b49650]/5 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold text-[#b49650] bg-[#b49650]/10 border border-[#b49650]/20 px-2 py-0.5 rounded-md">
                        {doubt.category}
                      </span>
                      <ChevronLeft className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#b49650] group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-200 group-hover:text-white line-clamp-1">{doubt.title}</h3>
                    <p className="text-[11px] text-slate-450 mt-1 line-clamp-1">{doubt.shortDesc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Durable bookmarks & saved items */}
            <div className="bg-[#080d12]/60 rounded-2xl border border-white/5 p-5 shadow-lg space-y-4 glass accent-glow">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-5 w-5 text-[#b49650]" />
                  <h2 className="text-base font-bold text-white">المحفوظات والردود المثبتة</h2>
                </div>
                <span className="text-xs bg-white/5 text-slate-400 px-2 py-0.5 rounded-full font-mono border border-white/5">{savedResponses.length}</span>
              </div>

              {savedResponses.length > 0 && (
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-[#b49650]" />
                  <input
                    type="text"
                    placeholder="ابحث في ردودك المحفوظة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-xs bg-black/40 border border-white/10 rounded-lg pr-9 pl-3 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#b49650] focus:border-[#b49650]"
                  />
                </div>
              )}

              {savedResponses.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <Info className="h-5 w-5 mx-auto mb-2 opacity-50 text-[#b49650]" />
                  لا توجد ردود محفوظة حالياً. انقر على زر التثبيت عند تلقي الإجابة لحفظها للاستخدام لاحقاً.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {filteredSaved.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-2.5 rounded-lg border border-white/5 hover:bg-white/5 flex items-center justify-between gap-3 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveQuestion(item.question);
                          setActiveResponse(item.response);
                          setActiveTab("evidence");
                        }}
                        className="text-right flex-1 min-w-0 cursor-pointer"
                      >
                        <h4 className="text-xs font-bold text-slate-200 truncate">{item.question}</h4>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{item.timestamp}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSavedResponse(item.id)}
                        className="text-slate-400 hover:text-red-400 p-1 rounded-md hover:bg-red-500/10 transition-colors"
                        title="حذف من المحفوظات"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {filteredSaved.length === 0 && (
                    <p className="text-center text-[11px] text-slate-400 py-2">لا توجد نتائج مطابقة لبحثك.</p>
                  )}
                </div>
              )}
            </div>

            {/* Quick history of the session */}
            {historyItems.length > 0 && (
              <div className="bg-[#080d12]/60 rounded-2xl border border-white/5 p-5 shadow-lg space-y-4 glass accent-glow">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-[#b49650]" />
                    <h2 className="text-base font-bold text-white">سجل البحث الأخير</h2>
                  </div>
                  <button 
                    type="button"
                    onClick={clearHistory}
                    className="text-[10px] text-red-400 hover:text-red-300 hover:underline cursor-pointer font-bold"
                  >
                    مسح السجل
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  {historyItems.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveQuestion(item.question);
                        setActiveResponse(item.response);
                        setActiveTab("evidence");
                      }}
                      className="w-full text-right p-2 rounded-lg hover:bg-white/5 block truncate text-slate-300 hover:text-white transition-all cursor-pointer"
                    >
                      • {item.question}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </section>

          {/* ================= RIGHT COLUMN: MAIN WORKSPACE ================= */}
          <section className="lg:col-span-8 space-y-6">
            
            {/* Elegant Input Search Panel */}
            <div className="bg-[#080d12]/60 rounded-3xl border border-white/5 p-6 lg:p-8 shadow-lg glass accent-glow relative overflow-hidden">
              <div className="absolute top-0 right-0 h-1.5 w-full bg-gradient-to-r from-[#b49650] to-[#8c7136]"></div>
              
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                <Search className="h-5.5 w-5.5 text-[#b49650]" />
                اطرح سؤالك أو الشبهة المراد تفنيدها
              </h2>
              <p className="text-xs text-slate-400 mb-4 font-medium">سيقوم المساعد بالرد المفصل المنسوب والموثق علمياً بالاستناد إلى الكتاب والسنة المطهرة وفهم السلف الصالح رضي الله عنهم:</p>

              <form onSubmit={(e) => { e.preventDefault(); handleQuery(question); }} className="space-y-4">
                <div className="relative">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="مثال: كيف نرد على دعوى تعارض أحاديث الآحاد مع العقل؟ أو: اكتب شبهة انتشار الإسلام بالسيف والرد التاريخي عليها..."
                    rows={4}
                    maxLength={1000}
                    className="w-full bg-black/40 border border-white/10 hover:border-white/20 rounded-2xl pr-4 pl-4 py-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#b49650]/20 focus:border-[#b49650] focus:bg-black/60 transition-all font-medium resize-y"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleQuery(question);
                      }
                    }}
                  />
                  <div className="absolute left-3.5 bottom-3.5 text-[10px] text-slate-500 font-mono">
                    {question.length} / 1000 حرف
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="text-slate-400 text-xs flex items-center gap-1.5 font-medium">
                    <Info className="h-4 w-4 text-[#b49650]" />
                    اضغط Enter للإرسال مباشرة، أو Shift+Enter لسطر جديد.
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className="bg-gradient-to-r from-[#b49650] to-[#8c7136] hover:brightness-110 disabled:bg-white/10 disabled:from-transparent disabled:to-transparent disabled:text-slate-500 text-black font-extrabold text-sm px-6 py-3 rounded-xl shadow-md shadow-[#b49650]/10 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed group min-w-[140px]"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        بحث وتحليل...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        تفنيد بالدليل
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

                           {/* Error Message if any */}
            {errorMsg && (
              <div className="bg-red-950/40 border border-red-500/30 text-red-200 px-5 py-4 rounded-2xl text-xs flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold mb-1">فشل معالجة الطلب</h4>
                  <p className="font-medium leading-relaxed">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* ================= ACTIVE RESPONSE DISPLAY OR INTRO STATE ================= */}
            <AnimatePresence mode="wait">
              {loading ? (
                /* Dynamic Loading Screen with Steps */
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#080d12]/60 rounded-3xl border border-white/5 p-8 text-center space-y-6 shadow-lg glass accent-glow"
                >
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-[#b49650]/10"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-[#b49650] border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-[#b49650] animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-2 max-w-md mx-auto">
                    <h3 className="text-base font-bold text-white">مستشار بصيرة يدرس المسألة حالياً...</h3>
                    <p className="text-xs text-slate-400 font-medium">الرجاء الانتظار، يتم فحص وتفنيد المسألة بدقة متناهية من بطون الكتب والمواقع المرجعية المعتمدة لتقديم إجابة محكمة ومسندة.</p>
                  </div>

                  {/* Staggered progress steps */}
                  <div className="max-w-sm mx-auto bg-black/30 rounded-xl p-4 border border-white/5 text-right space-y-3">
                    {loadingPhrases.map((phrase, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 text-xs">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                          loadingStage > idx 
                            ? "bg-[#b49650]/20 text-[#b49650]" 
                            : loadingStage === idx 
                              ? "bg-[#b49650] text-black animate-pulse" 
                              : "bg-white/10 text-slate-500"
                        }`}>
                          {loadingStage > idx ? "✓" : idx + 1}
                        </div>
                        <span className={`font-medium ${
                          loadingStage > idx 
                            ? "text-slate-500 line-through" 
                            : loadingStage === idx 
                              ? "text-[#b49650] font-bold" 
                              : "text-slate-500"
                        }`}>
                          {phrase}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : activeResponse ? (
                /* Main Interactive Scholarly Result Display */
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  
                  {/* Top Summary Banner */}
                  <div className="bg-[#080d12]/60 border border-white/5 rounded-3xl p-6 relative overflow-hidden glass accent-glow">
                    <div className="absolute -top-12 -left-12 h-24 w-24 bg-[#b49650]/5 rounded-full blur-xl"></div>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      
                      <div className="flex items-start gap-3.5">
                        <div className="h-10 w-10 bg-[#b49650] rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                          <ShieldCheck className="h-5.5 w-5.5 text-black" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#b49650]/20 text-[#b49650] border border-[#b49650]/30 tracking-wider">
                              تصنيف: {activeResponse.category}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">{activeResponse.categoryExplanation}</span>
                          </div>
                          <h3 className="text-base font-extrabold text-white mt-1">{activeQuestion}</h3>
                        </div>
                      </div>

                      {/* Header actions */}
                      <div className="flex items-center gap-2 self-stretch md:self-auto justify-end border-t border-white/5 md:border-t-0 pt-3 md:pt-0">
                        <button
                          type="button"
                          onClick={saveCurrentResponse}
                          className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-[#b49650] text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 font-bold transition-colors cursor-pointer"
                          title="حفظ الإجابة في المفضلة المحلية"
                        >
                          <Bookmark className="h-4 w-4" />
                          حفظ الرد
                        </button>
                        <button
                          type="button"
                          onClick={copyToClipboard}
                          className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-[#b49650] text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 font-bold transition-colors cursor-pointer"
                          title="نسخ النص بالكامل بصيغة منسقة"
                        >
                          {successCopy ? (
                            <>
                              <Check className="h-4 w-4 text-[#b49650]" />
                              <span className="text-[#b49650]">تم النسخ!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              نسخ النص
                            </>
                          )}
                        </button>
                      </div>

                    </div>

                    {/* Short Executive Summary (General Public) */}
                    <div className="mt-4 bg-black/40 border border-[#b49650]/20 rounded-2xl p-4 text-xs font-semibold leading-relaxed text-slate-200">
                      <span className="text-[#b49650] font-extrabold text-[13px] block mb-1 flex items-center gap-1">
                        💡 الخلاصة الميسرة لعامة الناس:
                      </span>
                      {activeResponse.summary}
                    </div>

                  </div>

                  {/* Scholarly Tabs */}
                  <div className="bg-[#080d12]/60 rounded-3xl border border-white/5 shadow-lg overflow-hidden glass accent-glow">
                    
                    {/* Tab List */}
                    <div className="flex border-b border-white/5 bg-black/40 overflow-x-auto">
                      <button
                        type="button"
                        onClick={() => setActiveTab("evidence")}
                        className={`px-5 py-4 text-xs font-bold transition-all border-b-2 cursor-pointer shrink-0 ${
                          activeTab === "evidence"
                            ? "border-[#b49650] text-[#b49650] bg-white/5"
                            : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        الرد العلمي والأدلة الشرعية
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("deconstruction")}
                        className={`px-5 py-4 text-xs font-bold transition-all border-b-2 cursor-pointer shrink-0 ${
                          activeTab === "deconstruction"
                            ? "border-[#b49650] text-[#b49650] bg-white/5"
                            : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        تفكيك وتفنيد أصل الشبهة
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("scholars")}
                        className={`px-5 py-4 text-xs font-bold transition-all border-b-2 cursor-pointer shrink-0 ${
                          activeTab === "scholars"
                            ? "border-[#b49650] text-[#b49650] bg-white/5"
                            : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        أقوال أئمة السلف والعلماء ({activeResponse.scholarsQuotes?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("websites")}
                        className={`px-5 py-4 text-xs font-bold transition-all border-b-2 cursor-pointer shrink-0 ${
                          activeTab === "websites"
                            ? "border-[#b49650] text-[#b49650] bg-white/5"
                            : "border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        مواقع الاستزادة والتخريج ({activeResponse.referenceWebsites?.length || 0})
                      </button>
                    </div>

                    {/* Tab Content Panels */}
                    <div className="p-6 lg:p-8">
                      <AnimatePresence mode="wait">
                        
                        {/* Tab 1: Scientific reply & scripture evidence */}
                        {activeTab === "evidence" && (
                          <motion.div
                            key="evidence"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-4"
                          >
                            <div className="flex items-center gap-2 mb-2 text-[#b49650]">
                              <BookOpen className="h-5 w-5" />
                              <h4 className="text-sm font-extrabold">البيان والتأصيل الشرعي بالدليل الأثري:</h4>
                            </div>
                            <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-line space-y-3 font-medium">
                              {formatTextWithVerses(activeResponse.scientificReply)}
                            </div>
                            
                            <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-[11px] text-slate-405 mt-6 font-medium leading-relaxed">
                              * ملاحطة منهجية: الآيات الكريمة المذكورة محاطة بأقواس مزخرفة <span className="text-[#b49650] font-bold font-serif">{`{}`}</span>، بينما الأحاديث والآثار النبوية الصحيحة محاطة بأقواس مستديرة <span className="text-[#b49650] font-serif">()</span> للتمييز. جميع المرويات معتمدة من كتب الصحاح والأثر المروي.
                            </div>
                          </motion.div>
                        )}

                        {/* Tab 2: Deconstruct the origin */}
                        {activeTab === "deconstruction" && (
                          <motion.div
                            key="deconstruction"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-4"
                          >
                            <div className="flex items-center gap-2 text-[#b49650]">
                              <AlertTriangle className="h-5 w-5 text-[#b49650]" />
                              <h4 className="text-sm font-extrabold">أصل وجذور الشبهة وتفكيك بطلانها:</h4>
                            </div>
                            <div className="p-5 rounded-2xl bg-black/30 border border-[#b49650]/15 text-slate-200 text-sm leading-relaxed whitespace-pre-line font-medium">
                              {activeResponse.doubtOrigin}
                            </div>
                          </motion.div>
                        )}

                        {/* Tab 3: Scholars quotes */}
                        {activeTab === "scholars" && (
                          <motion.div
                            key="scholars"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-4"
                          >
                            <div className="flex items-center gap-2 mb-2 text-white">
                              <FileText className="h-5 w-5 text-[#b49650]" />
                              <h4 className="text-sm font-extrabold">المرويات المعتمدة والنقول المستندة عن أئمة السلف والعلماء المعاصرين:</h4>
                            </div>
                            
                            {activeResponse.scholarsQuotes && activeResponse.scholarsQuotes.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeResponse.scholarsQuotes.map((sq, index) => (
                                  <div 
                                    key={index} 
                                    className="bg-black/40 p-5 rounded-2xl border border-white/5 relative flex flex-col justify-between"
                                  >
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                                        <span className="font-bold text-xs text-white">{sq.scholar}</span>
                                        <span className="text-[10px] bg-[#b49650]/20 text-[#b49650] border border-[#b49650]/30 font-bold px-2 py-0.5 rounded-sm">فتوى منسوبة</span>
                                      </div>
                                      <p className="font-serif text-[13px] leading-relaxed text-slate-300 italic">
                                        " {sq.quote} "
                                      </p>
                                    </div>
                                    {sq.source && (
                                      <div className="text-[10px] text-[#b49650] font-bold mt-4 pt-2 border-t border-white/5 flex items-center gap-1">
                                        <span>المرجع والمصدر الشرعي:</span>
                                        <span className="text-slate-400 underline font-medium">{sq.source}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-center text-xs text-slate-450 py-6">لم يتم العثور على اقتباسات معينة للأئمة المختارين، ننصح بمراجعة مواقع الاستزادة للتفصيل.</p>
                            )}
                          </motion.div>
                        )}

                        {/* Tab 4: Reference Websites */}
                        {activeTab === "websites" && (
                          <motion.div
                            key="websites"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-4"
                          >
                            <div className="flex items-center gap-2 mb-2 text-white">
                              <ExternalLink className="h-5 w-5 text-[#b49650]" />
                              <h4 className="text-sm font-extrabold">المواقع الخمسة الأساسية للتوجيه والاستزادة:</h4>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">ننصح بنسخ السؤال والبحث به مباشرة في هذه المنصات لمطالعة فتاوى الأعلام المتكاملة والمسجلة بخصوص هذه الشبهة:</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {activeResponse.referenceWebsites && activeResponse.referenceWebsites.map((web, index) => (
                                <a 
                                  key={index}
                                  href={`${web.url}/search?q=${encodeURIComponent(activeQuestion)}`}
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="p-4 rounded-xl border border-white/10 hover:border-[#b49650]/40 bg-black/40 hover:bg-[#b49650]/5 flex flex-col justify-between transition-all group text-right"
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                      <span className="font-extrabold text-xs text-slate-200 group-hover:text-white">{web.name}</span>
                                      <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-[#b49650]" />
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{web.relevance}</p>
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-mono block mt-3 group-hover:text-[#b49650] font-bold transition-colors">
                                    انقر للبحث المباشر في {web.name}
                                  </span>
                                </a>
                              ))}
                            </div>
                          </motion.div>
                        )}

                      </AnimatePresence>
                    </div>

                  </div>

                  {/* Suggested Follow up Questions */}
                  {activeResponse.suggestedFollowUps && activeResponse.suggestedFollowUps.length > 0 && (
                    <div className="bg-[#080d12]/60 rounded-2xl border border-white/5 p-5 shadow-lg space-y-3 glass accent-glow">
                      <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                        <MessageSquare className="h-4.5 w-4.5 text-[#b49650]" />
                        أسئلة استيضاحية ومتابعة شرعية مقترحة:
                      </h4>
                      <div className="flex flex-col gap-2">
                        {activeResponse.suggestedFollowUps.map((fu, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setQuestion(fu);
                              handleQuery(fu);
                            }}
                            className="w-full text-right text-xs p-3 rounded-xl bg-black/40 border border-white/5 text-slate-300 hover:text-white hover:bg-[#b49650]/5 hover:border-[#b49650]/30 transition-all cursor-pointer font-bold flex items-center justify-between gap-3 group"
                          >
                            <span>{fu}</span>
                            <ChevronLeft className="h-4 w-4 text-slate-500 group-hover:text-[#b49650] group-hover:translate-x-0.5 transition-transform shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div ref={responseEndRef} />
                </motion.div>
              ) : (
                /* Beautiful Scholar Introduction & Guide Welcome Screen */
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-[#080d12]/60 rounded-3xl border border-white/5 p-6 lg:p-10 shadow-lg space-y-8 relative overflow-hidden glass accent-glow"
                >
                  <div className="absolute top-0 left-0 w-32 h-32 bg-[#b49650]/5 rounded-full blur-2xl -z-10"></div>
                  
                  {/* Classical Islamic Quote Block */}
                  <div className="text-center space-y-3 max-w-xl mx-auto border-b border-white/5 pb-6">
                    <p className="font-serif text-lg lg:text-xl text-[#b49650] gold-text leading-relaxed font-bold">
                      {`{فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ}`}
                    </p>
                    <span className="text-[10px] text-slate-500 font-bold tracking-wider block">[سورة النحل: 43]</span>
                  </div>

                  {/* Intro Cards */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-extrabold text-white">عن منصة "بصيرة" للرد المنهجي على الشبهات:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                        <div className="h-8 w-8 bg-[#b49650]/15 rounded-lg flex items-center justify-center text-[#b49650]">
                          <ShieldCheck className="h-4.5 w-4.5" />
                        </div>
                        <h4 className="text-xs font-bold text-white">تأصيل أثري سلفي</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">الاستدلال المحكم بالقرآن الكريم والسنة النبوية الشريفة الصحيحة بفهم الصحابة وسلف الأمة.</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                        <div className="h-8 w-8 bg-[#b49650]/15 rounded-lg flex items-center justify-center text-[#b49650]">
                          <BookOpen className="h-4.5 w-4.5" />
                        </div>
                        <h4 className="text-xs font-bold text-white">مرجعية موثقة</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">تخريج المرويات والاستئناس بأدق الأجوبة الشرعية في مواقع الفتوى الموثقة الخمسة.</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                        <div className="h-8 w-8 bg-[#b49650]/15 rounded-lg flex items-center justify-center text-[#b49650]">
                          <Sparkles className="h-4.5 w-4.5" />
                        </div>
                        <h4 className="text-xs font-bold text-white">أسلوب هادئ رصين</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">تفنيد موضوعي هادئ يتجنب الجدال العقيم ومخاطبة العقل بكرامة ورفق علمي تام.</p>
                      </div>

                    </div>
                  </div>

                  {/* Methodological notice */}
                  <div className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-2.5">
                    <h4 className="text-xs font-bold text-[#b49650] flex items-center gap-1.5">
                      <Info className="h-4 w-4 text-[#b49650]" />
                      توجيهات وقواعد استخدام النظام:
                    </h4>
                    <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc list-inside font-medium leading-relaxed pr-1">
                      <li>تأكد من اختيار مجال الشبهة بدقة من الفلاتر الجانبية أو دع الكشف التلقائي يفعل ذلك.</li>
                      <li>تثبّت من نسبة الأقوال بدقة؛ لا ينسب النظام أي مرويات أو أحاديث دون تمحيص أثري.</li>
                      <li>الخلاصة الموجزة معدّة خصيصاً للمشاركة لتسهيل نشر العلم والوعي بين الناس.</li>
                    </ul>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#080d12]/80 border-t border-white/5 mt-20 py-8 px-4 lg:px-8 text-center text-slate-500 text-xs font-medium">
        <div className="max-w-7xl mx-auto space-y-3">
          <p>© {new Date().getFullYear()} بصيرة. جميع الحقوق الشرعية والعلمية محفوظة للأمة الإسلامية ونقل المنهج السلفي الأثري بأمانة.</p>
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500">
            <span>مدعوم بالقرآن والحديث الصحيح</span>
            <span>•</span>
            <span>بإشراف علمي منهجي تلقائي</span>
            <span>•</span>
            <span>المرجعيات الشرعية: islamqa | binbaz | dorar | alukah | islamweb</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
