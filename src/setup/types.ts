export interface CharacterSetup {
  name: string;
  avatar: ImageBitmap;
  jersey: JerseyConfig;
}

export type JerseyConfig =
  | { type: 'preset'; primary: string; secondary: string }
  | { type: 'custom'; bitmap: ImageBitmap };

export interface SetupData {
  puncher: CharacterSetup & { talks: string[] };
  victim:  CharacterSetup;
  duration: number;
}
