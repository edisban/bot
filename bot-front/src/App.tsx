import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CssBaseline,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material';
import {
  DarkMode,
  LightMode,
  Memory,
  Send,
  SmartToy,
  Person,
  Event,
  Lock,
} from '@mui/icons-material';

interface Message {
  role: 'bot' | 'user';
  text: string;
}

interface MemoryItem {
  id: number;
  fact: string;
  createdAt: string;
}

interface ReminderItem {
  id: number;
  title: string;
  scheduledAt: string;
  status: string;
  notes?: string;
}

interface SessionUser {
  userId: number;
  username: string;
}

type Screen = 'login' | 'welcome' | 'chat';
type AuthMode = 'login' | 'register';

const STORAGE_KEY = 'robofriend-user';

function App() {
    
  const [darkMode, setDarkMode] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(() => {
    const storedUser = localStorage.getItem(STORAGE_KEY);
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as SessionUser;
        if (parsedUser?.userId && parsedUser?.username) {
          return parsedUser;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    return null;
  });
  const [screen, setScreen] = useState<Screen>(() => (currentUser ? 'welcome' : 'login'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Welcome! I am RoboFriend. Tell me how I can help today.' },
  ]);
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: '#8b5cf6' },
      secondary: { main: '#22c55e' },
      background: {
        default: darkMode ? '#0f172a' : '#f3f4f6',
        paper: darkMode ? '#111827' : '#ffffff',
      },
      text: {
        primary: darkMode ? '#f8fafc' : '#0f172a',
        secondary: darkMode ? '#cbd5e1' : '#475569',
      },
    },
    typography: {
      fontFamily: 'Inter, Roboto, sans-serif',
      h4: { fontWeight: 700 },
      h6: { fontWeight: 700 },
    },
    components: {
      MuiPaper: {
        styleOverrides: { root: { borderRadius: 18 } },
      },
      MuiCard: {
        styleOverrides: { root: { borderRadius: 18 } },
      },
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, screen]);

  useEffect(() => {
    if (!currentUser?.userId) return;

    fetch(`/api/chat/history/${currentUser.userId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const chatMessages = Array.isArray(data) ? data : [];
        setMessages(
          chatMessages.length > 0
            ? chatMessages.map((item: { sender: string; content: string }) => ({
                role: item.sender === 'USER' ? 'user' : 'bot',
                text: item.content,
              }))
            : [{ role: 'bot', text: `Welcome ${currentUser.username}, how are you today?` }]
        );
      })
      .catch(() => {
        setMessages([{ role: 'bot', text: `Welcome ${currentUser.username}, how are you today?` }]);
      });

    fetch(`/api/memory/${currentUser.userId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setMemoryItems(Array.isArray(data) ? data : []))
      .catch(() => setMemoryItems([]));

    fetch(`/api/reminders/${currentUser.userId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setReminders(Array.isArray(data) ? data : []))
      .catch(() => setReminders([]));
  }, [currentUser]);

  const handleAuthSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password.trim()) {
      setAuthError('Please enter a username and password.');
      return;
    }

    setAuthError('');

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || (authMode === 'login' ? 'Unable to sign in.' : 'Unable to create profile.'));
      }

      const user = {
        userId: Number(data.userId),
        username: data.username || trimmedUsername,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      setCurrentUser(user);
      setPassword('');
      setScreen('welcome');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
    setUsername('');
    setPassword('');
    setMessages([{ role: 'bot', text: 'Welcome! I am RoboFriend. Tell me how I can help today.' }]);
    setScreen('login');
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !currentUser?.userId) return;

    const newMsg: Message = { role: 'user', text: trimmed };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.userId, message: trimmed }),
      });

      const data = await response.json();
      const botReply = data.reply ?? 'I am here to help.';
      setMessages((prev) => [...prev, { role: 'bot', text: botReply }]);

      const [memoryRes, reminderRes] = await Promise.all([
        fetch(`/api/memory/${currentUser.userId}`),
        fetch(`/api/reminders/${currentUser.userId}`),
      ]);

      const memoryData = await memoryRes.json();
      const reminderData = await reminderRes.json();
      setMemoryItems(Array.isArray(memoryData) ? memoryData : []);
      setReminders(Array.isArray(reminderData) ? reminderData : []);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: 'I could not reach the server at the moment. Please try again.' },
      ]);
    }
  };

  const renderAuthScreen = () => (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Paper sx={{ width: '100%', maxWidth: 440, p: 4, borderRadius: 4 }}>
        <Stack spacing={3}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}><SmartToy /></Avatar>
            <Typography variant="h4">RoboFriend</Typography>
          </Stack>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6">{authMode === 'login' ? 'Welcome back' : 'Create your profile'}</Typography>
            <Typography variant="body2" color="text.secondary">
              {authMode === 'login'
                ? 'Sign in to continue your conversations.'
                : 'Create a secure profile and save it to the database.'}
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleAuthSubmit} noValidate>
            <Stack spacing={2}>
              <TextField
                label="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                fullWidth
                autoComplete="username"
              />

              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                fullWidth
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
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
                {authMode === 'login' ? 'Sign in' : 'Create profile'}
              </Button>

              <Button
                type="button"
                variant="text"
                onClick={() => {
                  setAuthError('');
                  setAuthMode((prev) => (prev === 'login' ? 'register' : 'login'));
                  setPassword('');
                }}
              >
                {authMode === 'login' ? 'Create a new profile' : 'I already have an account'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );

  const renderWelcomeScreen = () => (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Paper sx={{ width: '100%', maxWidth: 520, p: 5, textAlign: 'center', borderRadius: 4 }}>
        <Stack spacing={3}>
          <Avatar sx={{ width: 72, height: 72, bgcolor: 'primary.main', mx: 'auto' }}>
            <SmartToy sx={{ fontSize: 34 }} />
          </Avatar>

          <Typography variant="h3" sx={{ fontSize: { xs: '2rem', md: '3rem' } }}>
            Welcome {currentUser?.username || 'friend'}, how are you today?
          </Typography>

          <Typography variant="body1" color="text.secondary">
            I am ready to help with your plans, reminders, memory, and conversation.
          </Typography>

          <Button variant="contained" size="large" onClick={() => setScreen('chat')}>
            Open conversation
          </Button>
        </Stack>
      </Paper>
    </Box>
  );

  if (screen === 'login') return <ThemeProvider theme={theme}><CssBaseline />{renderAuthScreen()}</ThemeProvider>;
  if (screen === 'welcome') return <ThemeProvider theme={theme}><CssBaseline />{renderWelcomeScreen()}</ThemeProvider>;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', overflow: 'hidden', bgcolor: 'background.default', color: 'text.primary' }}>
        <AppBar
          position="sticky"
          color="transparent"
          elevation={0}
          sx={{ borderBottom: 1, borderColor: 'divider', background: 'transparent', flexShrink: 0 }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', px: 3 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <SmartToy color="primary" />
              <Typography variant="h6">RoboFriend</Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {currentUser?.username}
              </Typography>
              <IconButton onClick={() => setDarkMode((prev) => !prev)} color="inherit">
                {darkMode ? <LightMode /> : <DarkMode />}
              </IconButton>
              <Button variant="outlined" size="small" onClick={handleLogout}>Logout</Button>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '280px 1fr 320px' },
            gap: 2,
            p: 2,
            height: 'calc(100vh - 72px)',
            minHeight: 0,
          }}
        >
          <Paper sx={{ p: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
              <Memory color="primary" />
              <Typography variant="h6">Memory Vault</Typography>
            </Stack>

            {memoryItems.length === 0 ? (
              <Box sx={{ border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 3, p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">No memories yet</Typography>
              </Box>
            ) : (
              <Stack spacing={1.5} sx={{ overflowY: 'auto', pr: 0.5 }}>
                {memoryItems.map((item) => (
                  <Paper key={item.id} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>{item.fact}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.createdAt).toLocaleString()}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>

          <Paper sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, height: '100%' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}><SmartToy /></Avatar>
                <Typography variant="h6">Live Chat</Typography>
              </Stack>
              <Chip label="Online" color="success" size="small" />
            </Box>

            <Box
              ref={scrollRef}
              sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, overscrollBehavior: 'contain', scrollBehavior: 'smooth' }}
            >
              {messages.map((msg, index) => (
                <Stack
                  key={`${msg.role}-${index}`}
                  direction="row"
                  spacing={1.5}
                  sx={{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
                >
                  {msg.role === 'bot' && (
                    <Avatar sx={{ bgcolor: 'secondary.main', width: 28, height: 28 }}>
                      <SmartToy sx={{ fontSize: 16 }} />
                    </Avatar>
                  )}

                  <Paper
                    variant="outlined"
                    sx={{
                      maxWidth: '72%',
                      p: 1.5,
                      borderRadius: 3,
                      bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                      color: msg.role === 'user' ? '#fff' : 'text.primary',
                    }}
                  >
                    <Typography variant="body2">{msg.text}</Typography>
                  </Paper>

                  {msg.role === 'user' && (
                    <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28 }}>
                      <Person sx={{ fontSize: 16 }} />
                    </Avatar>
                  )}
                </Stack>
              ))}
            </Box>

            <Box
              component="form"
              onSubmit={handleSend}
              sx={{
                position: 'sticky',
                bottom: 0,
                zIndex: 1,
                p: 2,
                borderTop: 1,
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                flexShrink: 0,
              }}
            >
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Write a message..."
                  variant="outlined"
                  size="small"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <Send sx={{ fontSize: 18, color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Button type="submit" variant="contained" sx={{ minWidth: 110 }}>
                  Send
                </Button>
              </Stack>
            </Box>
          </Paper>

          <Paper sx={{ p: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
              <Event color="secondary" />
              <Typography variant="h6">Reminders</Typography>
            </Stack>

            {reminders.length === 0 ? (
              <Box sx={{ border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 3, p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">No reminders yet</Typography>
              </Box>
            ) : (
              <List dense sx={{ overflowY: 'auto' }}>
                {reminders.map((item) => (
                  <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
                    <Paper variant="outlined" sx={{ width: '100%', borderRadius: 2, p: 1.2 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Checkbox edge="start" checked={item.status === 'DONE'} readOnly />
                        <ListItemText
                          primary={item.title}
                          secondary={new Date(item.scheduledAt).toLocaleString()}
                        />
                      </Stack>
                    </Paper>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;