import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Paper,
  Snackbar,
  Toolbar,
  Typography,
  Alert,
} from "@mui/material";
import { DarkMode, LightMode, SmartToy } from "@mui/icons-material";
import VoiceOverlay from "../VoiceOverlay";
import ChatWindow from "./ChatWindow";
import MessageInput from "./MessageInput";
import ReminderVault from "../reminders/ReminderVault";
import { getChatHistory, sendChatMessage } from "../../api/chatApi";
import {
  deleteReminder,
  getReminders,
  updateReminderStatus,
  type ReminderItem,
} from "../../api/reminderApi";
import { getMemory, type MemoryItem } from "../../api/memoryApi";

interface SessionUser {
  userId: number;
  username: string;
}

type ScreenMessage = {
  role: "bot" | "user";
  text: string;
  createdAt?: string;
};

type ChatScreenProps = {
  currentUser: SessionUser;
  darkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
};

const DUE_CHECK_INTERVAL_MS = 30000;

export default function ChatScreen({
  currentUser,
  darkMode,
  onToggleTheme,
  onLogout,
}: ChatScreenProps) {
  const [messages, setMessages] = useState<ScreenMessage[]>([
    {
      role: "bot",
      text: "Welcome! I am RoboFriend. Tell me how I can help today.",
    },
  ]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [, setMemories] = useState<MemoryItem[]>([]);

  const [input, setInput] = useState("");
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    const content = contentRef.current;
    if (!el || !content || typeof ResizeObserver === "undefined") return;

    // Keep the viewport pinned to the newest message whenever the rendered
    // content grows (initial history load, new messages, markdown reflow).
    const observer = new ResizeObserver(() => {
      scrollToBottom();
    });
    observer.observe(content);

    scrollToBottom();

    return () => observer.disconnect();
  }, [scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
    // Markdown and async content can change layout after the first paint.
    const timer = setTimeout(() => scrollToBottom(), 120);
    return () => clearTimeout(timer);
  }, [messages, scrollToBottom]);

  const handleDeleteMessage = (id: string) => {
    setMessages((prev) =>
      prev.filter((_, idx) => `${prev[idx].role}-${idx}` !== id),
    );
  };

  useEffect(() => {
    return () => {
      if (synthRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const userId = currentUser?.userId;

  const announceDueReminders = useCallback((items: ReminderItem[]) => {
    const now = new Date();
    const due = items.filter(
      (r) => r.status === "PENDING" && new Date(r.scheduledAt) <= now,
    );
    due.forEach((r) => {
      setSnackbarMessage(`Reminder: ${r.title}`);
      setSnackbarOpen(true);
      setReminders((prev) =>
        prev.map((item) =>
          item.id === r.id ? { ...item, status: "SENT" as const } : item,
        ),
      );
      updateReminderStatus(r.id, "SENT").catch((error) => {
        console.warn("Failed to persist reminder status", error);
      });
    });
  }, []);

  const refreshReminders = useCallback(() => {
    if (!userId) return;
    getReminders(userId)
      .then((data) => {
        const items = Array.isArray(data) ? data : [];
        setReminders(items);
        announceDueReminders(items);
      })
      .catch(() => {
        setReminders([]);
      });
  }, [userId, announceDueReminders]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    getChatHistory(userId)
      .then((data) => {
        if (cancelled) return;
        const chatMessages = Array.isArray(data) ? data : [];
        const mapped: ScreenMessage[] = chatMessages.map(
          (item: { sender: string; content: string; createdAt?: string }) => ({
            role: item.sender === "USER" ? "user" : "bot",
            text: item.content,
            createdAt: item.createdAt,
          }),
        );
        setMessages(
          mapped.length > 0
            ? mapped
            : [
                {
                  role: "bot",
                  text: `Welcome ${currentUser.username}, how are you today?`,
                },
              ],
        );
      })
      .catch(() => {
        if (cancelled) return;
        setMessages([
          {
            role: "bot",
            text: `Welcome ${currentUser.username}, how are you today?`,
          },
        ]);
      });

    refreshReminders();

    getMemory(userId)
      .then((data) => {
        if (cancelled) return;
        setMemories(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setMemories([]);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, currentUser.username, scrollToBottom, refreshReminders]);

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(refreshReminders, DUE_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId, refreshReminders]);

  const handleSend = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isSending) return;
    setInput("");
    setIsSending(true);
    await sendVoiceMessage(trimmed);
    setIsSending(false);
  };

  const sendVoiceMessage = async (message: string): Promise<string> => {
    setMessages((prev) => [...prev, { role: "user", text: message }]);

    try {
      const { reply } = await sendChatMessage({
        userId: currentUser.userId,
        message,
      });
      setMessages((prev) => [...prev, { role: "bot", text: reply }]);

      const reminderData = await getReminders(currentUser.userId);
      setReminders(Array.isArray(reminderData) ? reminderData : []);

      getMemory(currentUser.userId)
        .then((data) => setMemories(Array.isArray(data) ? data : []))
        .catch(() => undefined);

      if (voiceOverlayOpen) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(reply);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onend = () => {
          synthRef.current = null;
          setVoiceOverlayOpen(false);
        };
        synthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }

      return reply;
    } catch {
      const fallbackReply =
        "I could not reach the server at the moment. Please try again.";
      setMessages((prev) => [...prev, { role: "bot", text: fallbackReply }]);
      return fallbackReply;
    } finally {
      setIsSending(false);
    }
  };

  const handleVoiceTranscript = async (transcript: string) => {
    setInput("");
    await sendVoiceMessage(transcript);
  };

  const handleReminderDone = (id: number) => {
    setReminders((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "DONE" as const } : item,
      ),
    );
    updateReminderStatus(id, "DONE").catch((error) => {
      console.warn("Failed to persist reminder status", error);
      refreshReminders();
    });
  };

  const handleReminderDelete = (id: number) => {
    setReminders((prev) => prev.filter((item) => item.id !== id));
    deleteReminder(id).catch((error) => {
      console.warn("Failed to delete reminder", error);
      refreshReminders();
    });
  };

  const handleCopyBotMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setSnackbarMessage("Copied to clipboard");
    setSnackbarOpen(true);
  };

  const handleLogoutConfirm = () => {
    setLogoutDialogOpen(false);
    onLogout();
  };

  return (
    <>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
          minHeight: "100vh",
          bgcolor: "background.default",
          color: "text.primary",
        }}
      >
        <AppBar
          position="sticky"
          color="transparent"
          elevation={0}
          sx={{
            width: "100%",
            borderBottom: 1,
            borderColor: "divider",
            background: "transparent",
            flexShrink: 0,
            px: { xs: 1, md: 3 },
          }}
        >
          <Toolbar
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              minHeight: 56,
              width: "100%",
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <SmartToy color="primary" />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  letterSpacing: -0.5,
                  display: { xs: "flex", md: "flex" },
                }}
              >
                RoboFriend
              </Typography>
            </Stack>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", flexShrink: 0 }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: { xs: "flex", md: "flex" }, mr: 1 }}
              >
                {currentUser.username}
              </Typography>
              <IconButton
                onClick={onToggleTheme}
                color="inherit"
                size="small"
                sx={{ flexShrink: 0 }}
              >
                {darkMode ? <LightMode /> : <DarkMode />}
              </IconButton>
              <Button
                variant="text"
                size="small"
                onClick={() => setLogoutDialogOpen(true)}
                sx={{ flexShrink: 0 }}
              >
                Logout
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: { xs: "flex", md: "grid" },
            flexDirection: { xs: "column", md: "unset" },
            gridTemplateColumns: { xs: "unset", md: "1fr 280px" },
            gap: { xs: 2, md: 2 },
            p: { xs: 1, md: 2 },
          }}
        >
          <Paper
            sx={{
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              minHeight: 0,
              flex: { xs: 1, md: "unset" },
              height: { xs: "unset", md: "100%" },
              borderRadius: 3,
            }}
          >
            <Box
              sx={{
                p: { xs: 1, md: 2 },
                borderBottom: 1,
                borderColor: "divider",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Avatar
                  sx={{
                    bgcolor: "primary.main",
                    width: { xs: 24, md: 32 },
                    height: { xs: 24, md: 32 },
                  }}
                >
                  <SmartToy sx={{ fontSize: { xs: 14, md: 16 } }} />
                </Avatar>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, display: { xs: "flex", md: "flex" } }}
                >
                  Live Chat
                </Typography>
              </Stack>
              <Chip label="Online" color="success" size="small" />
            </Box>

            <Box
              ref={scrollRef}
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                p: { xs: 1, md: 2 },
                overscrollBehavior: "contain",
              }}
            >
              <Box ref={contentRef}>
                <ChatWindow
                  messages={messages}
                  onCopyBotMessage={handleCopyBotMessage}
                  onDeleteMessage={handleDeleteMessage}
                />
              </Box>
            </Box>

            <MessageInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              onVoice={() => setVoiceOverlayOpen(true)}
              disabled={isSending}
            />
          </Paper>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              minHeight: 0,
              height: { xs: "unset", md: "100%" },
              overflowY: "auto",
            }}
          >
            <ReminderVault
              reminders={reminders}
              onDoneToggle={handleReminderDone}
              onDelete={handleReminderDelete}
            />

          </Box>
        </Box>

        <Box
          sx={{
            width: "100%",
            borderTop: 1,
            borderColor: "divider",
            py: { xs: 1, md: 2 },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            bgcolor: "background.paper",
            color: "text.secondary",
            px: { xs: 1, md: 3 },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            RoboFriend
          </Typography>
          <Typography variant="caption">
            © 2026 RoboFriend AI. All rights reserved.
          </Typography>
        </Box>

        <VoiceOverlay
          open={voiceOverlayOpen}
          onClose={() => setVoiceOverlayOpen(false)}
          onSendTranscript={handleVoiceTranscript}
        />

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            severity="info"
            sx={{
              width: "100%",
              borderRadius: 3,
              bgcolor: "rgba(30, 34, 48, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "text.primary",
            }}
            onClose={() => setSnackbarOpen(false)}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>

        <Dialog
          open={logoutDialogOpen}
          onClose={() => setLogoutDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700 }}>Confirm Sign Out</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to log out?
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "flex-end", gap: 1 }}>
            <Button onClick={() => setLogoutDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleLogoutConfirm}
              color="error"
              variant="contained"
            >
              Log Out
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}
