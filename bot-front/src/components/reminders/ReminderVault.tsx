import { Checkbox, List, ListItem, ListItemText, Paper, Stack, Typography } from '@mui/material';
import { Event } from '@mui/icons-material';

export type ReminderItem = {
  id: number;
  title: string;
  scheduledAt: string;
  status: string;
  notes?: string;
};

type ReminderVaultProps = {
  reminders: ReminderItem[];
};

export default function ReminderVault({ reminders }: ReminderVaultProps) {
  return (
    <Paper sx={{ p: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
        <Event color="secondary" />
        <Typography variant="h6">Reminders</Typography>
      </Stack>

      {reminders.length === 0 ? (
        <Paper variant="outlined" sx={{ borderStyle: 'dashed', borderRadius: 3, p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">No reminders yet</Typography>
        </Paper>
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
  );
}
