import {
  Button,
  Checkbox,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Delete, Event } from "@mui/icons-material";

export type ReminderItem = {
  id: number;
  title: string;
  scheduledAt: string;
  status: string;
  notes?: string;
};

type ReminderVaultProps = {
  reminders: ReminderItem[];
  onDoneToggle: (id: number) => void;
  onDelete: (id: number) => void;
};

export default function ReminderVault({
  reminders,
  onDoneToggle,
  onDelete,
}: ReminderVaultProps) {
  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <Paper
      sx={{
        width: { xs: "100%", md: 260 },
        p: { xs: 1, md: 2 },
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
        marginLeft: { xs: 0, md: 2 },
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          mb: { xs: 1, md: 2 },
          alignItems: "center",
          px: { xs: 1, md: 2 },
          mt: { xs: 0, md: -1 },
        }}
      >
        <Event color="secondary" />
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            letterSpacing: -0.2,
            fontSize: { xs: 16, md: 20 },
          }}
        >
          Reminders
        </Typography>
      </Stack>

      {reminders.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            borderStyle: "dashed",
            borderRadius: 2,
            p: { xs: 2, md: 3 },
            textAlign: "center",
            mt: "auto",
            mb: "auto",
            borderColor: "rgba(255, 255, 255, 0.08)",
            color: "text.secondary",
          }}
        >
          <Typography variant="body2">No reminders yet</Typography>
        </Paper>
      ) : (
        <Stack
          spacing={1}
          sx={{ flex: 1, overflowY: "auto", px: { xs: 1, md: 2 } }}
        >
          {reminders
            .slice()
            .sort(
              (a, b) =>
                new Date(a.scheduledAt).getTime() -
                new Date(b.scheduledAt).getTime(),
            )
            .map((item) => (
              <Paper
                key={item.id}
                variant="outlined"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  p: { xs: 0.75, md: 1.25 },
                  borderRadius: 3,
                  borderColor:
                    item.status === "DONE"
                      ? "rgba(255, 255, 255, 0.08)"
                      : "divider",
                  bgcolor:
                    item.status === "DONE"
                      ? "rgba(255, 255, 255, 0.03)"
                      : "background.paper",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "primary.main",
                    boxShadow: "0 4px 16px rgba(99, 102, 241, 0.15)",
                  },
                }}
              >
                <Checkbox
                  edge="start"
                  checked={item.status === "DONE"}
                  onClick={() => onDoneToggle(item.id)}
                  sx={{
                    ml: 0,
                    color:
                      item.status === "DONE"
                        ? "secondary.main"
                        : "text.secondary",
                    "&:hover": { color: "secondary.main" },
                  }}
                />
                <Stack
                  direction="column"
                  spacing={0.25}
                  sx={{ flex: 1, minWidth: 0 }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      textDecoration:
                        item.status === "DONE" ? "line-through" : "none",
                      color:
                        item.status === "DONE"
                          ? "text.secondary"
                          : "text.primary",
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.title}
                  </Typography>
                  <Chip
                    label={formatDate(item.scheduledAt)}
                    icon={<Event fontSize="inherit" />}
                    size="small"
                    variant="outlined"
                    color="default"
                    sx={{
                      fontSize: 9,
                      px: 0.5,
                      borderColor: "rgba(255, 255, 255, 0.12)",
                      color: "text.secondary",
                    }}
                  />
                </Stack>
                <Button
                  size="small"
                  onClick={() => onDelete(item.id)}
                  sx={{
                    p: 0.5,
                    color: "text.secondary",
                    "&:hover": {
                      color: "error.main",
                      bgcolor: "rgba(239, 68, 68, 0.1)",
                    },
                  }}
                  title="Delete reminder"
                >
                  <Delete fontSize="small" />
                </Button>
              </Paper>
            ))}
        </Stack>
      )}
    </Paper>
  );
}
