export function speakChinese(
  text: string,
  rate = 0.95,
  onError?: (msg: string) => void,
): void {
  if (!text) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.('Trình duyệt không hỗ trợ Web Speech API.');
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-CN';
    utter.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find((v) => /zh[-_]?CN|zh[-_]?Hans|Chinese/i.test(v.lang));
    if (zhVoice) utter.voice = zhVoice;
    window.speechSynthesis.speak(utter);
  } catch {
    onError?.('Không thể phát âm thanh lúc này.');
  }
}
