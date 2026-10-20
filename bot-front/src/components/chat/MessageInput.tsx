import React from "react";
import { Box, Button, IconButton } from "@mui/material";
import { Mic, Send } from "@mui/icons-material";

type MessageInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
  onVoice: () => void;
  disabled?: boolean;
};

export default function MessageInput({
  value,
  onChange,
  onSend,
  onVoice,
  disabled = false,
}: MessageInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend(value.trim());
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <Box
      sx={{
        position: "sticky",
        bottom: 0,
        zIndex: 100,
        px: { xs: 1, md: 2 },
        pb: { xs: 1, md: 2 },
        pt: 1,
        backgroundColor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
        boxShadow: "0 -4px 24px rgba(0, 0, 0, 0.25)",
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          px: { xs: 1, md: 1.5 },
          py: { xs: 0.5, md: 1 },
          backdropFilter: "blur(12px)",
          "&:focus-within": {
            borderColor: "primary.main",
            boxShadow: "0 0 0 2px rgba(99, 102, 241, 0.2)",
            background: "background.paper",
          },
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Message RoboFriend..."
          disabled={disabled}
          style={
            {
              width: "100%",
              minHeight: "36px",
              fontSize: 14,
              letterSpacing: 0.3,
              color: "inherit",
              resize: "none",
              overflow: "hidden",
              border: "none",
              outline: "none",
              background: "transparent",
              padding: 0,
              paddingTop: 10,
              margin: 0,
            } as React.CSSProperties
          }
        />
        <IconButton
          size="small"
          onClick={onVoice}
          disabled={disabled}
          sx={{
            p: 0.5,
            width: { xs: 36, md: 40 },
            height: { xs: 36, md: 40 },
            minWidth: { xs: 36, md: 40 },
            borderRadius: 3,
            "&:hover": {
              bgcolor: "rgba(255, 255, 255, 0.08)",
              transform: "scale(1.05)",
            },
            backgroundImage:
              "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
            color: "#fff",
          }}
          title="Voice Mode"
        >
          <Mic fontSize="small" />
        </IconButton>
        <Button
          type="button"
          variant="contained"
          size="small"
          onClick={() => onSend(value.trim())}
          disabled={disabled || value.trim().length === 0}
          sx={{
            height: { xs: 36, md: 40 },
            minWidth: { xs: 80, md: 90 },
            borderRadius: 3,
            px: { xs: 1, md: 1.5 },
            fontWeight: 600,
            textTransform: "none",
            background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
            "&:hover": {
              background: "linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)",
              boxShadow: "0 0 18px rgba(168, 85, 247, 0.5)",
            },
            "&:disabled": {
              opacity: 0.5,
              cursor: "not-allowed",
            },
          }}
        >
          {value.trim().length > 0 ? "Send" : <Send fontSize="small" />}
        </Button>
      </Box>
    </Box>
  );
}
