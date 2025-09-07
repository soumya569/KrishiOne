import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Camera,
  CloudRain,
  Coins,
  Factory,
  Home,
  Landmark,
  Leaf,
  Menu,
  MessageCircle,
  ShieldCheck,
  Sun,
  Tractor,
  X,
} from "lucide-react";
import { detectDisease } from "./api";

/**
 * All-in-One Farmer Web Platform – Single-file React Frontend (cleaned)
 * - Minor fixes: forwarded Card props, safe id for file input, crypto fallback, removed exotic identifier
 * - Replace mocked services with real endpoints when integrating backend
 */

/**************************** Utility & Mock Services ****************************/

// INR formatter
const formatINR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// Safe ID generator (crypto.randomUUID fallback)
function genId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (e) {}
  return (
    "id-" +
    Math.random().toString(36).slice(2, 9) +
    "-" +
    Date.now().toString(36).slice(-5)
  );
}

// Backend disease detection wrapper with fallback
async function detectDiseaseWithBackend(file) {
  try {
    const r = await detectDisease(file);
    return { name: r.disease, remedy: r.remedy, confidence: r.confidence };
  } catch (e) {
    return { name: "Unavailable", remedy: "Backend not reachable.", confidence: 0 };
  }
}

// Mock: Mandi price stream + forecast. Replace with real Agmarknet/FCI.
function generateMockMandiData(crop = "Wheat") {
  const base = {
    Wheat: 2200,
    Rice: 2400,
    Maize: 1900,
    Tomato: 1200,
    Onion: 1400,
  }[crop] || 2000;
  const days = 14;
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const noise = Math.sin(i / 2) * 60 + (Math.random() - 0.5) * 80;
    out.push({ date: d.toLocaleDateString("en-GB"), price: Math.max(900, Math.round(base + noise)) });
  }
  return out;
}

// Mock: Weather API adapter. Replace with OpenWeatherMap current+forecast.
async function mockWeather(city) {
  await wait(600);
  const presets = {
    Delhi: { temp: 34, humidity: 48, wind: 10, rainNext48h: true },
    Mumbai: { temp: 30, humidity: 76, wind: 12, rainNext48h: true },
    Bhubaneswar: { temp: 31, humidity: 72, wind: 9, rainNext48h: false },
    Bengaluru: { temp: 27, humidity: 60, wind: 8, rainNext48h: false },
  };
  return presets[city] || { temp: 32, humidity: 55, wind: 11, rainNext48h: Math.random() > 0.5 };
}

// Simple wait
function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**************************** Shared UI Components ****************************/

const Badge = ({ children }) => (
  <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-medium ring-1 ring-emerald-200">
    {children}
  </span>
);

const Pill = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm bg-white">
    {Icon && <Icon className="w-4 h-4" />}
    <span>{text}</span>
  </div>
);

// Forward props so onClick / aria / test-id etc. can be passed
const Card = ({ children, className = "", ...props }) => (
  <div
    {...props}
    className={`rounded-2xl border bg-white/80 backdrop-blur p-5 shadow-sm ${className}`}
  >
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      {Icon && <Icon className="w-6 h-6 text-emerald-600" />}
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
  </div>
);

const TopNav = ({ current, onChange }) => {
  const items = [
    { key: "home", label: "Home", icon: Home },
    { key: "crop-doctor", label: "Crop Doctor", icon: Leaf },
    { key: "market", label: "Market Insights", icon: Coins },
    { key: "mandi", label: "Digital Mandi", icon: Factory },
    { key: "weather", label: "Weather Advisory", icon: Sun },
    { key: "chat", label: "Knowledge Hub", icon: MessageCircle },
    { key: "finance", label: "Finance Tools", icon: Landmark },
  ];
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tractor className="w-6 h-6 text-emerald-700" />
          <span className="font-semibold">KrishiOne</span>
        </div>
        <div className="hidden md:flex items-center gap-1">
          {items.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-emerald-50 ${current === key ? "bg-emerald-100 text-emerald-800" : "text-gray-700"}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
        <button className="md:hidden p-2" onClick={() => setOpen((v) => !v)}>
          <Menu />
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t">
          <div className="max-w-6xl mx-auto px-3 py-2 grid grid-cols-2 gap-2">
            {"home crop-doctor market mandi weather chat finance".split(" ").map((k) => (
              <button
                key={k}
                onClick={() => {
                  onChange(k);
                  setOpen(false);
                }}
                className={`px-3 py-2 rounded-xl text-sm text-left border ${current === k ? "bg-emerald-100 border-emerald-300" : "bg-white"}`}
              >
                {k.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Footer = () => (
  <div className="border-t mt-10">
    <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-gray-500 flex flex-col md:flex-row items-center justify-between">
      <div>© {new Date().getFullYear()} KrishiOne. Built for farmers with ❤️.</div>
      <div className="flex items-center gap-3 mt-2 md:mt-0">
        <Pill icon={ShieldCheck} text="Secure by design" />
        <Pill icon={CloudRain} text="Weather-aware" />
        <Pill icon={Coins} text="Market-smart" />
      </div>
    </div>
  </div>
);

/**************************** Pages ****************************/

function HomePage({ go }) {
  const moduleCards = [
    {
      title: "Crop Doctor",
      desc: "Upload a crop image and get instant disease detection with remedies.",
      icon: Camera,
      action: () => go("crop-doctor"),
      badge: "AI Vision",
    },
    {
      title: "Market Insights",
      desc: "Live mandi prices and ML-based price forecasts for major crops.",
      icon: Coins,
      action: () => go("market"),
      badge: "Forecasts",
    },
    {
      title: "Digital Mandi",
      desc: "List your produce and connect directly with buyers.",
      icon: Factory,
      action: () => go("mandi"),
      badge: "Marketplace",
    },
    {
      title: "Weather Advisory",
      desc: "Weather alerts with crop-specific actionable advice.",
      icon: Sun,
      action: () => go("weather"),
      badge: "Alerts",
    },
    {
      title: "Knowledge Hub",
      desc: "Chatbot for techniques, schemes, fertilizers—all in simple language.",
      icon: MessageCircle,
      action: () => go("chat"),
      badge: "AI Chat",
    },
    {
      title: "Finance Tools",
      desc: "Loan EMI, yield estimates, and subsidy finder.",
      icon: Landmark,
      action: () => go("finance"),
      badge: "Calculators",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 text-sm ring-1 ring-emerald-200">
            <Leaf className="w-4 h-4" /> One-stop platform for farmers
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mt-4 leading-tight">
            Solve multiple farm problems from a single, simple website
          </h1>
          <p className="text-gray-600 mt-3">
            Built for a 36-hour hackathon: fast, practical, and scalable. Add APIs and models later—UI is ready today.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge>Mobile-first</Badge>
            <Badge>Local language ready</Badge>
            <Badge>Offline-friendly (PWA optional)</Badge>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => go("crop-doctor")} className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">Try Crop Doctor</button>
            <button onClick={() => go("market")} className="px-4 py-2 rounded-xl border hover:bg-emerald-50">View Prices</button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {moduleCards.map((m, i) => (
            <Card key={i} className="hover:shadow-md transition cursor-pointer" onClick={m.action}>
              <div className="flex items-start gap-3">
                <div className="rounded-xl p-2 bg-emerald-50 text-emerald-700"><m.icon className="w-5 h-5" /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{m.title}</h3>
                    <Badge>{m.badge}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{m.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function CropDoctorPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputId = useMemo(() => `crop-file-${Math.random().toString(36).slice(2, 9)}`, []);

  const onFile = async (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setLoading(true);
    const res = await detectDiseaseWithBackend(f);
    setResult(res);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <SectionTitle icon={Leaf} title="Crop Doctor" subtitle="AI disease detection (mocked locally for demo)" />
      <Card>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-1/2">
            <label className="block text-sm font-medium mb-2">Upload crop image</label>
            <div className="border-2 border-dashed rounded-2xl p-6 text-center">
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="preview" className="rounded-xl max-h-72 mx-auto object-contain" />
                  <button className="absolute -top-3 -right-3 bg-white border rounded-full p-1" onClick={() => { setPreview(""); setFile(null); setResult(null); }}><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div>
                  <Camera className="w-8 h-8 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">Drag & drop or click to upload</p>
                </div>
              )}
              <input id={fileInputId} type="file" accept="image/*" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
              <label htmlFor={fileInputId} className="inline-block mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700">Choose Image</label>
            </div>
          </div>
          <div className="md:w-1/2">
            <label className="block text-sm font-medium mb-2">Result</label>
            <div className="rounded-2xl border p-4 min-h-[13rem]">
              {loading && <p className="animate-pulse">Analyzing image…</p>}
              {!loading && result && (
                <div>
                  <h4 className="text-xl font-semibold">{result.name}</h4>
                  <p className="text-gray-600 mt-2">{result.remedy}</p>
                  <div className="mt-4 text-sm text-gray-500">Disclaimer: Demo uses a mocked model. Connect your CNN endpoint to go live.</div>
                </div>
              )}
              {!loading && !result && <p className="text-gray-500">Upload an image to get diagnosis & remedy.</p>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MarketInsightsPage() {
  const [crop, setCrop] = useState("Wheat");
  const data = useMemo(() => generateMockMandiData(crop), [crop]);
  const latest = data[data.length - 1]?.price || 0;

  const crops = ["Wheat", "Rice", "Maize", "Tomato", "Onion"];

  return (
    <div className="max-w-5xl mx-auto px-4">
      <SectionTitle icon={Coins} title="Market Insights" subtitle="Live prices & ML forecast (mocked)" />
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <label className="text-sm">Crop:</label>
              <select value={crop} onChange={(e) => setCrop(e.target.value)} className="border rounded-xl px-3 py-2 text-sm">
                {crops.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <Pill icon={Coins} text={`Current: ${formatINR.format(latest)}/quintal`} />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-15} height={40} textAnchor="end" />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${formatINR.format(v)}/qtl`} />
                <Line type="monotone" dataKey="price" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h4 className="font-semibold">Top Mandis (mock)</h4>
          <div className="mt-3 space-y-2">
            {["Azadpur (Delhi)", "Cuttack (Odisha)", "Lasalgaon (Nashik)", "K R Market (Bengaluru)"].map((mkt, i) => (
              <div key={i} className="flex items-center justify-between border rounded-xl px-3 py-2">
                <span>{mkt}</span>
                <span className="font-semibold">{formatINR.format(latest + (i - 1) * 50)}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-3">Replace with Agmarknet API table.</div>
        </Card>
      </div>
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <Card>
          <h4 className="font-semibold">Sell Now / Hold?</h4>
          <p className="text-sm text-gray-600 mt-1">Heuristic decision based on trend.</p>
          <DecisionMeter series={data.map((d) => d.price)} />
        </Card>
        <Card>
          <h4 className="font-semibold">Price Distribution (14 days)</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip formatter={(v) => `${formatINR.format(v)}/qtl`} />
                <Bar dataKey="price" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h4 className="font-semibold">Tips</h4>
          <ul className="list-disc pl-5 text-sm text-gray-700 mt-2 space-y-1">
            <li>Compare nearby mandis; logistics can change profit by 5–10%.</li>
            <li>For perishables, prefer quick turnover over minor price gains.</li>
            <li>Use quality grading to reach better price slabs.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function DecisionMeter({ series = [] }) {
  const trend = useMemo(() => {
    if (series.length < 4) return 0;
    const last = series.slice(-4);
    return Math.sign(last[3] - last[0]); // -1 down, 0 flat, +1 up
  }, [series]);

  const text = trend > 0 ? "Hold (Uptrend)" : trend < 0 ? "Sell Soon (Downtrend)" : "Neutral";

  return (
    <div className="mt-3">
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-3 ${trend > 0 ? "bg-emerald-500 w-3/4" : trend < 0 ? "bg-amber-500 w-2/5" : "bg-gray-300 w-1/2"}`} />
      </div>
      <div className="text-sm mt-2 text-gray-700">{text}</div>
      <div className="text-xs text-gray-500">Demo heuristic. Replace with ML classifier (e.g., LSTM/Prophet).</div>
    </div>
  );
}

function DigitalMandiPage() {
  const [items, setItems] = useLocalStorage("mandi-items", []);
  const initial = { crop: "Tomato", qty: 10, price: 1500, location: "Bhubaneswar", contact: "9999999999" };
  const [form, setForm] = useState(initial);

  const addItem = () => {
    if (!form.crop || !form.location || !form.contact) return;
    const next = [...items, { id: genId(), ts: Date.now(), ...form }];
    setItems(next);
    setForm(initial);
  };
  const remove = (id) => setItems(items.filter((i) => i.id !== id));

  return (
    <div className="max-w-6xl mx-auto px-4">
      <SectionTitle icon={Factory} title="Digital Mandi" subtitle="List produce & connect directly with buyers" />
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="md:col-span-2">
          <h4 className="font-semibold">List Your Produce</h4>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="col-span-2">
              <label className="text-xs">Crop</label>
              <input value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })} className="w-full border rounded-xl px-3 py-2" />
            </div>
            <div>
              <label className="text-xs">Quantity (qtl)</label>
              <input type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: +e.target.value })} className="w-full border rounded-xl px-3 py-2" />
            </div>
            <div>
              <label className="text-xs">Expected Price / qtl</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} className="w-full border rounded-xl px-3 py-2" />
            </div>
            <div>
              <label className="text-xs">Location</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full border rounded-xl px-3 py-2" />
            </div>
            <div>
              <label className="text-xs">Contact</label>
              <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="w-full border rounded-xl px-3 py-2" />
            </div>
          </div>
          <button onClick={addItem} className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">Post Listing</button>
          <div className="text-xs text-gray-500 mt-2">Tip: Use WhatsApp/phone for direct negotiation.</div>
        </Card>
        <Card className="md:col-span-3">
          <h4 className="font-semibold">Browse Listings</h4>
          {items.length === 0 && <p className="text-sm text-gray-500 mt-2">No listings yet. Add one from the form.</p>}
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            {items.map((it) => (
              <div key={it.id} className="border rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{it.crop}</div>
                  <button onClick={() => remove(it.id)} className="text-xs text-gray-500 hover:text-red-600">Remove</button>
                </div>
                <div className="text-sm text-gray-700 mt-1">{it.qty} qtl • {formatINR.format(it.price)}/qtl</div>
                <div className="text-sm text-gray-500">{it.location}</div>
                <a href={`tel:${it.contact}`} className="inline-block mt-2 text-emerald-700 text-sm underline">Call: {it.contact}</a>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function WeatherAdvisoryPage() {
  const [city, setCity] = useState("Bhubaneswar");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchWeather = async () => {
    setLoading(true);
    const res = await mockWeather(city);
    setData(res);
    setLoading(false);
  };

  useEffect(() => {
    fetchWeather(); /* auto-load */
  }, []);

  const advice = useMemo(() => {
    if (!data) return [];
    const arr = [];
    if (data.rainNext48h) arr.push("Heavy rain likely: avoid pesticide/fertilizer spray for 48h.");
    if (data.humidity > 70) arr.push("High humidity: monitor for fungal disease; ensure field ventilation.");
    if (data.wind > 12) arr.push("Windy conditions: stake tall crops to prevent lodging.");
    if (arr.length === 0) arr.push("Conditions stable. Proceed with routine irrigation and weeding.");
    return arr;
  }, [data]);

  return (
    <div className="max-w-4xl mx-auto px-4">
      <SectionTitle icon={Sun} title="Weather Advisory" subtitle="API-driven local weather + rule-based tips" />
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs">City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className="border rounded-xl px-3 py-2" />
          </div>
          <button onClick={fetchWeather} className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">Update</button>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <Card>
            <div className="text-sm text-gray-500">Temperature</div>
            <div className="text-2xl font-semibold">{loading ? "…" : `${data?.temp ?? "-"}°C`}</div>
          </Card>
          <Card>
            <div className="text-sm text-gray-500">Humidity</div>
            <div className="text-2xl font-semibold">{loading ? "…" : `${data?.humidity ?? "-"}%`}</div>
          </Card>
          <Card>
            <div className="text-sm text-gray-500">Wind</div>
            <div className="text-2xl font-semibold">{loading ? "…" : `${data?.wind ?? "-"} km/h`}</div>
          </Card>
        </div>
        <div className="mt-4">
          <h4 className="font-semibold">Advisory</h4>
          <ul className="list-disc pl-5 text-sm text-gray-700 mt-2 space-y-1">
            {advice.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
          <div className="text-xs text-gray-500 mt-2">Replace with OpenWeatherMap 5-day forecast + crop-specific rules.</div>
        </div>
      </Card>
    </div>
  );
}

function KnowledgeHubPage() {
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState([{ role: "assistant", text: "Namaste! Ask me about farming techniques, schemes, or fertilizers." }]);

  const reply = async () => {
    if (!q.trim()) return;
    const userMsg = { role: "user", text: q };
    setMsgs((m) => [...m, userMsg]);
    setQ("");
    await wait(400);
    // very lightweight rule-based helper + generic response
    const a = smallExpert(q) || "Thanks! This is a demo chatbot. In production, connect to your LLM endpoint (OpenAI/HF) for rich answers in local languages.";
    setMsgs((m) => [...m, { role: "assistant", text: a }]);
  };

  return (
    <div className="max-w-3xl mx-auto px-4">
      <SectionTitle icon={MessageCircle} title="Knowledge Hub" subtitle="Light chatbot (plug your LLM here)" />
      <Card>
        <div className="h-72 overflow-y-auto space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={`max-w-[85%] ${m.role === "assistant" ? "bg-emerald-50" : "bg-gray-100 ml-auto"} rounded-xl px-3 py-2 text-sm`}>{m.text}</div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && reply()} placeholder="Type your question… (Hindi/Odia/English)" className="flex-1 border rounded-xl px-3 py-2" />
          <button onClick={reply} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">Send</button>
        </div>
        <div className="text-xs text-gray-500 mt-2">LLM hook: call your backend /chat endpoint and append response here.</div>
      </Card>
    </div>
  );
}

function smallExpert(text) {
  const t = text.toLowerCase();
  if (t.includes("wheat") && t.includes("fertilizer")) return "For wheat: apply 120:60:40 NPK per acre split into 3 doses; avoid urea before expected rain.";
  if (t.includes("pm kisan") || t.includes("scheme")) return "PM-KISAN provides ₹6,000/year in three installments. Check eligibility on the official portal; link Aadhaar to bank account.";
  if (t.includes("pesticide") && t.includes("spray")) return "Spray in early mornings/evenings, avoid windy/rainy hours, follow label dose, and use PPE (mask, gloves).";
  if (t.includes("onion") && t.includes("storage")) return "Cure onions 10–15 days in shade, store in well-ventilated crates at 25–30°C to reduce rotting.";
  return "";
}

function FinanceToolsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4">
      <SectionTitle icon={Landmark} title="Finance Tools" subtitle="EMI, Yield, Subsidies" />
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <h4 className="font-semibold">Loan EMI</h4>
          <EMICalc />
        </Card>
        <Card>
          <h4 className="font-semibold">Yield Estimate</h4>
          <YieldCalc />
        </Card>
        <Card>
          <h4 className="font-semibold">Subsidy Finder (demo)</h4>
          <SubsidyList />
        </Card>
      </div>
    </div>
  );
}

function EMICalc() {
  const [P, setP] = useState(100000);
  const [r, setR] = useState(10); // annual %
  const [n, setN] = useState(24); // months
  const m = r / 12 / 100;
  const emi = m === 0 ? P / n : P * m * Math.pow(1 + m, n) / (Math.pow(1 + m, n) - 1);
  const total = emi * n;
  const interest = total - P;
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <label className="text-xs">Principal (₹)</label>
          <input type="number" value={P} onChange={(e) => setP(+e.target.value)} className="w-full border rounded-xl px-3 py-2" />
        </div>
        <div>
          <label className="text-xs">Rate (% p.a.)</label>
          <input type="number" value={r} onChange={(e) => setR(+e.target.value)} className="w-full border rounded-xl px-3 py-2" />
        </div>
        <div>
          <label className="text-xs">Tenure (months)</label>
          <input type="number" value={n} onChange={(e) => setN(+e.target.value)} className="w-full border rounded-xl px-3 py-2" />
        </div>
      </div>
      <div className="mt-3 text-sm">
        <div className="flex justify-between"><span>EMI</span><span className="font-semibold">{formatINR.format(Math.round(emi))}</span></div>
        <div className="flex justify-between"><span>Total Interest</span><span>{formatINR.format(Math.round(interest))}</span></div>
        <div className="flex justify-between"><span>Total Payment</span><span>{formatINR.format(Math.round(total))}</span></div>
      </div>
    </div>
  );
}

function YieldCalc() {
  const [area, setArea] = useState(1); // acre
  const [crop, setCrop] = useState("Wheat");
  const baseYield = { Wheat: 18, Rice: 22, Maize: 20, Tomato: 80, Onion: 100 }; // qtl/acre demo
  const [factor, setFactor] = useState(1);
  const yieldQtl = baseYield[crop] * area * factor;
  const revenue = yieldQtl * 2000; // simple ₹/qtl assumption
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <label className="text-xs">Area (acre)</label>
          <input type="number" value={area} onChange={(e) => setArea(+e.target.value)} className="w-full border rounded-xl px-3 py-2" />
        </div>
        <div>
          <label className="text-xs">Crop</label>
          <select value={crop} onChange={(e) => setCrop(e.target.value)} className="w-full border rounded-xl px-3 py-2">
            {Object.keys(baseYield).map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs">Practice Factor</label>
          <select value={factor} onChange={(e) => setFactor(+e.target.value)} className="w-full border rounded-xl px-3 py-2">
            <option value={0.9}>Basic (0.9×)</option>
            <option value={1.0}>Standard (1.0×)</option>
            <option value={1.1}>Improved (1.1×)</option>
          </select>
        </div>
      </div>
      <div className="mt-3 text-sm">
        <div className="flex justify-between"><span>Expected Yield</span><span className="font-semibold">{yieldQtl.toFixed(1)} qtl</span></div>
        <div className="flex justify-between"><span>Approx. Revenue</span><span>{formatINR.format(Math.round(revenue))}</span></div>
      </div>
    </div>
  );
}

function SubsidyList() {
  const items = [
    { name: "PM-KISAN Income Support", type: "Income", benefit: "₹6,000/year", target: "Small/Marginal Farmers" },
    { name: "PMFBY Crop Insurance", type: "Insurance", benefit: "Low premium for crops", target: "All Farmers" },
    { name: "KCC (Kisan Credit Card)", type: "Credit", benefit: "Short-term credit @ ~4%", target: "All Farmers" },
    { name: "Solar Pump Subsidy", type: "Irrigation", benefit: "Up to 60% subsidy", target: "Eligible applicants" },
  ];
  return (
    <div className="mt-2 space-y-2">
      {items.map((it, i) => (
        <div key={i} className="border rounded-xl px-3 py-2">
          <div className="font-semibold text-sm">{it.name}</div>
          <div className="text-xs text-gray-600">{it.type} • {it.target}</div>
          <div className="text-sm mt-1">Benefit: {it.benefit}</div>
        </div>
      ))}
      <div className="text-xs text-gray-500">Connect to official APIs/DB later for state-wise filters.</div>
    </div>
  );
}

/**************************** Hooks ****************************/
function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch (e) {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {}
  }, [key, state]);
  return [state, setState];
}

/**************************** App ****************************/

export default function App() {
  const [tab, setTab] = useState("home");
  useEffect(() => {
    // Restore last tab
    const t = sessionStorage.getItem("tab");
    if (t) setTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem("tab", tab);
    } catch (e) {}
  }, [tab]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <TopNav current={tab} onChange={setTab} />
      <main className="py-6">
        {tab === "home" && <HomePage go={setTab} />}
        {tab === "crop-doctor" && <CropDoctorPage />}
        {tab === "market" && <MarketInsightsPage />}
        {tab === "mandi" && <DigitalMandiPage />}
        {tab === "weather" && <WeatherAdvisoryPage />}
        {tab === "chat" && <KnowledgeHubPage />}
        {tab === "finance" && <FinanceToolsPage />}
      </main>
      <Footer />
    </div>
  );
}

/**************************** Integration Notes ****************************/
/**
 * - This file is intended as src/App.jsx inside a Vite + React + Tailwind project.
 * - Ensure packages are installed: react, react-dom, recharts, lucide-react, tailwindcss + postcss + autoprefixer (Tailwind configured).
 * - Replace mock* functions with real API calls when wiring backend.
 */
