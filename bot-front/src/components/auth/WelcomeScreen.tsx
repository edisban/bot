import { Box, Paper, Stack, Avatar, Typography, Button } from "@mui/material";
import { SmartToy } from "@mui/icons-material";

type WelcomeScreenProps = {
  username: string | undefined;
  onEnterChat: () => void;
};

export default function WelcomeScreen({
  username,
  onEnterChat,
}: WelcomeScreenProps) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        px: { xs: 1, md: 2 },
      }}
    >
      <Paper
        sx={{
          width: "100%",
          maxWidth: 520,
          p: { xs: 3, md: 5 },
          textAlign: "center",
          borderRadius: 2,
          mx: { xs: 1, md: 0 },
        }}
      >
        <Stack spacing={3}>
          <Avatar
            sx={{ width: 72, height: 72, bgcolor: "primary.main", mx: "auto" }}
          >
            <SmartToy sx={{ fontSize: 34 }} />
          </Avatar>

          <Typography
            variant="h3"
            sx={{ fontSize: { xs: "2rem", md: "3rem" } }}
          >
            Welcome {username || "friend"}, how are you today?
          </Typography>

          <Typography variant="body1" color="text.secondary">
            I am ready to help with your plans, reminders, memory, and
            conversation.
          </Typography>

          <Button variant="contained" size="large" onClick={onEnterChat}>
            Open conversation
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
