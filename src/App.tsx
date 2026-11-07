import { type FormEvent, useEffect, useRef, useState } from "react";
import HologramScene from "./components/HologramScene";
import { streamAgentReply, type AgentMessage } from "./lib/agent";
import { createSpeechRecognition, speakText, stopSpeaking, type CortanaSpeechRecognition } from "./lib/voice";
import { clearMemoryToken, deleteMemory, initializeMemory, listMemories, readMemoryToken, saveMemory, storeMemoryToken, type MemoryEntry, updateMemory } from "./lib/memory";
import { classifyInteraction, readPersonality, savePersonality, type CortanaMood, type PersonalityStyle } from "./lib/emotion";
import { clearFeedback, getLearningInsight, readFeedback, saveFeedback, type FeedbackRecord, type FeedbackRating } from "./lib/learning";
import { clearProposals, createProposal, readProposals, transitionProposal, validateProposal, type ChangeProposal } from "./lib/change-governance";
import { clearCodeArtifacts, createCodeArtifact, readCodeArtifacts, saveCodeArtifact, type CodeArtifact } from "./lib/sandbox";

type Message = {
  id: number;
  role: "user" | "cortana";
  text: string;
  time: string;
  feedbackStyle?: PersonalityStyle;
};

const initialMessages: Message[] = [{
  id: 1,
  role: "cortana",
  text: "CORTANA CORE v0.9.1 uruchomiona. Kanał tekstowy łączy się z serwerowym modelem AI; Voice Core korzysta z API przeglądarki, jeśli jest dostępne. Pamięć trwała jest opcjonalna i domyślnie wyłączona.",
  time: "SYSTEM",
}];

const modules = [
  { name: "Holographic Body", detail: "Renderer 3D", state: "ACTIVE" },
  { name: "Sensory Input", detail: "Ręczne uruchomienie mikrofonu", state: "LOCKED" },
  { name: "Voice Core", detail: "Speech Recognition + Synthesis", state: "BROWSER API" },
  { name: "Emotional Engine", detail: "Model stanów", state: "LOCAL MODEL" },
  { name: "Long-Term Memory", detail: "D1 · zapis zatwierdzony przez użytkownika", state: "OPT-IN" },
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState("GŁOS GOTOWY");
  const recognitionRef = useRef<CortanaSpeechRecognition | null>(null);
  const [memoryToken, setMemoryToken] = useState<string | null>(null);
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [memoryDraft, setMemoryDraft] = useState("");
  const [memoryKind, setMemoryKind] = useState<"semantic" | "episode">("semantic");
  const [memoryEditingId, setMemoryEditingId] = useState<string | null>(null);
  const [memoryNotice, setMemoryNotice] = useState("PAMIĘĆ WYŁĄCZONA");
  const [personality, setPersonality] = useState<PersonalityStyle>("balanced");
  const [mood, setMood] = useState<CortanaMood>("neutral");
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [dismissedSuggestion, setDismissedSuggestion] = useState<PersonalityStyle | null>(null);
  const [proposals, setProposals] = useState<ChangeProposal[]>([]);
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");
  const [proposalTarget, setProposalTarget] = useState("src/lib/new-module.ts");
  const [artifacts, setArtifacts] = useState<CodeArtifact[]>([]);
  const [artifactTitle, setArtifactTitle] = useState("");
  const [artifactTarget, setArtifactTarget] = useState("src/lib/new-module.ts");
  const [artifactSource, setArtifactSource] = useState("");
  const [artifactTests, setArtifactTests] = useState("");
  const learningInsight = getLearningInsight(feedback);

  useEffect(() => { setPersonality(readPersonality()); setFeedback(readFeedback()); setProposals(readProposals()); setArtifacts(readCodeArtifacts()); }, []);
  function changePersonality(value: PersonalityStyle) { setPersonality(value); savePersonality(value); }
  function rateResponse(messageId: number, rating: FeedbackRating, style: PersonalityStyle) {
    const next = saveFeedback({ id: crypto.randomUUID(), messageId, rating, style, createdAt: new Date().toISOString() });
    setFeedback(next);
  }
  function submitChangeProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!proposalTitle.trim() || !proposalDescription.trim() || !proposalTarget.trim()) return;
    setProposals(createProposal({ title: proposalTitle, description: proposalDescription, target: proposalTarget }));
    setProposalTitle(""); setProposalDescription(""); setProposalTarget("src/lib/new-module.ts");
  }
  function submitCodeArtifact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const artifact = createCodeArtifact({ title: artifactTitle, target: artifactTarget, source: artifactSource, testPlan: artifactTests });
    setArtifacts(saveCodeArtifact(artifact));
  }
  function clearArtifacts() {
    if (!window.confirm("Usunąć lokalne artefakty kodu?")) return;
    clearCodeArtifacts(); setArtifacts([]);
  }
  function runProposalValidation(id: string) { setProposals(validateProposal(id)); }
  function updateProposalStatus(id: string, status: "approved" | "rejected" | "rolled_back") {
    setProposals(transitionProposal(id, status));
  }
  function resetProposals() {
    if (!window.confirm("Usunąć lokalny rejestr propozycji zmian?")) return;
    clearProposals(); setProposals([]);
  }
  function resetLearningFeedback() {
    if (!window.confirm("Usunąć lokalny rejestr ocen odpowiedzi?")) return;
    clearFeedback();
    setFeedback([]);
    setDismissedSuggestion(null);
  }

  useEffect(() => {
    setMemoryToken(readMemoryToken());
  }, []);

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

  async function enableMemory() {
    try {
      let token = memoryToken;
      if (!token) {
        token = await initializeMemory();
        storeMemoryToken(token);
        setMemoryToken(token);
      }
      const entries = await listMemories(token);
      setMemories(entries);
      setMemoryEnabled(true);
      setMemoryNotice(`PAMIĘĆ AKTYWNA · ${entries.length} WPISÓW`);
    } catch (error) {
      setMemoryNotice(error instanceof Error ? error.message : "Nie udało się uruchomić pamięci.");
    }
  }

  async function saveMemoryEntry() {
    if (!memoryToken || !memoryDraft.trim()) return;
    try {
      if (memoryEditingId) {
        await updateMemory(memoryToken, memoryEditingId, memoryDraft.trim(), memoryKind);
        setMemories((current) => current.map((entry) => entry.id === memoryEditingId ? { ...entry, content: memoryDraft.trim(), kind: memoryKind, updatedAt: new Date().toISOString() } : entry));
        setMemoryNotice("ZAKTUALIZOWANO WPIS");
      } else {
        const entry = await saveMemory(memoryToken, memoryDraft.trim(), memoryKind);
        setMemories((current) => [entry, ...current]);
        setMemoryNotice("ZAPISANO ZATWIERDZONY WPIS");
      }
      setMemoryDraft("");
      setMemoryEditingId(null);
    } catch (error) {
      setMemoryNotice(error instanceof Error ? error.message : "Nie udało się zapisać pamięci.");
    }
  }

  async function removeMemoryEntry(id: string) {
    if (!memoryToken) return;
    try {
      await deleteMemory(memoryToken, id);
      setMemories((current) => current.filter((entry) => entry.id !== id));
      setMemoryNotice("WPIS USUNIĘTY");
    } catch (error) {
      setMemoryNotice(error instanceof Error ? error.message : "Nie udało się usunąć wpisu.");
    }
  }

  function exportMemories() {
    if (!memories.length) return;
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), entries: memories }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cortana-memory-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function eraseAllMemory() {
    if (!memoryToken || !window.confirm("Usunąć wszystkie zapisane wspomnienia CORTANY? Tej operacji nie można cofnąć.")) return;
    try {
      await deleteMemory(memoryToken);
      clearMemoryToken();
      setMemoryToken(null);
      setMemoryEnabled(false);
      setMemories([]);
      setMemoryNotice("PAMIĘĆ USUNIĘTA");
    } catch (error) {
      setMemoryNotice(error instanceof Error ? error.message : "Nie udało się usunąć pamięci.");
    }
  }

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
    setIsSpeaking(false);
    recognitionRef.current?.abort();
    setIsListening(false);
    setVoiceNotice("GŁOS ZATRZYMANY");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;

    setMood(classifyInteraction(text));
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
      { id: assistantId, role: "cortana", text: "", time: "AI · STREAM", feedbackStyle: personality },
    ]);
    setDraft("");
    setIsSending(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let assistantText = "";
    try {
      await streamAgentReply(history, {
        signal: controller.signal,
        memoryToken: memoryEnabled ? memoryToken || undefined : undefined,
        personality,
        mood,
        onToken: (token) => {
          assistantText += token;
          setMessages((current) => current.map((message) =>
            message.id === assistantId ? { ...message, text: message.text + token } : message
          ));
        },
      });
      setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, time: formatTime() } : message));
      if (voiceOutput && assistantText) {
        const started = speakText(assistantText, () => setIsSpeaking(false));
        setIsSpeaking(started);
      }
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
          <span className="brand-copy"><strong>CORTANA</strong><small>CORE SYSTEM / 0.9.1</small></span>
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
          <HologramScene mood={mood} />
          <div className="stage-core-caption"><span className="caption-line" /><span>CORTANA / CORE ENTITY</span><span className="caption-line" /></div>
          <div className="stage-label stage-label-bottom"><span>RENDER: WEBGL</span><span>SYNC: LOCAL</span></div>
        </div>

        <aside className="identity-panel">
          <div className="panel-heading"><span className="eyebrow">SYSTEM IDENTITY</span><span className="panel-index">01 / 07</span></div>
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

      <section className="personality-panel panel" aria-label="Emotional and Personality Core">
        <div className="section-heading"><div><p className="eyebrow">EMOTIONAL & PERSONALITY CORE</p><h2>Stan interakcji</h2></div><span className="channel-status"><i /> {mood.toUpperCase()}</span></div>
        <div className="personality-controls">
          <label htmlFor="personality-style">Styl osobowości</label>
          <select id="personality-style" value={personality} onChange={(event) => changePersonality(event.target.value as PersonalityStyle)}>
            <option value="balanced">Zrównoważony</option><option value="analytical">Analityczny</option><option value="warm">Wspierający</option><option value="concise">Zwięzły</option>
          </select>
          <p>Stan jest lokalnym sygnałem interakcji, nie diagnozą emocji. Możesz zmienić styl w dowolnym momencie.</p>
        </div>
      </section>

      <section className="learning-panel panel" aria-label="Adaptive Learning and Feedback Engine">
        <div className="section-heading"><div><p className="eyebrow">ADAPTIVE LEARNING & FEEDBACK ENGINE</p><h2>Ocena jakości odpowiedzi</h2></div><span className="channel-status"><i /> LOCAL · USER CONTROLLED</span></div>
        <div className="learning-stats">
          <div><strong>{learningInsight.total}</strong><span>OCENY</span></div>
          <div><strong>{learningInsight.positive}</strong><span>POZYTYWNE</span></div>
          <div><strong>{learningInsight.negative}</strong><span>DO POPRAWY</span></div>
        </div>
        {learningInsight.recommendedStyle && learningInsight.recommendedStyle !== personality && dismissedSuggestion !== learningInsight.recommendedStyle ? (
          <div className="learning-suggestion">
            <p>Na podstawie co najmniej 3 pozytywnych ocen stylu <strong>{learningInsight.recommendedStyle}</strong> CORTANA proponuje zmianę stylu odpowiedzi.</p>
            <div><button type="button" className="voice-button" onClick={() => { changePersonality(learningInsight.recommendedStyle!); setDismissedSuggestion(null); }}>ZATWIERDŹ ZMIANĘ</button><button type="button" className="voice-button" onClick={() => setDismissedSuggestion(learningInsight.recommendedStyle)}>ODRZUĆ</button></div>
          </div>
        ) : <p className="learning-hint">Oceń odpowiedzi przyciskiem + lub −. Propozycja pojawi się po zebraniu minimum 3 pozytywnych ocen dla jednego stylu.</p>}
        <div className="learning-footer"><span>DANE ZAPISYWANE LOKALNIE · MAKS. 200 OCEN</span><button type="button" className="voice-button voice-stop" onClick={resetLearningFeedback} disabled={!feedback.length}>WYCZYŚĆ OCENY</button></div>
      </section>

      <section className="governance-panel panel" aria-label="Governed Self-Programming Engine">
        <div className="section-heading"><div><p className="eyebrow">GOVERNED SELF-PROGRAMMING & ROLLBACK</p><h2>Rejestr zmian systemowych</h2></div><span className="channel-status"><i /> APPROVAL REQUIRED</span></div>
        <p className="governance-intro">CORTANA może przygotować propozycję zmiany. Walidacja sprawdza metadane i ścieżkę, ale nie wykonuje kodu. Zatwierdzenie oznacza zgodę na przekazanie do implementacji i przeglądu — nie wdrożenie.</p>
        <form className="governance-form" onSubmit={submitChangeProposal}>
          <label>Tytuł propozycji<input value={proposalTitle} onChange={(event) => setProposalTitle(event.target.value)} maxLength={120} minLength={5} required placeholder="Np. Usprawnienie obsługi pamięci" /></label>
          <label>Docelowa ścieżka<input value={proposalTarget} onChange={(event) => setProposalTarget(event.target.value)} required placeholder="src/lib/module.ts" /></label>
          <label>Uzasadnienie i plan zmiany<textarea value={proposalDescription} onChange={(event) => setProposalDescription(event.target.value)} minLength={20} maxLength={2000} required placeholder="Opisz problem, proponowane rozwiązanie, ryzyko i sposób testowania." /></label>
          <button type="submit" className="voice-button" disabled={!proposalTitle.trim() || !proposalDescription.trim() || !proposalTarget.trim()}>DODAJ PROPOZYCJĘ</button>
        </form>
        <div className="governance-list">
          {proposals.length === 0 ? <p className="learning-hint">Brak propozycji. Rejestr jest lokalny dla tej przeglądarki.</p> : proposals.slice().reverse().map((item) => (
            <article className="governance-item" key={item.id}>
              <div className="governance-item-head"><strong>{item.title}</strong><span className={`governance-status status-${item.status}`}>{item.status.toUpperCase()}</span></div>
              <code>{item.target}</code>
              <p>{item.description}</p>
              {item.validationMessage && <small>{item.validationMessage}</small>}
              <div className="governance-actions">
                {item.status === "proposed" && <button type="button" className="voice-button" onClick={() => runProposalValidation(item.id)}>WALIDUJ</button>}
                {item.status === "validated" && <><button type="button" className="voice-button" onClick={() => updateProposalStatus(item.id, "approved")}>ZATWIERDŹ DO IMPLEMENTACJI</button><button type="button" className="voice-button voice-stop" onClick={() => updateProposalStatus(item.id, "rejected")}>ODRZUĆ</button></>}
                {item.status === "approved" && <button type="button" className="voice-button voice-stop" onClick={() => updateProposalStatus(item.id, "rolled_back")}>COFNIJ ZGODĘ</button>}
                {(item.status === "rejected" || item.status === "rolled_back") && <span className="learning-hint">Propozycja zamknięta</span>}
              </div>
            </article>
          ))}
        </div>
        <div className="learning-footer"><span>LOKALNY REJESTR · LIMIT 50 · BEZ WYKONYWANIA KODU</span><button type="button" className="voice-button voice-stop" onClick={resetProposals} disabled={!proposals.length}>WYCZYŚĆ REJESTR</button></div>
      </section>

      <section className="sandbox-panel panel" aria-label="Sandboxed Code Generation and Automated Testing">
        <div className="section-heading"><div><p className="eyebrow">SANDBOXED CODE GENERATION & AUTOMATED TESTING</p><h2>Laboratorium kodu</h2></div><span className="channel-status"><i /> PREFLIGHT ONLY</span></div>
        <p className="governance-intro">Wklej wygenerowany lub przygotowany kod i plan testów. Preflight wykonuje deterministyczne kontrole metadanych oraz skan wzorców ryzyka. To nie jest wykonanie kodu ani pełny sandbox runtime — żaden kod nie zostaje uruchomiony.</p>
        <form className="governance-form" onSubmit={submitCodeArtifact}>
          <label>Nazwa artefaktu<input value={artifactTitle} onChange={(event) => setArtifactTitle(event.target.value)} minLength={5} maxLength={120} required placeholder="Moduł obsługi zdarzeń" /></label>
          <label>Docelowa ścieżka<input value={artifactTarget} onChange={(event) => setArtifactTarget(event.target.value)} required /></label>
          <label>Źródło kodu<textarea className="sandbox-code" value={artifactSource} onChange={(event) => setArtifactSource(event.target.value)} maxLength={20000} required placeholder="Wklej kod do statycznej kontroli (maks. 20 000 znaków)." /></label>
          <label>Plan testów<textarea value={artifactTests} onChange={(event) => setArtifactTests(event.target.value)} minLength={20} maxLength={2000} required placeholder="Opisz przypadki testowe, oczekiwane wyniki i sposób weryfikacji." /></label>
          <button type="submit" className="voice-button" disabled={!artifactTitle.trim() || !artifactSource.trim() || artifactTests.trim().length < 20}>URUCHOM PREFLIGHT</button>
        </form>
        <div className="governance-list">
          {artifacts.length === 0 ? <p className="learning-hint">Brak artefaktów. Zapis lokalny w tej przeglądarce.</p> : artifacts.slice().reverse().map((artifact) => (
            <article className="governance-item" key={artifact.id}>
              <div className="governance-item-head"><strong>{artifact.title}</strong><span className={`governance-status ${artifact.status === "checks_passed" ? "status-validated" : "status-rejected"}`}>{artifact.status.toUpperCase()}</span></div>
              <code>{artifact.target}</code>
              <p>{artifact.checks.filter((check) => check.passed).length}/{artifact.checks.length} kontroli zaliczonych · {artifact.source.length} znaków kodu</p>
              <ul className="sandbox-checks">{artifact.checks.map((check) => <li key={check.id} className={check.passed ? "check-pass" : "check-fail"}>{check.passed ? "PASS" : "BLOCK"} · {check.label}: {check.detail}</li>)}</ul>
              <details><summary>Podgląd źródła i planu testów</summary><pre>{artifact.source}</pre><p>{artifact.testPlan}</p></details>
            </article>
          ))}
        </div>
        <div className="learning-footer"><span>LOKALNE ARTEFAKTY · LIMIT 25 · BRAK WYKONYWANIA KODU</span><button type="button" className="voice-button voice-stop" onClick={clearArtifacts} disabled={!artifacts.length}>WYCZYŚĆ ARTEFAKTY</button></div>
      </section>

      <section className="lower-grid">
        <section className="modules-panel panel">
          <div className="section-heading">
            <div><p className="eyebrow">ARCHITECTURE / LIVE MAP</p><h2>Rdzeń systemu</h2></div>
            <span className="panel-index">07 MODULES</span>
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
                {message.role === "cortana" && message.text.trim() && message.feedbackStyle && message.time !== "SYSTEM" && message.time !== "ERROR" && message.time !== "AI · STREAM" && (
                  <div className="response-feedback" aria-label="Oceń odpowiedź CORTANY">
                    <span>PRZYDATNOŚĆ ODPOWIEDZI</span>
                    <button type="button" aria-label="Przydatna odpowiedź" aria-pressed={feedback.some((item) => item.messageId === message.id && item.rating === "positive")} onClick={() => rateResponse(message.id, "positive", message.feedbackStyle!)}>+</button>
                    <button type="button" aria-label="Odpowiedź do poprawy" aria-pressed={feedback.some((item) => item.messageId === message.id && item.rating === "negative")} onClick={() => rateResponse(message.id, "negative", message.feedbackStyle!)}>−</button>
                  </div>
                )}
              </article>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <section className="memory-panel" aria-label="Pamięć CORTANY">
            <div className="memory-heading">
              <strong>MEMORY CORE</strong>
              <span>{memoryEnabled ? `AKTYWNA · ${memories.length}` : "WYŁĄCZONA"}</span>
            </div>
            <div className="memory-toolbar">
              <button type="button" className="voice-button" onClick={enableMemory} disabled={memoryEnabled}>WŁĄCZ PAMIĘĆ</button>
              <button type="button" className="voice-button" onClick={() => { setMemoryEnabled(false); setMemoryNotice("PAMIĘĆ WYŁĄCZONA DLA ROZMOWY"); }} disabled={!memoryEnabled}>WYŁĄCZ</button>
              <button type="button" className="voice-button" onClick={exportMemories} disabled={!memories.length}>EKSPORTUJ</button>
              <button type="button" className="voice-button voice-stop" onClick={eraseAllMemory} disabled={!memoryToken}>USUŃ WSZYSTKO</button>
            </div>
            {memoryEnabled && <div className="memory-editor">
              <select value={memoryKind} onChange={(event) => setMemoryKind(event.target.value as "semantic" | "episode")} aria-label="Rodzaj pamięci"><option value="semantic">FAKT / PREFERENCJA</option><option value="episode">ZDARZENIE / EPIZOD</option></select>
              <textarea value={memoryDraft} onChange={(event) => setMemoryDraft(event.target.value)} maxLength={4000} placeholder="Wpisz informację, którą CORTANA ma zapamiętać. Zapis jest ręczny." />
              <button type="button" className="voice-button" onClick={saveMemoryEntry} disabled={!memoryDraft.trim()}>{memoryEditingId ? "ZAPISZ ZMIANY" : "ZAPISZ PAMIĘĆ"}</button>
              {memoryEditingId && <button type="button" className="voice-button" onClick={() => { setMemoryEditingId(null); setMemoryDraft(""); }}>ANULUJ EDYCJĘ</button>}
              <div className="memory-list">
                {memories.map((entry) => <div className="memory-entry" key={entry.id}>
                  <span>{entry.content}</span>
                  <div className="memory-entry-actions">
                    <button type="button" onClick={() => { setMemoryEditingId(entry.id); setMemoryDraft(entry.content); setMemoryKind(entry.kind); }} aria-label="Edytuj wpis pamięci">✎</button>
                    <button type="button" onClick={() => removeMemoryEntry(entry.id)} aria-label="Usuń wpis pamięci">×</button>
                  </div>
                </div>)}
              </div>
            </div>}
            <div className="memory-notice" role="status">{memoryNotice} · ZAPIS TYLKO RĘCZNY</div>
          </section>
          <div className="voice-toolbar" aria-label="Sterowanie głosem">
            <button type="button" className={`voice-button ${isListening ? "voice-active" : ""}`} onClick={isListening ? stopListening : startListening} disabled={isSending && !isListening} aria-pressed={isListening}>{isListening ? "■ ZATRZYMAJ NASŁUCH" : "◉ MÓW DO CORTANY"}</button>
            <button type="button" className={`voice-button ${voiceOutput ? "voice-selected" : ""}`} onClick={() => { setVoiceOutput((enabled) => !enabled); stopSpeaking(); setIsSpeaking(false); }} aria-pressed={voiceOutput}>GŁOS {voiceOutput ? "WŁ." : "WYŁ."}</button>
            <button type="button" className="voice-button voice-stop" onClick={stopVoice} disabled={!isSending && !isListening && !isSpeaking}>STOP</button>
          </div>
          <div className="voice-notice" role="status">{voiceNotice} · ROZPOZNAWANIE WYKONUJE PRZEGLĄDARKA</div>
          <form className="composer" onSubmit={handleSubmit}>
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
