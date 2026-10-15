import { Box, Paper, Stack, Typography } from '@mui/material';
import { Memory } from '@mui/icons-material';

export type MemoryItem = {
  id: number;
  fact: string;
  createdAt: string;
};

type MemoryVaultProps = {
  items: MemoryItem[];
};

export default function MemoryVault({ items }: MemoryVaultProps) {
  return (
    <Paper sx={{ p: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
        <Memory color="primary" />
        <Typography variant="h6">Memory Vault</Typography>
      </Stack>

      {items.length === 0 ? (
        <Box sx={{ border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 3, p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">No memories yet</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5} sx={{ overflowY: 'auto', pr: 0.5 }}>
          {items.map((item) => (
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
  );
}
