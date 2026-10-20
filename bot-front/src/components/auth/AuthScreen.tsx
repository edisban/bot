import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  Avatar,
  Alert,
} from "@mui/material";
import { SmartToy, Lock } from "@mui/icons-material";
import { InputAdornment } from "@mui/material";

type AuthScreenProps = {
  authMode: "login" | "register";
  username: string;
  password: string;
  authError: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onToggleMode: () => void;
  onSubmit: (event: React.FormEvent) => void;
};

export default function AuthScreen({
  authMode,
  username,
  password,
  authError,
  onUsernameChange,
  onPasswordChange,
  onToggleMode,
  onSubmit,
}: AuthScreenProps) {
  return (
    <Paper
      sx={{
        width: "100%",
        maxWidth: 440,
        p: { xs: 2, md: 4 },
        borderRadius: 2,
        mx: { xs: 1, md: 0 },
      }}
    >
      <Stack spacing={3}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", justifyContent: "center" }}
        >
          <Avatar sx={{ bgcolor: "primary.main" }}>
            <SmartToy />
          </Avatar>
          <Typography variant="h4">RoboFriend</Typography>
        </Stack>

        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h6">
            {authMode === "login" ? "Welcome back" : "Create your profile"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {authMode === "login"
              ? "Sign in to continue your conversations."
              : "Create a secure profile and save it to the database."}
          </Typography>
        </Box>

        <Box component="form" onSubmit={onSubmit} noValidate>
          <Stack spacing={2}>
            <TextField
              label="Username"
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
              fullWidth
              autoComplete="username"
            />

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              fullWidth
              autoComplete={
                authMode === "login" ? "current-password" : "new-password"
              }
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />

            {authError && <Alert severity="error">{authError}</Alert>}

            <Button type="submit" variant="contained" size="large">
              {authMode === "login" ? "Sign in" : "Create profile"}
            </Button>

            <Button type="button" variant="text" onClick={onToggleMode}>
              {authMode === "login"
                ? "Create a new profile"
                : "I already have an account"}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}
