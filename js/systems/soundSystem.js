export class SoundSystem {
    constructor() {
        this.audioContext = null;
        this.masterVolume = 0.3;
        this.enabled = true;
        this.backgroundPlaying = false;
        this.initAudio();
    }

    initAudio() {
        if (this.audioContext) {
            if (this.audioContext.state === "suspended") {
                this.audioContext.resume().catch(() => {});
            }
            return;
        }

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.enabled = false;
        }
    }

    createOscillator(frequency, type = "sine", duration = 0.2) {
        if (!this.enabled || !this.audioContext) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playShoot() { this.createOscillator(200, "square", 0.1); }
    playHit() { this.createOscillator(150, "sawtooth", 0.4); }
    playPickup() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.createOscillator(f, "sine", 0.15), i * 50)); }
    playHurt() { this.createOscillator(100, "sawtooth", 0.3); }
    playWaveComplete() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.createOscillator(f, "sine", 0.5), i * 200)); }
    playGameOver() { [392, 349, 311, 262].forEach((f, i) => setTimeout(() => this.createOscillator(f, "triangle", 0.6), i * 300)); }
    playWeaponSwitch() { [392, 494, 587].forEach((f, i) => setTimeout(() => this.createOscillator(f, "sine", 0.1), i * 80)); }
    playHealthPickup() { [330, 392, 494].forEach((f, i) => setTimeout(() => this.createOscillator(f, "sine", 0.2), i * 100)); }
    playBossSpawn() {
        [196, 220, 247, 262, 294, 330, 349, 392, 440, 494, 523].forEach((f, i) =>
            setTimeout(() => this.createOscillator(f, "sawtooth", 0.3), i * 100)
        );
    }
    playBossHit() { this.createOscillator(80, "square", 0.5); }

    playBackgroundMusic() {
        if (this.backgroundPlaying) return;
        this.backgroundPlaying = true;
        const melody = [262, 294, 330, 349, 392, 440, 494, 523];
        let i = 0;
        const play = () => {
            if (!this.backgroundPlaying) return;
            this.createOscillator(melody[i], "sine", 1.2);
            i = (i + 1) % melody.length;
            setTimeout(play, 1500);
        };
        play();
    }

    stopBackgroundMusic() { this.backgroundPlaying = false; }
    toggleSound() { return this.enabled = !this.enabled; }
}
