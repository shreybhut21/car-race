export class AudioManager { constructor() { this.context = null; } start() { this.context ??= new AudioContext(); } }
