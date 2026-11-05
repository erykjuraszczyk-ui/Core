import { type FormEvent, useEffect, useRef, useState } from "react";
import HologramScene from "./components/HologramScene";
import { streamAgentReply, type AgentMessage } from "./lib/agent";
import { createSpeechRecognition, speakText, stopSpeaking, type CortanaSpeechRecognition } from "./lib/voice";

type Message = {
  id: number;
  role: "user" | "cortana";
  text: string;
  time: string;
};

const initialMessages: Message[] = [{
  id: 1,
  role: "cortana",
  text: "Interfejs CORTANA CORE został uruchomiony. Jestem w trybie demonstracyjnym — model AI i pamięć nie zostały jeszcze podłączone.",
  time: "SYSTEM",
}];

const modules = [
  { name: "Holographic Body", detail: "Renderer 3D", state: "ACTIVE" },
  { name: "Sensory Input", detail: "Oczekiwanie na zgodę", state: "LOCKED" },
  { name: "Emotional Engine", detail: "Model stanów", state: "LOCAL MODEL" },
  { name: "Long-Term Memory", detail: "Magazyn niepodłączony", state: "OFFLINE" },
  { name: "Learning Loop", detail: "Zatwierdzony feedback", state: "OBSERVE" },
  { name: "Self-Programming", detail: "Zmiany wymagają przeglądu", state: "GUARDED" },
];

function formatTime(): string {
  return new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

export default function App() {
  const [sessionActive, setSessionActive] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(true);
  const [voiceNotice, setVoiceNotice] = useState("GŁOS GOTOWY");
  const recognitionRef = useRef<CortanaSpeechRecognition | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((response) => {
        if (!response.ok) throw new Error("Health endpoint unavailable");
        return response.json() as Promise<{ status?: string }>;
      })
      .then((data) => { if (!cancelled) setApiStatus(data.status === "ok" ? "online" : "offline"); })
      .catch(() => { if (!cancelled) setApiStatus("offline"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  function startListening() {
    const recognition = createSpeechRecognition();
    if (!recognition) {
      setVoiceNotice("BRAK OBSŁUGI ROZPOZNAWANIA MOWY");
      return;
    }
    let finalTranscript = "";
    recognition.onstart = () => {
      setIsListening(true);
      setVoiceNotice("NASŁUCH AKTYWNY · PL-PL");
    };
    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript || "";
        if (result?.isFinal) finalTranscript += transcript;
        else interim += transcript;
      }
      setDraft((finalTranscript + interim).trim());
    };
    recognition.onerror = (event) => {
      setVoiceNotice(event.error === "not-allowed" ? "BRAK ZGODY NA MIKROFON" : "BŁĄD MIKROFONU");
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      setVoiceNotice(finalTranscript.trim() ? "TEKST ROZPOZNANY · NACIŚNIJ WYŚLIJ" : "GŁOS GOTOWY");
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setVoiceNotice("NIE MOŻNA URUCHOMIĆ MIKROFONU");
      recognitionRef.current = null;
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  function stopVoice() {
    abortControllerRef.current?.abort();
    stopSpeaking();
    recognitionRef.current?.abort();
    setIsListening(false);
    setVoiceNotice("GŁOS ZATRZYMANY");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;

    const now = Date.now();
    const history: AgentMessage[] = [
      ...messages.filter((message) => message.role !== "cortana" || message.time !== "SYSTEM")
        .map((message) => ({ role: message.role === "user" ? "user" as const : "assistant" as const, content: message.text })),
      { role: "user", content: text },
    ];
    const assistantId = now + 1;
    setMessages((current) => [
      ...current,
      { id: now, role: "user", text, time: formatTime() },
      { id: assistantId, role: "cortana", text: "", time: "AI · STREAM" },
    ]);
    setDraft("");
    setIsSending(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let assistantText = "";
    try {
      await streamAgentReply(history, {
        signal: controller.signal,
        onToken: (token) => {
          assistantText += token;
          setMessages((current) => current.map((message) =>
            message.id === assistantId ? { ...message, text: message.text + token } : message
          ));
        },
      });
      if (voiceOutput && assistantText) speakText(assistantText);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nieznany błąd połączenia.";
      setMessages((current) => current.map((item) =>
        item.id === assistantId ? { ...item, text: item.text ? item.text + "\\n\\n[Połączenie przerwane] " + message : message, time: "ERROR" } : item
      ));
    } finally {
      abortControllerRef.current = null;
      setIsSending(false);
    }
  }

  const apiLabel = apiStatus === "online" ? "API ONLINE" : apiStatus === "checking" ? "API CHECK" : "API OFFLINE";

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="CORTANA CORE — strona główna">
          <span className="brand-mark">C</span>
          <span className="brand-copy"><strong>CORTANA</strong><small>CORE SYSTEM / 0.3.0</small></span>
        </a>
        <div className="topbar-center"><span className="live-dot" /> HOLOGRAPHIC RUNTIME</div>
        <div className="topbar-right">
          <span className={`api-pill api-${apiStatus}`}><span className="mini-dot" />{apiLabel}</span>
          <span className="version-tag">BUILD 001</span>
        </div>
      </header>

      <section className="hero-grid" id="top">
        <div className="hero-copy">
          <p className="eyebrow">BROWSER-FIRST INTELLIGENCE PLATFORM</p>
          <h1>Więcej niż<br /><span>interfejs.</span></h1>
          <p className="hero-description">Jedna przestrzeń dla hologramu 3D, percepcji, pamięci i kontrolowanej ewolucji systemu.</p>
          <div className="hero-actions">
            <button className={`primary-button ${sessionActive ? "is-active" : ""}`} onClick={() => setSessionActive((active) => !active)}>
              <span className="button-orb" />{sessionActive ? "ZAKOŃCZ SESJĘ" : "AKTYWUJ SESJĘ"}
            </button>
            <span className="action-note">VOICE CORE · PL-PL · STREAMING SSE</span>
          </div>
        </div>

        <div className="hologram-stage">
          <div className="stage-corner corner-tl" /><div className="stage-corner corner-tr" />
          <div className="stage-corner corner-bl" /><div className="stage-corner corner-br" />
          <div className="stage-label stage-label-top"><span>FIG. 01</span><span>HOLOGRAPHIC BODY</span></div>
          <HologramScene />
          <div className="stage-core-caption"><span className="caption-line" /><span>CORTANA / CORE ENTITY</span><span className="caption-line" /></div>
          <div className="stage-label stage-label-bottom"><span>RENDER: WEBGL</span><span>SYNC: LOCAL</span></div>
        </div>

        <aside className="identity-panel">
          <div className="panel-heading"><span className="eyebrow">SYSTEM IDENTITY</span><span className="panel-index">01 / 06</span></div>
          <div className="identity-title"><h2>CORTANA</h2><span className="identity-subtitle">Adaptive digital agent</span></div>
          <p className="identity-text">System rozwijany modułowo. Jego możliwości wynikają z podłączonych modeli, danych, uprawnień i przetestowanych komponentów.</p>
          <div className="identity-divider" />
          <div className="identity-meta">
            <div><span>PERSONALITY CORE</span><strong>DEFINED</strong></div>
            <div><span>MEMORY CORE</span><strong className="muted-value">NOT CONNECTED</strong></div>
            <div><span>EVOLUTION MODE</span><strong>GOVERNED</strong></div>
          </div>
          <div className="identity-footer"><span className="signal-bars"><i /><i /><i /><i /><i /></span><span>CORE INTEGRITY NOMINAL</span></div>
        </aside>
      </section>

      <section className="lower-grid">
        <section className="modules-panel panel">
          <div className="section-heading">
            <div><p className="eyebrow">ARCHITECTURE / LIVE MAP</p><h2>Rdzeń systemu</h2></div>
            <span className="panel-index">06 MODULES</span>
          </div>
          <div className="module-list">
            {modules.map((module, index) => (
              <div className="module-row" key={module.name}>
                <span className="module-number">0{index + 1}</span>
                <div className="module-copy"><strong>{module.name}</strong><small>{module.detail}</small></div>
                <span className={`module-state state-${module.state.toLowerCase().replaceAll(" ", "-")}`}><i />{module.state}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="conversation-panel panel">
          <div className="section-heading">
            <div><p className="eyebrow">COMMUNICATION CHANNEL</p><h2>Interfejs rozmowy</h2></div>
            <span className="channel-status"><i /> {isListening ? "LISTENING" : isSending ? "STREAMING" : apiStatus === "online" ? "API READY" : "API CHECK"}</span>
          </div>
          <div className="message-list" aria-live="polite">
            {messages.map((message) => (
              <article className={`message message-${message.role}`} key={message.id}>
                <div className="message-meta"><strong>{message.role === "user" ? "TY" : "CORTANA"}</strong><span>{message.time}</span></div>
                <p>{message.text}</p>
              </article>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="voice-toolbar" aria-label="Sterowanie głosem">
            <button type="button" className={`voice-button ${isListening ? "voice-active" : ""}`} onClick={isListening ? stopListening : startListening} aria-pressed={isListening}>{isListening ? "■ ZATRZYMAJ NASŁUCH" : "◉ MÓW DO CORTANY"}</button>
            <button type="button" className={`voice-button ${voiceOutput ? "voice-selected" : ""}`} onClick={() => { setVoiceOutput((enabled) => !enabled); stopSpeaking(); }} aria-pressed={voiceOutput}>GŁOS {voiceOutput ? "WŁ." : "WYŁ."}</button>
            <button type="button" className="voice-button voice-stop" onClick={stopVoice} disabled={!isSending && !isListening}>STOP</button>
          </div>
          <div className="voice-notice" role="status">{voiceNotice} · ROZPOZNAWANIE WYKONUJE PRZEGLĄDARKA</div>\n          <form className="composer" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="message-input">Wiadomość do CORTANY</label>
            <input id="message-input" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Napisz do CORTANY..." maxLength={4000} />
            <button type="submit" aria-label="Wyślij wiadomość" disabled={!draft.trim() || isSending}><span>↗</span></button>
          </form>
          <div className="composer-note">ROZMOWA AI · MIKROFON URUCHAMIASZ RĘCZNIE · PAMIĘĆ TRWAŁA WYŁĄCZONA</div>
        </section>
      </section>

      <footer className="footer"><span>© CORTANA CORE / 2026</span><span>BUILDING THE NEXT LAYER OF INTERACTION</span><span>SAFETY · PRIVACY · EVOLUTION</span></footer>
    </main>
  );
}
