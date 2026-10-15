import { Button, InputAdornment, Stack, TextField } from '@mui/material';
import { Send } from '@mui/icons-material';

type MessageInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
};

export default function MessageInput({ value, onChange, onSend }: MessageInputProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
      <TextField
        fullWidth
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
      <Button type="button" variant="contained" sx={{ minWidth: 110 }} onClick={onSend}>
        Send
      </Button>
    </Stack>
  );
}
