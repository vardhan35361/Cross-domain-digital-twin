import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Mic, Send, Sparkles, Volume2, X } from "lucide-react";
import { API } from "../services/api";
import { useTwin } from "../state/TwinContext";
import { useDomains } from "../state/DomainContext";

export default function AssistantDrawer({ open, onClose }) {
  const { overview } = useTwin();
  const { activeDomain } = useDomains();
  const domain = activeDomain || "traffic";
  const [query, setQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState([{ role: "ai",
    text: `Good evening, Operator. I'm AIRA — currently focused on the ${domain.toUpperCase()} domain. What would you like to inspect?` }]);

  const ask = async (question, speak = false) => {
    if (!question || sending) return;
    setQuery(""); setMessages(prev => [...prev, {role:"user", text:question}]); setSending(true);
    let answer = "";
    try {
      const response = await fetch(`${API}/assistant/stream`, {method:"POST",
        headers:{"Content-Type":"application/json"}, body:JSON.stringify({message:question, domain})});
      if (!response.ok) throw new Error("assistant unavailable");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      setMessages(prev => [...prev, {role:"ai", text:""}]);
      while (true) {
        const {value, done} = await reader.read();
        if (done) break;
        answer += decoder.decode(value, {stream:true});
        setMessages(prev => [...prev.slice(0,-1), {role:"ai", text:answer}]);
      }
    } catch (_) {
      answer = `AIRA [${domain.toUpperCase()}] is in local fallback mode. Domain KPIs stable.`;
      setMessages(prev => [...prev, {role:"ai", text:answer}]);
    } finally {
      setSending(false);
      if (speak && answer && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(answer));
      }
    }
  };
  const submit = e => { e.preventDefault(); ask(query.trim()); };
  const startVoice = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setQuery("Voice recognition unavailable — use text command"); return; }
    const r = new Recognition();
    r.lang = "en-IN"; r.interimResults = false;
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.onresult = ev => ask(ev.results[0][0].transcript, true);
    r.start();
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="assistant-drawer" initial={{x:420}} animate={{x:0}} exit={{x:420}}
          data-testid="assistant-drawer">
          <div className="assistant-head">
            <div><div className="ai-orb"><Sparkles size={16}/></div>
              <div><strong>AIRA</strong><span>Traffic intelligence assistant</span></div></div>
            <button className="icon-btn" onClick={onClose} data-testid="close-assistant-button" aria-label="close"><X size={16}/></button>
          </div>
          <div className="assistant-context">
            <span><span className="pulse-dot"/> LIVE CONTEXT</span>
            <small>24 zones · {overview.active_vehicles} vehicles · index {overview.congestion_index}</small>
          </div>
          <div className="message-list">
            {messages.map((m, i) => (
              <div className={`message ${m.role}`} key={i} data-testid={`assistant-message-${i}`}>
                <span>{m.role === "ai" ? <Sparkles size={12}/> : "YOU"}</span>
                <p>{m.text || "Thinking…"}</p>
              </div>
            ))}
          </div>
          <div className="suggestions">
            {["Where is the bottleneck?", "Route an ambulance to HITEC City", "What happens in 30 minutes?"]
              .map(q => <button key={q} onClick={() => setQuery(q)} data-testid={`assistant-suggestion-${q.slice(0,6).toLowerCase().replaceAll(" ","-")}`}>{q}</button>)}
          </div>
          <form className="assistant-input" onSubmit={submit}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Ask about the live twin…"
              data-testid="assistant-query-input"/>
            <button type="submit" disabled={sending} data-testid="assistant-send-button">
              {sending ? <Activity size={14} className="spin"/> : <Send size={14}/>}
            </button>
          </form>
          <div className="assistant-foot">
            <button type="button" className="voice-operation" onClick={startVoice} data-testid="voice-operation-button">
              <Mic size={12}/> {listening ? "LISTENING…" : "VOICE OPERATION"}
            </button>
            <span>Text fallback ready</span>
            <Volume2 size={12}/>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
