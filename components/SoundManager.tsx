
import { AUDIO_URLS } from '../constants';

class SoundManager {
  private static cache: Record<string, string> = {}; // Chỉ lưu URL để tạo mới khi cần
  private static isMuted: boolean = false;
  private static isInitialized: boolean = false;
  private static currentSpinAudio: HTMLAudioElement | null = null;

  /**
   * Khởi tạo hệ thống âm thanh bằng cách preload các URL.
   */
  static async init() {
    if (this.isInitialized) return;
    
    const loadPromises = Object.entries(AUDIO_URLS).map(([key, url]) => {
      return new Promise((resolve) => {
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.src = url;
        audio.preload = 'auto';
        
        const handleCanPlay = () => {
          this.cache[url] = url;
          audio.removeEventListener('canplaythrough', handleCanPlay);
          resolve(true);
        };

        const handleError = () => {
          console.warn(`⚠️ Failed to preload: ${url}`);
          resolve(false);
        };
        
        audio.addEventListener('canplaythrough', handleCanPlay, { once: true });
        audio.addEventListener('error', handleError, { once: true });
        
        audio.load();
        
        // Timeout sau 3 giây nếu không tải được
        setTimeout(() => resolve(true), 3000);
      });
    });

    await Promise.all(loadPromises);
    this.isInitialized = true;
    console.log("🔊 Hệ thống âm thanh đã sẵn sàng.");
  }

  /**
   * Phát hiệu ứng âm thanh ngắn. Tạo mới đối tượng Audio thay vì clone để tránh lỗi mất src.
   */
  private static playEffect(url: string, volume: number = 0.5) {
    if (this.isMuted) return;

    try {
      const audio = new Audio(url);
      audio.crossOrigin = "anonymous";
      audio.volume = volume;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          if (e.name !== 'AbortError') {
            console.warn(`🔇 Không thể phát âm thanh: ${url}`, e.message);
          }
        });
      }

      audio.onended = () => {
        audio.remove();
      };
    } catch (err) {
      console.error("Lỗi khi phát hiệu ứng âm thanh:", err);
    }
  }

  /**
   * Phát âm thanh lặp lại.
   */
  private static playLoop(url: string, volume: number = 0.5): HTMLAudioElement | null {
    if (this.isMuted) return null;

    try {
      const audio = new Audio(url);
      audio.crossOrigin = "anonymous";
      audio.loop = true;
      audio.volume = volume;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => console.warn("Lỗi phát loop:", e.message));
      }
      return audio;
    } catch (e) {
      return null;
    }
  }

  static toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.currentSpinAudio) {
      this.currentSpinAudio.muted = this.isMuted;
    }
    return this.isMuted;
  }

  // Quiz Sound Effects
  static correct() { this.playEffect(AUDIO_URLS.CORRECT, 0.6); }
  static wrong() { this.playEffect(AUDIO_URLS.WRONG, 0.5); }
  static click() { this.playEffect(AUDIO_URLS.CLICK, 0.3); }
  static questionPop() { this.playEffect(AUDIO_URLS.QUESTION_OPEN, 0.4); }
  static countdownTick() { this.playEffect(AUDIO_URLS.COUNTDOWN, 0.3); }
  static charFly() { this.playEffect(AUDIO_URLS.CHAR_FLY, 0.4); }

  // Spinner Wheel Sounds
  static startSpin() {
    this.stopSpin();
    this.currentSpinAudio = this.playLoop(AUDIO_URLS.SPINNING, 0.3);
  }

  static stopSpin() {
    if (this.currentSpinAudio) {
      this.currentSpinAudio.pause();
      this.currentSpinAudio.remove();
      this.currentSpinAudio = null;
    }
  }

  static playTick() { 
    this.playEffect(AUDIO_URLS.TICK, 0.15); 
  }

  static wheelWin() { 
    this.playEffect(AUDIO_URLS.WHEEL_WIN, 0.7); 
  }

  // Common Sounds
  static pluckApple() { this.playEffect(AUDIO_URLS.PLUCK, 0.3); }
  static win() { this.playEffect(AUDIO_URLS.WIN, 0.6); }
  static reveal() { this.playEffect(AUDIO_URLS.REVEAL, 0.7); }
}

export default SoundManager;
