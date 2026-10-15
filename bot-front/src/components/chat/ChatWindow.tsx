import { Avatar, Box, Paper, Stack, Typography } from '@mui/material';
import { Person, SmartToy } from '@mui/icons-material';

export type Message = {
  role: 'bot' | 'user';
  text: string;
};

type ChatWindowProps = {
  messages: Message[];
};

export default function ChatWindow({ messages }: ChatWindowProps) {
  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
  );
}
