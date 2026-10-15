import { AppBar, IconButton, Stack, Toolbar, Typography } from '@mui/material';
import { DarkMode, LightMode, SmartToy } from '@mui/icons-material';

type NavbarProps = {
  darkMode: boolean;
  onToggleTheme: () => void;
};

export default function Navbar({ darkMode, onToggleTheme }: NavbarProps) {
  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar sx={{ justifyContent: 'space-between', px: 3 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <SmartToy color="primary" />
          <Typography variant="h6">RoboFriend</Typography>
        </Stack>

        <IconButton onClick={onToggleTheme} color="inherit">
          {darkMode ? <LightMode /> : <DarkMode />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
