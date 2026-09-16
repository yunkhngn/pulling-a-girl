"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import Image from "next/image";

export default function Home() {
  const [userName, setUserName] = useState("your.incoming.girl");
  const [isEditingName, setIsEditingName] = useState(false);
  const [context, setContext] = useState("");
  const [showContextDrawer, setShowContextDrawer] = useState(false);

  // Incoming girl's message in her bubble
  const [herMessage, setHerMessage] = useState("");
  const [selectedTone, setSelectedTone] = useState<string>("flirty");
  
  // Bottom input bar state
  const [bottomText, setBottomText] = useState("");
  const [isTypingEffect, setIsTypingEffect] = useState(false);
  
  // Outgoing reply in chat stream
  const [reply, setReply] = useState<string | null>(null);
  const [replyTimestamp, setReplyTimestamp] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const herInputRef = useRef<HTMLTextAreaElement>(null);
  const bottomInputRef = useRef<HTMLInputElement>(null);
  const chatStreamRef = useRef<HTMLDivElement>(null);
  const streamEndRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingReplyRef = useRef<string>("");

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTo({
        top: chatStreamRef.current.scrollHeight,
        behavior,
      });
    }
    streamEndRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  useEffect(() => {
    herInputRef.current?.focus();
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      if (autoSendTimeoutRef.current) clearTimeout(autoSendTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [reply, loading, isTypingEffect]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const triggerSendBubble = (text: string) => {
    if (autoSendTimeoutRef.current) clearTimeout(autoSendTimeoutRef.current);
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    setIsTypingEffect(false);
    setLoading(false);
    setBottomText("");
    setReply(text);
    setReplyTimestamp(Date.now());
    pendingReplyRef.current = "";

    scrollToBottom("smooth");
    setTimeout(() => scrollToBottom("smooth"), 50);
    setTimeout(() => scrollToBottom("smooth"), 180);
  };

  const handleGenerate = async () => {
    const text = herMessage.trim();
    if (!text) {
      showToast("Vui lòng nhập tin nhắn của cô ấy.");
      herInputRef.current?.focus();
      return;
    }

    // Reset previous state
    if (autoSendTimeoutRef.current) clearTimeout(autoSendTimeoutRef.current);
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    setReply(null);
    setBottomText("");
    setIsTypingEffect(false);
    setLoading(true);
    setTimeout(() => scrollToBottom("smooth"), 40);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: context.trim() || undefined,
          herMessage: text,
          tone: selectedTone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể tạo phản hồi.");
      }

      const fullReply = (data.reply as string).trim();
      pendingReplyRef.current = fullReply;
      setLoading(false);

      // Start typewriter effect in bottom bar
      let currentIndex = 0;
      setIsTypingEffect(true);

      typingIntervalRef.current = setInterval(() => {
        currentIndex++;
        setBottomText(fullReply.slice(0, currentIndex));

        if (currentIndex >= fullReply.length) {
          if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
          setIsTypingEffect(false);

          // Once typing in bottom bar completes, send bubble up into chat
          autoSendTimeoutRef.current = setTimeout(() => {
            triggerSendBubble(fullReply);
          }, 350);
        }
      }, 20);
    } catch (err: unknown) {
      console.error(err);
      setLoading(false);
      setIsTypingEffect(false);
      const msg = err instanceof Error ? err.message : "Lỗi khi tạo phản hồi.";
      showToast(msg);
    }
  };

  // When clicking "Gửi" in bottom bar or hitting Enter
  const handleBottomSend = () => {
    const textToSend = pendingReplyRef.current || bottomText.trim();
    if (!textToSend) return;
    triggerSendBubble(textToSend);
  };

  const handleHerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && !isTypingEffect) handleGenerate();
    }
  };

  const handleBottomKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleBottomSend();
    }
  };

  const handleCopyReply = async () => {
    if (!reply) return;
    try {
      await navigator.clipboard.writeText(reply);
      showToast("Đã sao chép tin nhắn");
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset = () => {
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    if (autoSendTimeoutRef.current) clearTimeout(autoSendTimeoutRef.current);
    setHerMessage("");
    setBottomText("");
    setIsTypingEffect(false);
    setReply(null);
    herInputRef.current?.focus();
  };

  return (
    <div className="ig-chat-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="ig-copy-toast" role="status">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toastMessage}
        </div>
      )}

      {/* Instagram Header */}
      <header className="ig-header">
        <div className="ig-header-left">
          <button
            type="button"
            className="ig-back-btn"
            onClick={handleReset}
            title="Làm mới cuộc trò chuyện"
            aria-label="Quay lại"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          {/* Avatar with Story Gradient Ring */}
          <div className="ig-avatar-ring">
            <Image
              src="/avatar.jpg"
              alt={userName}
              width={38}
              height={38}
              className="ig-avatar"
              style={{ objectFit: "cover" }}
            />
            <span className="ig-avatar-online-dot" />
          </div>

          <div className="ig-user-meta">
            <div className="ig-user-name-row">
              {isEditingName ? (
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                  autoFocus
                  style={{
                    background: "#262626",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontWeight: "600",
                    padding: "1px 4px",
                    outline: "none",
                  }}
                />
              ) : (
                <span
                  className="ig-user-name"
                  onClick={() => setIsEditingName(true)}
                  title="Bấm để đổi tên"
                >
                  {userName}
                </span>
              )}
            </div>
            <span className="ig-user-status">Đang hoạt động</span>
          </div>
        </div>

        <div className="ig-header-right">
          {/* Call icon */}
          <button type="button" className="ig-action-btn" aria-label="Gọi thoại">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </button>

          {/* Video call icon */}
          <button type="button" className="ig-action-btn" aria-label="Gọi video">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect width="14" height="14" x="1" y="5" rx="2" ry="2" />
            </svg>
          </button>

          {/* Info icon (Context Drawer) */}
          <button
            type="button"
            className={`ig-action-btn ${showContextDrawer || context.trim() ? "active" : ""}`}
            onClick={() => setShowContextDrawer(!showContextDrawer)}
            title="Chi tiết đoạn chat & Bối cảnh"
            aria-label="Thông tin"
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>
        </div>
      </header>

      {/* Context Drawer (Clean Instagram Chat Settings Dropdown) */}
      {showContextDrawer && (
        <div className="ig-context-drawer">
          <div className="ig-context-drawer-top">
            <span>Bối cảnh cuộc trò chuyện</span>
            <span
              style={{ cursor: "pointer", color: "#a8a8a8", fontSize: "14px" }}
              onClick={() => setShowContextDrawer(false)}
            >
              ✕
            </span>
          </div>
          <textarea
            id="context-input"
            className="ig-context-input"
            rows={2}
            placeholder="Mô tả bối cảnh hiện tại (ví dụ: đang rủ cuối tuần đi chơi, cô ấy bảo chưa chắc...)"
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
          <span className="ig-context-hint">
            Thông tin này giúp câu trả lời khớp chính xác với hoàn cảnh thực tế.
          </span>
        </div>
      )}

      {/* Chat Stream */}
      <div className="ig-chat-stream" ref={chatStreamRef}>
        {/* Profile Header */}
        <div style={{ textAlign: "center", margin: "6px 0 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          <div className="ig-avatar-ring" style={{ padding: "3px" }}>
            <Image
              src="/avatar.jpg"
              alt={userName}
              width={56}
              height={56}
              className="ig-avatar"
              style={{ width: "56px", height: "56px", objectFit: "cover" }}
            />
          </div>
          <div style={{ fontSize: "15px", fontWeight: "600", color: "#fff" }}>{userName}</div>
          <div style={{ fontSize: "12px", color: "var(--ig-text-secondary)" }}>
            Đang theo dõi nhau trên Instagram
          </div>
        </div>

        {/* Her incoming message bubble */}
        <div className="ig-msg-row ig-msg-incoming">
          <Image
            src="/avatar.jpg"
            alt={userName}
            width={28}
            height={28}
            className="ig-msg-avatar"
            style={{ objectFit: "cover" }}
          />

          <div className="ig-editable-bubble-card">
            <textarea
              ref={herInputRef}
              id="her-message-input"
              className="ig-bubble-input-textarea"
              placeholder="Nhập tin nhắn của cô ấy vào đây..."
              value={herMessage}
              onChange={(e) => setHerMessage(e.target.value)}
              onKeyDown={handleHerKeyDown}
              disabled={loading || isTypingEffect}
              rows={2}
            />

            {/* Tone selector pills without icons */}
            <div className="ig-tone-group" role="radiogroup" aria-label="Lựa chọn phong cách trả lời">
              {[
                { id: "flirty", label: "Flirty" },
                { id: "neutral", label: "Neutral" },
                { id: "sympathy", label: "Sympathy" },
                { id: "playful", label: "Playful" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`ig-tone-pill ${selectedTone === t.id ? "active" : ""}`}
                  onClick={() => setSelectedTone(t.id)}
                  title={`Phong cách ${t.label}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="ig-bubble-card-footer">
              <span className="ig-bubble-hint">
                Nhấn Enter để tạo câu trả lời
              </span>
              <button
                id="generate-button"
                type="button"
                className="ig-bubble-action-btn"
                onClick={handleGenerate}
                disabled={loading || isTypingEffect || !herMessage.trim()}
              >
                {loading ? "Đang nghĩ..." : "Trả lời"}
              </button>
            </div>
          </div>
        </div>

        {/* Outgoing typing indicator in chat stream */}
        {(loading || isTypingEffect) && !reply && (
          <div className="ig-msg-row ig-msg-outgoing" style={{ animation: "igFadeIn 0.2s ease-out" }}>
            <div className="ig-typing-bubble" title="Đang tạo phản hồi...">
              <span className="ig-typing-dot" />
              <span className="ig-typing-dot" />
              <span className="ig-typing-dot" />
            </div>
          </div>
        )}

        {/* Outgoing reply sent into chat stream */}
        {reply && (
          <div className="ig-msg-row ig-msg-outgoing">
            <div className="ig-bubble-out-group">
              <div
                key={replyTimestamp}
                id="reply-text"
                className="ig-bubble ig-bubble-out"
                onClick={handleCopyReply}
                title="Bấm để sao chép tin nhắn"
              >
                {reply}
              </div>
              <span className="ig-msg-status">Đã xem vừa xong</span>
            </div>
          </div>
        )}

        <div ref={streamEndRef} />
      </div>

      {/* Instagram Bottom Input Bar */}
      <footer className="ig-footer">
        <div className="ig-input-bar">
          {/* Smiley icon */}
          <button
            type="button"
            className="ig-icon-btn"
            title="Biểu tượng cảm xúc"
            aria-label="Emoji"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>

          <input
            ref={bottomInputRef}
            type="text"
            className="ig-text-input"
            placeholder={loading ? "Đang suy nghĩ câu trả lời..." : "Nhắn tin..."}
            value={bottomText}
            onChange={(e) => {
              setBottomText(e.target.value);
              pendingReplyRef.current = "";
            }}
            onKeyDown={handleBottomKeyDown}
            autoComplete="off"
          />

          {/* Right actions: If has text -> "Gửi" button; If empty -> Mic, Image, Sticker icons */}
          {bottomText.trim() ? (
            <button
              type="button"
              className="ig-send-text-btn"
              onClick={handleBottomSend}
            >
              Gửi
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              {/* Mic icon */}
              <button type="button" className="ig-icon-btn" aria-label="Ghi âm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </button>

              {/* Gallery Image icon */}
              <button type="button" className="ig-icon-btn" aria-label="Ảnh">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </button>

              {/* Sticker icon */}
              <button type="button" className="ig-icon-btn" aria-label="Nhãn dán">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
