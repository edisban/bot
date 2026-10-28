import { useState, type FormEvent } from "react";
import {
  ThemeProvider,
  CssBaseline,
  Snackbar,
  Alert,
  Box,
} from "@mui/material";
import AuthScreen from "./components/auth/AuthScreen";
import WelcomeScreen from "./components/auth/WelcomeScreen";
import ChatScreen from "./components/chat/ChatScreen";
import { apiFetch } from "./api/apiClient";
import { getTheme } from "./theme/theme";

const STORAGE_KEY = "robofriend-user";

interface SessionUser {
  userId: number;
  username: string;
  token: string;
}

type Screen = "login" | "welcome" | "chat";

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(() => {
    const storedUser = localStorage.getItem(STORAGE_KEY);
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as SessionUser;
        if (parsedUser?.userId && parsedUser?.username && parsedUser?.token) {
          return parsedUser;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    return null;
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [screen, setScreen] = useState<Screen>(() =>
    currentUser ? "chat" : "login",
  );
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleAuthSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password.trim()) {
      setAuthError("Please enter a username and password.");
      return;
    }

    setAuthError("");

    try {
      const endpoint =
        authMode === "login" ? "/api/auth/login" : "/api/auth/register";

      const data = await apiFetch<{ userId: number; username?: string; token?: string }>(
        endpoint,
        {
          method: "POST",
          body: JSON.stringify({ username: trimmedUsername, password }),
        },
      );

      const user = {
        userId: Number(data.userId),
        username: data.username || trimmedUsername,
        token: data.token || "",
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      setCurrentUser(user);
      setScreen("welcome");
      setPassword("");
      setSnackbarOpen(true);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Authentication failed.",
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
    setUsername("");
    setPassword("");
    setScreen("login");
  };

  const renderAuthScreen = () => (
    <Box
      sx={{ minHeight: "100vh", display: "grid", placeItems: "center", px: 2 }}
    >
      <AuthScreen
        authMode={authMode}
        username={username}
        password={password}
        authError={authError}
        onUsernameChange={(value) => setUsername(value)}
        onPasswordChange={(value) => setPassword(value)}
        onToggleMode={() => {
          setAuthError("");
          setAuthMode((prev) => (prev === "login" ? "register" : "login"));
          setPassword("");
        }}
        onSubmit={handleAuthSubmit}
      />
    </Box>
  );

  const renderWelcomeScreen = () => (
    <WelcomeScreen
      username={currentUser?.username}
      onEnterChat={() => setScreen("chat")}
    />
  );

  const renderChatScreen = () => (
    <ChatScreen
      currentUser={currentUser!}
      darkMode={darkMode}
      onToggleTheme={() => setDarkMode((prev) => !prev)}
      onLogout={handleLogout}
    />
  );

  return (
    <ThemeProvider theme={getTheme(darkMode)}>
      <CssBaseline />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" sx={{ width: "100%" }}>
          Welcome back! You are logged in successfully.
        </Alert>
      </Snackbar>
      {screen === "login"
        ? renderAuthScreen()
        : screen === "welcome"
          ? renderWelcomeScreen()
          : renderChatScreen()}
    </ThemeProvider>
  );
}

export default App;
