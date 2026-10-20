import { useEffect, useRef, useState, useCallback } from "react";
import { Box, IconButton, Paper, Typography } from "@mui/material";
import { Close, Mic, MicOff, VolumeOff, VolumeUp } from "@mui/icons-material";

interface SpeechRecognitionResult {
  [index: number]: { transcript: string; confidence: number };
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResult[];
  resultIndex: number;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface WindowWithSpeechAPI extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
}

interface VoiceOverlayProps {
  open: boolean;
  onClose: () => void;
  onSendTranscript: (transcript: string) => void;
}

const WAVE_COLORS = ["#22d3ee", "#a855f7", "#f472b6", "#38bdf8"];

export default function VoiceOverlay({
  open,
  onClose,
  onSendTranscript,
}: VoiceOverlayProps) {
  const [interimTranscript, setInterimTranscript] = useState("");
  const [micMuted, setMicMuted] = useState(false);
  const [volumeEnabled, setVolumeEnabled] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTranscriptRef = useRef("");

  const onCloseRef = useRef(onClose);
  const onSendTranscriptRef = useRef(onSendTranscript);
  const micMutedRef = useRef(micMuted);
  const openRef = useRef(open);

  useEffect(() => {
    micMutedRef.current = micMuted;
  }, [micMuted]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    onCloseRef.current = onClose;
    onSendTranscriptRef.current = onSendTranscript;
  }, [onClose, onSendTranscript]);

  const createRecognition = useCallback((): SpeechRecognitionInstance | null => {
    const win = window as unknown as WindowWithSpeechAPI;
    const SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechCtor) return null;

    const rec = new SpeechCtor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let full = "";
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript;
        if (event.results[i].isFinal) full += " ";
      }

      finalTranscriptRef.current = full;
      setInterimTranscript(full);

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const text = finalTranscriptRef.current.trim();
        if (text) {
          onSendTranscriptRef.current(text);
          onCloseRef.current();
        }
      }, 2500);
    };

    rec.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        console.warn("Speech recognition error:", e.error);
      }
    };

    rec.onend = () => {
      if (!micMutedRef.current && openRef.current && recognitionRef.current === rec) {
        try {
          rec.start();
        } catch {
          /* noop */
        }
      }
    };

    return rec;
  }, []);

  const startRecognition = useCallback(() => {
    if (recognitionRef.current) return;
    const rec = createRecognition();
    if (!rec) return;
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      console.error("SpeechRecognition start error:", err);
    }
  }, [createRecognition]);

  const stopRecognition = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      try {
        rec.abort();
      } catch {
        /* noop */
      }
    }
  }, []);

  const drawWaveform = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      width: number,
      height: number,
      analyser: AnalyserNode,
      muted: boolean,
    ) => {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const amplitude = muted
        ? 0
        : dataArray.reduce((a, b) => a + b, 0) / bufferLength / 255;
      const maxRadius = Math.min(width, height) * 0.35;
      const pulseRadius = 40 + amplitude * maxRadius * 0.6;

      const gradient = ctx.createLinearGradient(
        0,
        cy - pulseRadius,
        0,
        cy + pulseRadius,
      );
      gradient.addColorStop(0, WAVE_COLORS[0]);
      gradient.addColorStop(0.5, WAVE_COLORS[2]);
      gradient.addColorStop(1, WAVE_COLORS[1]);

      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      const barCount = 36;
      const barWidth = 5;
      const barGap = 6;
      const maxBarHeight = height * 0.22;

      for (let i = 0; i < barCount; i++) {
        const val = muted ? 0 : dataArray[i] || 0;
        const normalized = val / 255;
        const barHeight = Math.max(
          4,
          normalized * maxBarHeight * (0.5 + amplitude * 0.8),
        );
        const x =
          cx - (barCount * (barWidth + barGap)) / 2 + i * (barWidth + barGap);
        const y = cy - barHeight / 2;

        const hue = 180 + (i / barCount) * 120;
        ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${0.5 + normalized * 0.5})`;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    },
    [],
  );

  const drawIdle = useCallback(
    (ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) => {
      const radius = 45 + Math.sin(time * 2) * 5;
      const gradient = ctx.createRadialGradient(
        cx,
        cy,
        10,
        cx,
        cy,
        radius + 20,
      );
      gradient.addColorStop(0, "#38bdf8");
      gradient.addColorStop(1, "transparent");

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "13px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Listening...", cx, cy + 5);
    },
    [],
  );

  // Main Canvas Render Loop
  useEffect(() => {
    if (!open) return;
    let isActive = true;

    const render = () => {
      if (!isActive) return;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const { width, height } = canvas;
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(0, 0, width, height);

          const time = Date.now() / 600;
          if (analyserRef.current) {
            drawWaveform(
              ctx,
              width / 2,
              height / 2,
              width,
              height,
              analyserRef.current,
              micMuted,
            );
          } else {
            drawIdle(ctx, width / 2, height / 2, time);
          }
        }
      }
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isActive = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [open, micMuted, drawWaveform, drawIdle]);

  // Audio Context & Speech Recognition Lifecycle
  useEffect(() => {
    if (!open) return;

    finalTranscriptRef.current = "";
    setTimeout(() => setInterimTranscript(""), 0);

    // 1. Audio Media Setup
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(async (stream) => {
        streamRef.current = stream;
        const AudioCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: new () => AudioContext })
            .webkitAudioContext;
        if (!AudioCtor) return;

        const ctx = new AudioCtor();
        if (ctx.state === "suspended") {
          await ctx.resume();
        }

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = ctx;
        analyserRef.current = analyser;
        sourceRef.current = source;
      })
      .catch((err) => console.error("Mic access denied:", err));

    // 2. Speech Recognition Setup
    startRecognition();

    return () => {
      stopRecognition();
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch {
          /* noop */
        }
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        try {
          audioContextRef.current.close();
        } catch {
          /* noop */
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [open, startRecognition, stopRecognition]);

  const toggleMic = () => {
    setMicMuted((prev) => {
      const next = !prev;
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      if (next) {
        stopRecognition();
      }
      return next;
    });
  };

  // Restart recognition when unmuting (micMuted goes true -> false)
  useEffect(() => {
    if (!open || micMuted) return;
    startRecognition();
  }, [micMuted, open, startRecognition]);

  const toggleVolume = () => {
    setVolumeEnabled((prev) => {
      if (!prev) {
        window.speechSynthesis?.resume();
      } else {
        window.speechSynthesis?.pause();
      }
      return !prev;
    });
  };

  if (!open) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "rgba(15, 23, 42, 0.94)",
        backdropFilter: "blur(16px)",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Top Right Close Button */}
      <IconButton
        onClick={onClose}
        sx={{
          position: "fixed",
          top: { xs: 16, md: 28 },
          right: { xs: 16, md: 28 },
          width: { xs: 44, md: 52 },
          height: { xs: 44, md: 52 },
          bgcolor: "#ef4444",
          color: "#ffffff",
          borderRadius: "4px",
          "&:hover": { bgcolor: "#dc2626" },
        }}
      >
        <Close fontSize="medium" />
      </IconButton>

      <Box
        sx={{
          position: "absolute",
          top: { xs: 20, md: 32 },
          left: { xs: 20, md: 32 },
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            color: "#94a3b8",
            letterSpacing: 1,
            textTransform: "uppercase",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          RoboFriend Voice Coach
        </Typography>
      </Box>

      {/* Reactive Visualizer Canvas */}
      <Paper
        sx={{
          width: { xs: 260, sm: 300, md: 340 },
          height: { xs: 260, sm: 300, md: 340 },
          borderRadius: "50%",
          overflow: "hidden",
          bgcolor: "#0f172a",
          mb: 3,
          boxShadow: "0 0 50px rgba(56, 189, 248, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <canvas
          ref={canvasRef}
          width={340}
          height={340}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </Paper>

      <Typography
        variant="h5"
        sx={{
          color: "#38bdf8",
          mb: 1.5,
          fontWeight: 600,
          fontSize: { xs: 22, md: 28 },
        }}
      >
        {micMuted ? "Microphone Muted" : "Listening..."}
      </Typography>

      {/* Live Transcript Box */}
      <Box
        sx={{
          px: 3,
          py: 1,
          textAlign: "center",
          color: "#e2e8f0",
          fontSize: { xs: 15, md: 17 },
          maxWidth: "550px",
          minHeight: "36px",
          bgcolor: "rgba(255, 255, 255, 0.05)",
          borderRadius: "4px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {interimTranscript || "Say something..."}
      </Box>

      {/* Bottom Center Toggles */}
      <Box
        sx={{
          position: "fixed",
          bottom: { xs: 36, md: 48 },
          display: "flex",
          gap: 2.5,
          justifyContent: "center",
        }}
      >
        <IconButton
          onClick={toggleMic}
          sx={{
            width: 52,
            height: 52,
            borderRadius: "4px",
            bgcolor: micMuted ? "#ef4444" : "#1e293b",
            color: "#ffffff",
            "&:hover": { bgcolor: micMuted ? "#dc2626" : "#334155" },
          }}
          title={micMuted ? "Unmute microphone" : "Mute microphone"}
        >
          {micMuted ? <MicOff fontSize="small" /> : <Mic fontSize="small" />}
        </IconButton>

        <IconButton
          onClick={toggleVolume}
          sx={{
            width: 52,
            height: 52,
            borderRadius: "4px",
            bgcolor: volumeEnabled ? "#1e293b" : "#ef4444",
            color: "#ffffff",
            "&:hover": { bgcolor: volumeEnabled ? "#334155" : "#dc2626" },
          }}
          title={
            volumeEnabled ? "Disable speaker output" : "Enable speaker output"
          }
        >
          {volumeEnabled ? (
            <VolumeUp fontSize="small" />
          ) : (
            <VolumeOff fontSize="small" />
          )}
        </IconButton>
      </Box>
    </Box>
  );
}
