export class TTS {
  static isAvailable(): boolean {
    return typeof globalThis.speechSynthesis !== 'undefined'
        && typeof globalThis.SpeechSynthesisUtterance !== 'undefined';
  }

  static speak(text: string): void {
    if (!TTS.isAvailable()) return;
    const u = new (globalThis as any).SpeechSynthesisUtterance(text);
    u.lang = 'zh-TW';
    u.rate = 1.1;
    (globalThis as any).speechSynthesis.speak(u);
  }

  static cancel(): void {
    if (!TTS.isAvailable()) return;
    (globalThis as any).speechSynthesis.cancel();
  }
}
