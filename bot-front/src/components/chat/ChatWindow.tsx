import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { ContentCopy, Person, SmartToy } from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type Message = {
  role: "bot" | "user";
  text: string;
  createdAt?: string;
};

type ChatWindowProps = {
  messages: Message[];
  onCopyBotMessage: (text: string) => void;
  onDeleteMessage: (id: string) => void;
};

const USER_GRADIENT = "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)";

export default function ChatWindow({
  messages,
  onCopyBotMessage,
  onDeleteMessage,
}: ChatWindowProps) {
  const [deleteDialog, setDeleteDialog] = useState<{
    x: number;
    y: number;
    id: string;
  } | null>(null);

  const handleContextMenu = (event: React.MouseEvent, id: string) => {
    event.preventDefault();
    setDeleteDialog({ x: event.clientX, y: event.clientY, id });
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog) {
      onDeleteMessage(deleteDialog.id);
      setDeleteDialog(null);
    }
  };

  const handleCancel = () => {
    setDeleteDialog(null);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 1, md: 1.5 },
      }}
    >
      {messages.map((msg, index) => (
        <Stack
          key={`${msg.role}-${index}`}
          direction="row"
          spacing={1}
          sx={{
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            alignItems: "flex-end",
          }}
        >
          {msg.role === "bot" && (
            <Avatar
              sx={{
                bgcolor: "secondary.main",
                width: 28,
                height: 28,
                flexShrink: 0,
              }}
            >
              <SmartToy sx={{ fontSize: 16 }} />
            </Avatar>
          )}

          <Stack
            direction="column"
            spacing={0.25}
            sx={{ maxWidth: { xs: "92%", sm: "85%", md: "72%" } }}
          >
            <Paper
              sx={{
                p: { xs: 1, md: 1.5 },
                borderRadius: 3,
                position: "relative",
                overflow: "hidden",
                bgcolor:
                  msg.role === "user" ? "transparent" : "background.paper",
                color: msg.role === "user" ? "#fff" : "text.primary",
                border:
                  msg.role === "user"
                    ? "none"
                    : "1px solid rgba(255, 255, 255, 0.06)",
                boxShadow:
                  msg.role === "user"
                    ? "0 4px 20px rgba(99, 102, 241, 0.35)"
                    : "0 4px 20px rgba(0, 0, 0, 0.25)",
                background: msg.role === "user" ? USER_GRADIENT : "none",
                cursor: "pointer",
                "&:hover": {
                  opacity: 0.92,
                  boxShadow:
                    msg.role === "user"
                      ? "0 6px 24px rgba(99, 102, 241, 0.45)"
                      : "0 6px 24px rgba(0, 0, 0, 0.35)",
                },
              }}
              onContextMenu={(event) =>
                handleContextMenu(event, `${msg.role}-${index}`)
              }
            >
              <Box sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {msg.role === "user" ? (
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {msg.text}
                  </Typography>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                )}
              </Box>
            </Paper>

            <Box
              sx={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                alignItems: "center",
                px: 1,
                "&:hover .copy-chip": { opacity: 1 },
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color:
                    msg.role === "user"
                      ? "rgba(255, 255, 255, 0.55)"
                      : "text.secondary",
                  fontSize: 11,
                  letterSpacing: 0.2,
                  mr: msg.role === "bot" ? 1 : 0,
                }}
              >
                {msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </Typography>
              {msg.role === "bot" && (
                <Chip
                  label="Copy"
                  icon={<ContentCopy fontSize="inherit" />}
                  size="small"
                  variant="outlined"
                  color="default"
                  className="copy-chip"
                  sx={{
                    fontSize: 10,
                    px: 0.75,
                    py: 0.1,
                    borderColor: "rgba(255, 255, 255, 0.12)",
                    "&:hover": { borderColor: "rgba(255, 255, 255, 0.35)" },
                    opacity: 0,
                    transition: "opacity 0.15s ease",
                  }}
                  onClick={() => onCopyBotMessage(msg.text)}
                />
              )}
            </Box>
          </Stack>

          {msg.role === "user" && (
            <Avatar
              sx={{
                bgcolor: "primary.main",
                width: 28,
                height: 28,
                flexShrink: 0,
              }}
            >
              <Person sx={{ fontSize: 16 }} />
            </Avatar>
          )}
        </Stack>
      ))}

      {deleteDialog && (
        <Box
          onClick={handleCancel}
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1300,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-start",
            pointerEvents: "auto",
          }}
        >
          <Box
            onClick={(event) => event.stopPropagation()}
            sx={{
              position: "absolute",
              left: deleteDialog.x,
              top: deleteDialog.y,
              transform: "none",
              pointerEvents: "auto",
              bgcolor: "background.paper",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 3,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
              p: 1.5,
              minWidth: 200,
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, mb: 1, color: "text.primary" }}
            >
              Delete message?
            </Typography>
            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
              <Button
                size="small"
                onClick={handleCancel}
                sx={{
                  color: "text.secondary",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.04)" },
                }}
              >
                Cancel
              </Button>
              <Button
                size="small"
                onClick={handleDeleteConfirm}
                sx={{
                  color: "error.main",
                  "&:hover": { bgcolor: "rgba(239, 68, 68, 0.1)" },
                }}
              >
                Delete
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
