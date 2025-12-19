import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { DEFAULT_SYSTEM_INSTRUCTION } from "../constants";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to convert Float32 to PCM16
function floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
}

// Base64 Helpers
function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

export class LiveService {
    private sessionPromise: Promise<any> | null = null;
    private inputAudioContext: AudioContext | null = null;
    private outputAudioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private nextStartTime = 0;
    private sources = new Set<AudioBufferSourceNode>();
    private isConnected = false;

    public onVolumeChange: ((volume: number) => void) | null = null;
    public onStatusChange: ((status: string) => void) | null = null;

    async connect() {
        if (this.isConnected) return;
        
        this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, // Options: Puck, Charon, Kore, Fenrir, Zephyr
                    },
                    systemInstruction: DEFAULT_SYSTEM_INSTRUCTION + " You are speaking in a real-time voice interface. Keep responses concise, conversational, and helpful.",
                },
                callbacks: {
                    onopen: this.handleOpen.bind(this),
                    onmessage: this.handleMessage.bind(this),
                    onclose: this.handleClose.bind(this),
                    onerror: (err) => console.error("Live API Error:", err),
                }
            });
            
            this.isConnected = true;
            this.onStatusChange?.("connecting");

        } catch (error) {
            console.error("Failed to connect to Live API:", error);
            this.disconnect();
            throw error;
        }
    }

    private handleOpen() {
        console.log("Live Session Opened");
        this.onStatusChange?.("connected");
        this.startAudioInput();
    }

    private async handleMessage(message: LiveServerMessage) {
        // Handle Audio Output
        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (base64Audio && this.outputAudioContext) {
            const audioData = base64ToArrayBuffer(base64Audio);
            const audioBuffer = await this.outputAudioContext.decodeAudioData(audioData);
            
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputAudioContext.destination);
            
            // Scheduling
            const currentTime = this.outputAudioContext.currentTime;
            const startTime = Math.max(currentTime, this.nextStartTime);
            source.start(startTime);
            this.nextStartTime = startTime + audioBuffer.duration;
            
            this.sources.add(source);
            source.onended = () => this.sources.delete(source);
            
            // Simple visualizer hook for output (simulated for now based on chunk arrival)
            if (this.onVolumeChange) {
                 this.onVolumeChange(0.5 + Math.random() * 0.5);
                 setTimeout(() => this.onVolumeChange?.(0), audioBuffer.duration * 1000);
            }
        }

        // Handle Interruption
        if (message.serverContent?.interrupted) {
            console.log("Model interrupted");
            this.stopAudioOutput();
        }
    }

    private handleClose() {
        console.log("Live Session Closed");
        this.disconnect();
    }

    private startAudioInput() {
        if (!this.inputAudioContext || !this.mediaStream) return;

        this.source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
        this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Calculate Volume for Visualizer
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
            }
            const volume = Math.sqrt(sum / inputData.length);
            this.onVolumeChange?.(volume * 5); // Boost for visibility

            // Encode and Send
            const pcm16 = floatTo16BitPCM(inputData);
            const base64Data = arrayBufferToBase64(pcm16.buffer);
            
            this.sessionPromise?.then(session => {
                session.sendRealtimeInput({
                    media: {
                        mimeType: 'audio/pcm;rate=16000',
                        data: base64Data
                    }
                });
            });
        };

        this.source.connect(this.processor);
        this.processor.connect(this.inputAudioContext.destination);
    }

    private stopAudioOutput() {
        this.sources.forEach(s => {
            try { s.stop(); } catch(e) {}
        });
        this.sources.clear();
        this.nextStartTime = 0;
        if(this.outputAudioContext) {
             this.nextStartTime = this.outputAudioContext.currentTime;
        }
    }

    disconnect() {
        this.isConnected = false;
        this.onStatusChange?.("disconnected");

        // Close Session
        // There is no explicit .close() on the session object returned by connect() promise directly exposed in types sometimes
        // But we stop sending data.

        // Stop Audio Input
        this.processor?.disconnect();
        this.source?.disconnect();
        this.mediaStream?.getTracks().forEach(t => t.stop());
        this.inputAudioContext?.close();

        // Stop Audio Output
        this.stopAudioOutput();
        this.outputAudioContext?.close();

        this.inputAudioContext = null;
        this.outputAudioContext = null;
        this.mediaStream = null;
        this.sessionPromise = null;
    }
}

export const liveService = new LiveService();