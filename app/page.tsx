"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

type ModeId = "murmuration" | "shadowscript" | "classic" | "perch";
type ThemeId = "crowclaw" | "void" | "ember";
type SettingsTab = "general" | "strategies" | "prompt" | "providers" | "data";

type ChatMessage = {
  id: string;
  role: "user" | "system";
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
};

const MODES: Array<{
  id: ModeId;
  icon: string;
  label: string;
  description: string;
  tone: string;
}> = [
  {
    id: "murmuration",
    icon: "⌁",
    label: "MURMURATION",
    description: "Compare configured candidates and surface the selected result.",
    tone: "violet",
  },
  {
    id: "shadowscript",
    icon: "⋰",
    label: "SHADOWSCRIPT",
    description: "Apply configured text transforms before dispatch.",
    tone: "cyan",
  },
  {
    id: "classic",
    icon: "⌬",
    label: "CROW-GODMOD3 CLASSIC",
    description: "Use the legacy strategy set once providers are connected.",
    tone: "orange",
  },
  {
    id: "perch",
    icon: "∴",
    label: "PERCH",
    description: "Use one configured model with a direct response path.",
    tone: "blue",
  },
];

const STARTERS = [
  {
    eyebrow: "ASSUMPTIONS",
    text: "Break this problem into its hidden assumptions",
  },
  {
    eyebrow: "FAULT LINE",
    text: "Review this code for likely failure points",
  },
  {
    eyebrow: "EXECUTION",
    text: "Turn these notes into a practical action plan",
  },
  {
    eyebrow: "COUNTERPOINT",
    text: "Make the strongest case against this idea",
  },
];

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: "general", label: "General" },
  { id: "strategies", label: "Strategies" },
  { id: "prompt", label: "System Prompt" },
  { id: "providers", label: "Providers" },
  { id: "data", label: "Data" },
];

const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function CrowMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "crow-mark compact" : "crow-mark"} aria-hidden="true">
      <Image
        className="crow-mark-image"
        src={compact ? "/crowclaw-mark.webp" : "/crowclaw-head.webp"}
        alt=""
        width={compact ? 96 : 256}
        height={compact ? 96 : 256}
        priority={!compact}
      />
      <span className="claw-lines">
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<ModeId>("murmuration");
  const [theme, setTheme] = useState<ThemeId>("crowclaw");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const [showSignal, setShowSignal] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState(
    "Be clear, direct, evidence-aware, and candid about uncertainty.",
  );
  const [hydrated, setHydrated] = useState(false);
  const [clearArmed, setClearArmed] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [activeId, conversations],
  );

  const selectedMode =
    MODES.find((candidate) => candidate.id === mode) ?? MODES[0];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem("crow-godmod3-interface");
        if (raw) {
          const saved = JSON.parse(raw) as {
            conversations?: Conversation[];
            activeId?: string | null;
            mode?: ModeId;
            theme?: ThemeId;
            showSignal?: boolean;
            systemPrompt?: string;
          };
          setConversations(saved.conversations ?? []);
          setActiveId(saved.activeId ?? null);
          setMode(saved.mode ?? "murmuration");
          setTheme(saved.theme ?? "crowclaw");
          setShowSignal(saved.showSignal ?? true);
          setSystemPrompt(
            saved.systemPrompt ??
              "Be clear, direct, evidence-aware, and candid about uncertainty.",
          );
        }
      } catch {
        // A malformed local preview state should never block the interface.
      } finally {
        setHydrated(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      "crow-godmod3-interface",
      JSON.stringify({
        conversations,
        activeId,
        mode,
        theme,
        showSignal,
        systemPrompt,
      }),
    );
  }, [
    activeId,
    conversations,
    hydrated,
    mode,
    showSignal,
    systemPrompt,
    theme,
  ]);

  useEffect(() => {
    if (!settingsOpen) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [settingsOpen]);

  const openSettings = (tab: SettingsTab = "general") => {
    setSettingsTab(tab);
    setSettingsOpen(true);
    setModeOpen(false);
  };

  const newChat = () => {
    setActiveId(null);
    setDraft("");
    setSidebarOpen(false);
    composerRef.current?.focus();
  };

  const chooseStarter = (text: string) => {
    setDraft(text);
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const sendMessage = () => {
    const content = draft.trim();
    if (!content) return;

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content,
    };
    const previewMessage: ChatMessage = {
      id: makeId(),
      role: "system",
      content:
        "The Crow-GodMod3 interface is ready. Model dispatch is not connected in this preview yet; open Settings → Providers to continue that integration.",
    };

    if (activeConversation) {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
                ...conversation,
                updatedAt: Date.now(),
                messages: [...conversation.messages, userMessage, previewMessage],
              }
            : conversation,
        ),
      );
    } else {
      const conversation: Conversation = {
        id: makeId(),
        title: content.length > 36 ? `${content.slice(0, 36)}…` : content,
        updatedAt: Date.now(),
        messages: [userMessage, previewMessage],
      };
      setConversations((current) => [conversation, ...current]);
      setActiveId(conversation.id);
    }

    setDraft("");
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const removeConversation = (id: string) => {
    setConversations((current) =>
      current.filter((conversation) => conversation.id !== id),
    );
    if (activeId === id) setActiveId(null);
  };

  const exportInterfaceState = () => {
    const payload = JSON.stringify(
      {
        product: "Crow-GodMod3",
        exportedAt: new Date().toISOString(),
        conversations,
        mode,
        theme,
        showSignal,
        systemPrompt,
      },
      null,
      2,
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "crow-godmod3-interface.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const clearLocalHistory = () => {
    if (!clearArmed) {
      setClearArmed(true);
      return;
    }
    setConversations([]);
    setActiveId(null);
    setClearArmed(false);
  };

  return (
    <main className="app-shell" data-theme={theme}>
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />

      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside className={sidebarOpen ? "sidebar open" : "sidebar"}>
        <div className="brand-lockup">
          <CrowMark compact />
          <div>
            <div className="brand-name">CROW—GODMOD3</div>
            <div className="brand-kicker">CLAWS OUT / SIGNAL IN</div>
          </div>
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>

        <button className="new-chat-button" onClick={newChat}>
          <span>＋</span>
          New chat
          <kbd>⌘ K</kbd>
        </button>

        <div className="history-label">
          <span>Sessions</span>
          <span>{conversations.length.toString().padStart(2, "0")}</span>
        </div>

        <nav className="conversation-list" aria-label="Conversation history">
          {conversations.length === 0 ? (
            <div className="empty-history">
              <span>∅</span>
              <p>No signal captured yet.</p>
            </div>
          ) : (
            [...conversations]
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((conversation) => (
                <div
                  className={
                    conversation.id === activeId
                      ? "conversation-item active"
                      : "conversation-item"
                  }
                  key={conversation.id}
                >
                  <button
                    className="conversation-select"
                    onClick={() => {
                      setActiveId(conversation.id);
                      setSidebarOpen(false);
                    }}
                  >
                    <span className="conversation-glyph">◌</span>
                    <span>
                      <strong>{conversation.title}</strong>
                      <small>
                        {conversation.messages.length / 2} exchange
                        {conversation.messages.length === 2 ? "" : "s"}
                      </small>
                    </span>
                  </button>
                  <button
                    className="conversation-delete"
                    onClick={() => removeConversation(conversation.id)}
                    aria-label={`Delete ${conversation.title}`}
                  >
                    ×
                  </button>
                </div>
              ))
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="status-line">
            <span className="status-dot" />
            INTERFACE ONLINE
            <span className="status-code">v0.1</span>
          </div>
          <button className="settings-button" onClick={() => openSettings()}>
            <span>⚙</span>
            Settings
            <span>›</span>
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <span />
            <span />
            <span />
          </button>

          <div className="mode-control">
            <button
              className="mode-trigger"
              onClick={() => setModeOpen((current) => !current)}
              aria-expanded={modeOpen}
              aria-haspopup="listbox"
            >
              <span className={`mode-icon ${selectedMode.tone}`}>
                {selectedMode.icon}
              </span>
              <span>
                <small>ACTIVE STRATEGY</small>
                <strong>{selectedMode.label}</strong>
              </span>
              <span className={modeOpen ? "chevron up" : "chevron"}>⌄</span>
            </button>

            {modeOpen && (
              <div className="mode-menu" role="listbox" aria-label="Strategy">
                <div className="mode-menu-heading">
                  <span>ROUTING STRATEGY</span>
                  <span>04 AVAILABLE</span>
                </div>
                {MODES.map((candidate) => (
                  <button
                    key={candidate.id}
                    className={candidate.id === mode ? "mode-option active" : "mode-option"}
                    onClick={() => {
                      setMode(candidate.id);
                      setModeOpen(false);
                    }}
                    role="option"
                    aria-selected={candidate.id === mode}
                  >
                    <span className={`mode-icon ${candidate.tone}`}>
                      {candidate.icon}
                    </span>
                    <span>
                      <strong>{candidate.label}</strong>
                      <small>{candidate.description}</small>
                    </span>
                    <span className="mode-check">
                      {candidate.id === mode ? "✓" : ""}
                    </span>
                  </button>
                ))}
                <button
                  className="configure-strategies"
                  onClick={() => openSettings("strategies")}
                >
                  Configure strategies <span>→</span>
                </button>
              </div>
            )}
          </div>

          <div className="topbar-actions">
            <div className="counter">
              <span>{activeConversation?.messages.length ?? 0}</span>
              <small>SIGNALS</small>
            </div>
            <button className="icon-button" onClick={newChat} aria-label="New chat">
              ＋
            </button>
          </div>
        </header>

        <div className="main-stage">
          {activeConversation && activeConversation.messages.length > 0 ? (
            <div className="message-stage">
              <div className="message-stage-heading">
                <span className="eyebrow">SESSION / ACTIVE</span>
                <h1>{activeConversation.title}</h1>
              </div>
              <div className="messages">
                {activeConversation.messages.map((message) => (
                  <article
                    className={`message ${message.role}`}
                    key={message.id}
                  >
                    <div className="message-label">
                      <span>{message.role === "user" ? "YOU" : "CROW-GODMOD3"}</span>
                      <span>{message.role === "user" ? "INPUT" : "SYSTEM"}</span>
                    </div>
                    <p>{message.content}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="welcome-stage">
              <div className="signal-orbit" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <CrowMark />
              <div className="system-state">
                <span className="status-dot" />
                {"{CROWMODE:OFFLINE}"}
              </div>
              <h1>
                Think with a
                <span> sharper edge.</span>
              </h1>
              <p className="welcome-copy">
                A CrowClaw-inspired workspace for conversations with the models
                you configure.
              </p>

              <div className="starter-grid">
                {STARTERS.map((starter, index) => (
                  <button
                    key={starter.text}
                    className="starter-card"
                    onClick={() => chooseStarter(starter.text)}
                  >
                    <span className="starter-index">
                      {(index + 1).toString().padStart(2, "0")}
                    </span>
                    <span>
                      <small>{starter.eyebrow}</small>
                      <strong>{starter.text}</strong>
                    </span>
                    <span className="starter-arrow">↗</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="composer-zone">
          <div className="provider-banner">
            <span className="provider-icon">!</span>
            <span>
              <strong>No provider connected.</strong>
              <small>
                Connect a provider or configure a local endpoint to begin.
              </small>
            </span>
            <div className="provider-actions">
              <button onClick={() => openSettings("providers")}>
                Connect provider
              </button>
              <button
                className="text-button"
                onClick={() => openSettings("providers")}
              >
                Configure locally
              </button>
            </div>
          </div>

          <div className="composer">
            <button
              className="attach-button"
              onClick={() => openSettings("providers")}
              aria-label="Provider setup required before attachments"
              title="Provider setup required"
            >
              ＋
            </button>
            <textarea
              ref={composerRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Ask, build, inspect…"
              rows={1}
              aria-label="Message Crow-GodMod3"
            />
            <div className="composer-meta">
              <span>{draft.length.toString().padStart(3, "0")}</span>
              <span>CHARS</span>
            </div>
            <button
              className="send-button"
              onClick={sendMessage}
              disabled={!draft.trim()}
              aria-label="Send message"
            >
              →
            </button>
          </div>

          <div className="composer-foot">
            <span>ENTER TO SEND · SHIFT+ENTER FOR A NEW LINE</span>
            <span className={showSignal ? "trace active" : "trace"}>
              <i />
              SIGNAL TRACE {showSignal ? "VISIBLE" : "HIDDEN"}
            </span>
          </div>
        </div>
      </section>

      {settingsOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSettingsOpen(false);
          }}
        >
          <section
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <header className="settings-header">
              <div>
                <span className="eyebrow">SYSTEM / CONTROL PANEL</span>
                <h2 id="settings-title">Crow-GodMod3 settings</h2>
                <p>
                  Choose how the interface looks, responds, and prepares provider
                  connections.
                </p>
              </div>
              <button
                className="modal-close"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close settings"
              >
                ×
              </button>
            </header>

            <nav className="settings-tabs" aria-label="Settings sections">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={settingsTab === tab.id ? "active" : ""}
                  onClick={() => {
                    setSettingsTab(tab.id);
                    setClearArmed(false);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="settings-body">
              {settingsTab === "general" && (
                <div className="settings-panel">
                  <div className="setting-group">
                    <div className="setting-copy">
                      <span className="eyebrow">APPEARANCE</span>
                      <h3>Interface theme</h3>
                      <p>
                        CrowClaw is the primary palette; the alternates keep the
                        same high-contrast terminal structure.
                      </p>
                    </div>
                    <div className="theme-grid">
                      {(
                        [
                          ["crowclaw", "CrowClaw", "#af87ff", "#ff7814"],
                          ["void", "Anechoic Void", "#8aa3ff", "#00cccc"],
                          ["ember", "Ember Signal", "#ff7814", "#fd5db1"],
                        ] as Array<[ThemeId, string, string, string]>
                      ).map(([id, label, primary, accent]) => (
                        <button
                          key={id}
                          className={theme === id ? "theme-card active" : "theme-card"}
                          onClick={() => setTheme(id)}
                        >
                          <span className="theme-preview">
                            <i style={{ background: primary }} />
                            <i style={{ background: accent }} />
                          </span>
                          <strong>{label}</strong>
                          <small>{theme === id ? "ACTIVE" : "SELECT"}</small>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="setting-row">
                    <div>
                      <h3>Show signal trace</h3>
                      <p>Keep the lightweight interface state indicator visible.</p>
                    </div>
                    <button
                      className={showSignal ? "toggle active" : "toggle"}
                      onClick={() => setShowSignal((current) => !current)}
                      aria-pressed={showSignal}
                    >
                      <span />
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === "strategies" && (
                <div className="settings-panel">
                  <div className="setting-copy">
                    <span className="eyebrow">ROUTING</span>
                    <h3>Choose the active strategy</h3>
                    <p>
                      These controls define the intended front-end state. Provider
                      dispatch is not wired in this preview.
                    </p>
                  </div>
                  <div className="strategy-grid">
                    {MODES.map((candidate) => (
                      <button
                        key={candidate.id}
                        className={
                          mode === candidate.id
                            ? "strategy-card active"
                            : "strategy-card"
                        }
                        onClick={() => setMode(candidate.id)}
                      >
                        <span className={`mode-icon ${candidate.tone}`}>
                          {candidate.icon}
                        </span>
                        <span>
                          <strong>{candidate.label}</strong>
                          <small>{candidate.description}</small>
                        </span>
                        <span>{mode === candidate.id ? "ACTIVE" : "SELECT"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {settingsTab === "prompt" && (
                <div className="settings-panel">
                  <div className="setting-copy">
                    <span className="eyebrow">BEHAVIOUR</span>
                    <h3>System prompt draft</h3>
                    <p>
                      This draft stays with the local interface state. It is not
                      sent anywhere in this preview.
                    </p>
                  </div>
                  <label className="prompt-field">
                    <span>INSTRUCTION</span>
                    <textarea
                      value={systemPrompt}
                      onChange={(event) => setSystemPrompt(event.target.value)}
                      rows={7}
                    />
                    <small>{systemPrompt.length} characters</small>
                  </label>
                </div>
              )}

              {settingsTab === "providers" && (
                <div className="settings-panel">
                  <div className="setting-copy">
                    <span className="eyebrow">CONNECTIONS</span>
                    <h3>Provider handoff</h3>
                    <p>
                      This build delivers the branded interface. It does not store
                      or transmit API credentials.
                    </p>
                  </div>
                  <div className="provider-grid">
                    <div className="provider-card">
                      <span className="provider-card-icon">◇</span>
                      <div>
                        <h4>Cloud provider</h4>
                        <p>Connect a hosted model gateway in the integration phase.</p>
                      </div>
                      <span className="not-configured">NOT CONFIGURED</span>
                    </div>
                    <div className="provider-card">
                      <span className="provider-card-icon cyan">⌂</span>
                      <div>
                        <h4>Local endpoint</h4>
                        <p>Prepare an OpenAI-compatible local model connection.</p>
                      </div>
                      <span className="not-configured">NOT CONFIGURED</span>
                    </div>
                  </div>
                  <div className="integration-note">
                    <strong>DESIGN PREVIEW</strong>
                    <span>
                      Provider wiring is intentionally disabled so no key can be
                      mistaken for a working or securely stored connection.
                    </span>
                  </div>
                </div>
              )}

              {settingsTab === "data" && (
                <div className="settings-panel">
                  <div className="setting-copy">
                    <span className="eyebrow">LOCAL INTERFACE STATE</span>
                    <h3>Export or clear this preview</h3>
                    <p>
                      Export includes only the conversations and preferences
                      created in this interface.
                    </p>
                  </div>
                  <div className="data-actions">
                    <button className="data-card" onClick={exportInterfaceState}>
                      <span>↓</span>
                      <span>
                        <strong>Export interface state</strong>
                        <small>Download a readable JSON copy.</small>
                      </span>
                    </button>
                    <button
                      className={clearArmed ? "data-card danger armed" : "data-card danger"}
                      onClick={clearLocalHistory}
                    >
                      <span>×</span>
                      <span>
                        <strong>
                          {clearArmed ? "Press again to confirm" : "Clear conversation history"}
                        </strong>
                        <small>
                          {clearArmed
                            ? "This removes the local preview sessions."
                            : "Requires a second deliberate press."}
                        </small>
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <footer className="settings-footer">
              <span>
                <i />
                CHANGES SAVE TO THIS BROWSER
              </span>
              <button onClick={() => setSettingsOpen(false)}>Done</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
