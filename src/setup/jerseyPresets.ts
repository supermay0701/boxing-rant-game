export interface JerseyPreset {
  id: string;
  primary: string;
  secondary: string;
}

export const JERSEY_PRESETS: JerseyPreset[] = [
  { id: 'pp', primary: '#7E57C2', secondary: '#FFD54F' },
  { id: 'rb', primary: '#E53935', secondary: '#1A1A1A' },
  { id: 'bw', primary: '#1976D2', secondary: '#FFFFFF' },
  { id: 'go', primary: '#43A047', secondary: '#FB8C00' },
  { id: 'kb', primary: '#EC407A', secondary: '#29B6F6' },
  { id: 'bg', primary: '#212121', secondary: '#FFC107' },
];
