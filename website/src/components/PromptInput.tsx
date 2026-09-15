import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react";

type PromptInputMeta = { model: string; effort: string; attachments: File[] };

export interface PromptInputProps {
  onSubmit?: (value: string, meta: PromptInputMeta) => void;
  placeholder?: string;
  className?: string;
  models?: string[];
  efforts?: string[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  onVoiceInput?: (audio: Blob) => void | Promise<void>;
  disabled?: boolean;
  maxAttachments?: number;
}

type Attachment = { id: string; file: File; url: string; name: string; width: number; height: number };
type IconName = "arrow" | "attach" | "mic" | "plus" | "stop";

const modelIcons: Record<string, string> = {
  "Composer 2.5": "https://cdn.21st.dev/assets/mirror/7d/7dc00bc09f225fcda46cbc9c6b669c69c025a231877d6c17baa6a003f04f02b2.svg",
  "Gemini 3.5 Flash": "https://cdn.21st.dev/assets/mirror/cd/cda2df6631d5fa227de3fa04ed78cf354f910ba92a9f086e7455655c10ad9d09.svg",
  "GPT 5.5": "https://cdn.21st.dev/assets/mirror/b9/b93fa7942be639a1dae60194ff12141145d7d9fd59581582d6ff23335755f19c.svg",
  "Opus 4.8": "https://cdn.21st.dev/assets/mirror/5d/5de1221c77cc91e748066fd642ad0eee1c1fa65328814f5178166f901e599709.svg",
  "GLM 5.2": "https://cdn.21st.dev/assets/mirror/b2/b2a6c0ff63efd8a555edf8a174ea6fcfeca120ac1595a2d461ca11d3ae89276c.svg",
};

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactElement> = {
    arrow: <path d="m4 8 4-4 4 4M8 4v8" />,
    attach: <path d="m5 8 4.8-4.8a2.5 2.5 0 0 1 3.5 3.5l-6.4 6.4a3.5 3.5 0 0 1-5-5L8 2" />,
    mic: <><rect x="5" y="2" width="6" height="8" rx="3" /><path d="M2.5 7.5a5.5 5.5 0 0 0 11 0M8 13v-2M5.5 15h5" /></>,
    plus: <path d="M8 3v10M3 8h10" />,
    stop: <rect x="4.5" y="4.5" width="7" height="7" rx="1" fill="currentColor" stroke="none" />,
  };
  return <svg className="prompt-input-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function ModelIcon({ model }: { model: string }) {
  return modelIcons[model] ? <img src={modelIcons[model]} alt="" /> : <span>{model.slice(0, 1)}</span>;
}

function MorphingText({ text }: { text: string }) {
  const [width, setWidth] = useState<number | "auto">("auto");
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) setWidth(ref.current.offsetWidth); }, [text]);
  return <span className="prompt-input-morph" style={{ width }}><span ref={ref} aria-hidden="true">{text}</span><span key={text}>{text}</span></span>;
}

function AttachmentGallery({ attachment, originRect, onClose }: { attachment: Attachment; originRect: DOMRect; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { const frame = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(frame); }, []);
  useEffect(() => { const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") onClose(); }; document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }, [onClose]);
  return <div className="prompt-input-gallery" role="dialog" aria-modal="true" aria-label={`Preview of ${attachment.name}`} onClick={onClose}>
    <div className="prompt-input-gallery-backdrop" style={{ opacity: open ? 1 : 0 }} />
    <img
      src={attachment.url}
      alt={attachment.name}
      onClick={(event) => event.stopPropagation()}
      className="prompt-input-gallery-image"
      style={{
        top: open ? "50%" : originRect.top,
        left: open ? "50%" : originRect.left,
        width: open ? "min(86vw, 560px)" : originRect.width,
        height: open ? "min(78vh, 560px)" : originRect.height,
        transform: open ? "translate(-50%, -50%)" : "none",
      }}
    />
    <button type="button" className="prompt-input-gallery-close" onClick={onClose} aria-label="Close preview">×</button>
  </div>;
}

export default function PromptInput({
  onSubmit,
  placeholder = "Ask anything",
  className = "",
  models = ["GPT 5.5", "Opus 4.8", "Gemini 3.5 Flash", "Composer 2.5", "GLM 5.2"],
  efforts = ["Low", "Medium", "Max Effort"],
  defaultValue = "",
  value: controlledValue,
  onChange,
  onVoiceInput,
  disabled = false,
  maxAttachments = 6,
}: PromptInputProps) {
  const [localValue, setLocalValue] = useState(defaultValue);
  const [expanded, setExpanded] = useState(false);
  const [model, setModel] = useState(models[0] ?? "GPT 5.5");
  const [effortIndex, setEffortIndex] = useState(1);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activeAttachment, setActiveAttachment] = useState<{ attachment: Attachment; rect: DOMRect } | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioData, setAudioData] = useState([0, 0, 0, 0, 0]);
  const [recordingError, setRecordingError] = useState("");
  const [containerHeight, setContainerHeight] = useState(116);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const attachmentsRef = useRef<Attachment[]>([]);
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : localValue;
  const hasValue = currentValue.trim() !== "" || attachments.length > 0;

  const setCurrentValue = useCallback((next: string) => {
    if (!isControlled) setLocalValue(next);
    onChange?.(next);
  }, [isControlled, onChange]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (audioContextRef.current) void audioContextRef.current.close();
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecording(false);
    setAudioData([0, 0, 0, 0, 0]);
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled) return;
    setExpanded(true);
    setRecordingError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingError("В этом браузере нет доступа к микрофону.");
      return;
    }
    if (onVoiceInput && typeof MediaRecorder === "undefined") {
      setRecordingError("В этом браузере нет записи голоса.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setRecordingError("Разреши доступ к микрофону и попробуй ещё раз.");
      return;
    }

    streamRef.current = stream;
    if (onVoiceInput) {
      const supportedType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = supportedType ? new MediaRecorder(stream, { mimeType: supportedType }) : new MediaRecorder(stream);
      recordingChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const audio = new Blob(recordingChunksRef.current, { type: recorder.mimeType || supportedType || "audio/webm" });
        recordingChunksRef.current = [];
        if (audio.size > 0) void onVoiceInput(audio);
      };
      recorder.onerror = () => setRecordingError("Во время записи произошла ошибка. Попробуйте ещё раз.");
      recorder.start();
    }
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      setRecording(true);
      setRecordingError("Микрофон подключён, но визуализатор недоступен в этом браузере.");
      return;
    }

    const audioContext = new AudioCtx();
    audioContextRef.current = audioContext;
    if (audioContext.state === "suspended") void audioContext.resume();

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.65;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateVisualizer = () => {
      analyser.getByteFrequencyData(dataArray);
      const bands = Array.from({ length: 5 }, (_, index) => {
        const start = Math.floor(index * dataArray.length / 5);
        const end = Math.max(start + 1, Math.floor((index + 1) * dataArray.length / 5));
        let sum = 0;
        for (let offset = start; offset < end; offset += 1) sum += dataArray[offset] ?? 0;
        const normalized = sum / (end - start) / 255;
        const aboveNoise = Math.max(0, (normalized - 0.02) / 0.25);
        return Math.min(1, Math.pow(aboveNoise, 0.8));
      });
      setAudioData(bands);
      rafRef.current = window.requestAnimationFrame(updateVisualizer);
    };

    setRecording(true);
    updateVisualizer();
  }, [disabled, onVoiceInput, stopRecording]);

  useEffect(() => { attachmentsRef.current = attachments; }, [attachments]);
  useEffect(() => () => { stopRecording(); attachmentsRef.current.forEach(({ url }) => URL.revokeObjectURL(url)); }, [stopRecording]);
  useEffect(() => {
    const handleChatClose = () => stopRecording();
    document.addEventListener("nikass:chat-close", handleChatClose);
    return () => document.removeEventListener("nikass:chat-close", handleChatClose);
  }, [stopRecording]);

  useEffect(() => {
    if (currentValue.trim() !== "" || attachments.length > 0) setExpanded(true);
    if (!textareaRef.current || !expanded) return;
    textareaRef.current.style.height = "0px";
    const nextHeight = Math.max(68, Math.min(textareaRef.current.scrollHeight, 160));
    textareaRef.current.style.height = `${nextHeight}px`;
    setContainerHeight(nextHeight + 48);
  }, [currentValue, attachments.length, expanded]);

  const submit = () => {
    if (!hasValue || recording || disabled) return;
    onSubmit?.(currentValue, { model, effort: efforts[effortIndex] ?? "Medium", attachments: attachments.map(({ file }) => file) });
    setCurrentValue("");
    attachments.forEach(({ url }) => URL.revokeObjectURL(url));
    setAttachments([]);
    setExpanded(false);
    setModelMenuOpen(false);
  };

  const chooseFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/")).slice(0, maxAttachments - attachments.length);
    event.target.value = "";
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => setAttachments((current) => [...current, { id: `${file.name}-${file.lastModified}-${Math.random()}`, file, url, name: file.name, width: image.naturalWidth, height: image.naturalHeight }]);
      image.onerror = () => setAttachments((current) => [...current, { id: `${file.name}-${file.lastModified}-${Math.random()}`, file, url, name: file.name, width: 800, height: 600 }]);
      image.src = url;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); }
    if (event.key === "Escape" && !hasValue) { setExpanded(false); setModelMenuOpen(false); }
  };

  const openPrompt = () => {
    setExpanded(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return <div className={`prompt-input-root ${className}`} style={{ maxWidth: expanded ? 480 : 320 }}>
    <input ref={fileInputRef} className="prompt-input-hidden" type="file" accept="image/*" multiple onChange={chooseFiles} />
    <div className={`prompt-input-attachments ${attachments.length && expanded ? "is-visible" : ""}`}>
      {attachments.map((attachment, index) => <div key={attachment.id} className="prompt-input-thumb" style={{ animationDelay: `${index * 35}ms` }}>
        <button type="button" onClick={(event) => setActiveAttachment({ attachment, rect: event.currentTarget.getBoundingClientRect() })} aria-label={`Open preview of ${attachment.name}`}><img src={attachment.url} alt={attachment.name} /></button>
        <button type="button" className="prompt-input-remove" onClick={() => { URL.revokeObjectURL(attachment.url); setAttachments((current) => current.filter(({ id }) => id !== attachment.id)); }} aria-label={`Remove ${attachment.name}`}>×</button>
      </div>)}
    </div>
    <div className={`prompt-input-surface ${expanded ? "is-expanded" : ""}`} style={{ height: expanded ? containerHeight : 48 }} onClick={() => expanded && textareaRef.current?.focus()}>
      <textarea ref={textareaRef} value={currentValue} onChange={(event) => setCurrentValue(event.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} aria-label="Prompt" disabled={recording || disabled} className={`prompt-input-textarea ${expanded ? "is-visible" : ""}`} />
      <button type="button" className={`prompt-input-placeholder ${expanded ? "is-hidden" : ""}`} onClick={openPrompt} aria-label="Open prompt input" disabled={disabled}>{placeholder}</button>
      <div className={`prompt-input-bottom-actions ${expanded && !recording && !disabled ? "is-visible" : ""}`}>
        <div className="prompt-input-model-wrap">
          <button type="button" className="prompt-input-control" onClick={(event) => { event.stopPropagation(); setModelMenuOpen((open) => !open); }} aria-label={`Select model. Current: ${model}`}><ModelIcon model={model} /><MorphingText text={model} /></button>
          <div className={`prompt-input-model-menu ${modelMenuOpen ? "is-visible" : ""}`}>
            {models.map((item) => <button key={item} type="button" onClick={() => { setModel(item); setModelMenuOpen(false); }}><ModelIcon model={item} />{item}</button>)}
          </div>
        </div>
        <button type="button" className="prompt-input-control" onClick={() => setEffortIndex((index) => (index + 1) % efforts.length)}><span className="prompt-input-bars">{[0, 1, 2].map((bar) => <i key={bar} className={(bar <= effortIndex ? "is-on" : "")} />)}</span><MorphingText text={efforts[effortIndex] ?? "Medium"} /></button>
        <button type="button" className="prompt-input-control prompt-input-plus" onClick={() => fileInputRef.current?.click()} disabled={attachments.length >= maxAttachments} aria-label="Attach image"><Icon name="plus" /></button>
      </div>
      <div className={`prompt-input-wave ${recording ? "is-visible" : ""}`}>{audioData.map((height, index) => <i key={index} style={{ height: `${Math.max(4, height * 28)}px` }} />)}</div>
      <button type="button" className="prompt-input-action" disabled={disabled && !recording} onClick={() => recording ? stopRecording() : hasValue ? submit() : startRecording()} aria-label={hasValue ? "Send prompt" : recording ? "Stop recording" : "Use voice input"}><span className={hasValue && !recording ? "is-visible" : ""}><Icon name="arrow" /></span><span className={!hasValue && !recording ? "is-visible" : ""}><Icon name="mic" /></span><span className={recording ? "is-visible" : ""}><Icon name="stop" /></span></button>
    </div>
    {recordingError && <p className="prompt-input-error" role="status">{recordingError}</p>}
    {activeAttachment && <AttachmentGallery attachment={activeAttachment.attachment} originRect={activeAttachment.rect} onClose={() => setActiveAttachment(null)} />}
  </div>;
}
