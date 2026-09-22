/**
 * NeoChat Desktop - Multi-Engine TTS Manager
 * Supports:
 * 1. Edge TTS (Microsoft Neural Voices - Fast, zero-config, studio quality)
 * 2. Piper TTS (Local offline neural VITS model - ultra lightweight)
 * 3. Kokoro TTS (Local offline 82M high-fidelity neural model)
 * 4. System TTS (Native OS voices fallback)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const https = require('https');
const http = require('http');
const { app } = require('electron');

// Base directories
function getTtsDataDir() {
    const base = app && typeof app.getPath === 'function' 
        ? path.join(app.getPath('userData'), 'tts')
        : path.join(process.cwd(), '.neochat-tts');
    if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
    return base;
}

function getCacheDir() {
    const dir = path.join(getTtsDataDir(), 'cache');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function getModelsDir(engine) {
    const dir = path.join(getTtsDataDir(), 'models', engine);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

// Voice Catalogs
const EDGE_VOICES = [
    { id: 'pt-BR-FranciscaNeural', name: 'Francisca (Neural)', lang: 'pt-BR', gender: 'Feminino', description: 'Voz suave, natural e fluida' },
    { id: 'pt-BR-AntonioNeural', name: 'Antonio (Neural)', lang: 'pt-BR', gender: 'Masculino', description: 'Voz clara, expressiva e profissional' },
    { id: 'pt-BR-ThalitaNeural', name: 'Thalita (Neural)', lang: 'pt-BR', gender: 'Feminino', description: 'Voz jovem e comunicativa' },
    { id: 'pt-BR-DonatoNeural', name: 'Donato (Neural)', lang: 'pt-BR', gender: 'Masculino', description: 'Tom amigável e conversacional' },
    { id: 'pt-BR-ElzaNeural', name: 'Elza (Neural)', lang: 'pt-BR', gender: 'Feminino', description: 'Entonação calma e segura' },
    { id: 'pt-BR-FabioNeural', name: 'Fabio (Neural)', lang: 'pt-BR', gender: 'Masculino', description: 'Voz profunda e equilibrada' },
    { id: 'pt-BR-GiovannaNeural', name: 'Giovanna (Neural)', lang: 'pt-BR', gender: 'Feminino', description: 'Tom alegre e expressivo' },
    { id: 'pt-BR-JulioNeural', name: 'Julio (Neural)', lang: 'pt-BR', gender: 'Masculino', description: 'Entonação firme' },
    { id: 'pt-BR-ManuelaNeural', name: 'Manuela (Neural)', lang: 'pt-BR', gender: 'Feminino', description: 'Entonação dinâmica' },
    { id: 'pt-BR-NicolauNeural', name: 'Nicolau (Neural)', lang: 'pt-BR', gender: 'Masculino', description: 'Voz madura' },
    { id: 'en-US-JennyNeural', name: 'Jenny (Neural)', lang: 'en-US', gender: 'Feminino', description: 'Natural and articulate' },
    { id: 'en-US-GuyNeural', name: 'Guy (Neural)', lang: 'en-US', gender: 'Masculino', description: 'Clear and balanced' },
    { id: 'en-US-AriaNeural', name: 'Aria (Neural)', lang: 'en-US', gender: 'Feminino', description: 'Expressive and friendly' },
    { id: 'es-ES-ElviraNeural', name: 'Elvira (Neural)', lang: 'es-ES', gender: 'Feminino', description: 'Español natural' }
];

const PIPER_VOICES = [
    { 
        id: 'pt_BR-faber-medium', 
        name: 'Faber (Médio)', 
        lang: 'pt-BR', 
        gender: 'Masculino', 
        description: 'Voz brasileira clara em modelo neural local VITS (~60MB)',
        modelUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx',
        configUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx.json'
    },
    { 
        id: 'pt_BR-edresson-low', 
        name: 'Edresson (Leve)', 
        lang: 'pt-BR', 
        gender: 'Masculino', 
        description: 'Modelo ultraleve e rápido para processadores modestos (~16MB)',
        modelUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/pt/pt_BR/edresson/low/pt_BR-edresson-low.onnx',
        configUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/pt/pt_BR/edresson/low/pt_BR-edresson-low.onnx.json'
    },
    { 
        id: 'en_US-lessac-medium', 
        name: 'Lessac (Medium)', 
        lang: 'en-US', 
        gender: 'Feminino', 
        description: 'High quality US English local voice (~60MB)',
        modelUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx',
        configUrl: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json'
    }
];

const KOKORO_VOICES = [
    { id: 'af_heart', name: 'Heart (Neural)', lang: 'en-US', gender: 'Feminino', description: 'Voz padrão de estúdio, entonação humana ultra realista' },
    { id: 'af_bella', name: 'Bella (Neural)', lang: 'en-US', gender: 'Feminino', description: 'Voz suave e expressiva' },
    { id: 'af_nicole', name: 'Nicole (Neural)', lang: 'en-US', gender: 'Feminino', description: 'Tom sussurrado e amigável' },
    { id: 'af_sarah', name: 'Sarah (Neural)', lang: 'en-US', gender: 'Feminino', description: 'Tom jovem e enérgico' },
    { id: 'af_sky', name: 'Sky (Neural)', lang: 'en-US', gender: 'Feminino', description: 'Voz melodiosa e calma' },
    { id: 'am_adam', name: 'Adam (Neural)', lang: 'en-US', gender: 'Masculino', description: 'Voz masculina encorpada e firme' },
    { id: 'am_michael', name: 'Michael (Neural)', lang: 'en-US', gender: 'Masculino', description: 'Voz calma e professoral' },
    { id: 'bf_emma', name: 'Emma (British)', lang: 'en-GB', gender: 'Feminino', description: 'Sotaque britânico requintado' },
    { id: 'bm_george', name: 'George (British)', lang: 'en-GB', gender: 'Masculino', description: 'Sotaque britânico masculino' }
];

// Helper: Download a remote file with redirect handling
function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const tempDest = `${destPath}.tmp_${Date.now()}`;
        const fileStream = fs.createWriteStream(tempDest);

        const request = (targetUrl) => {
            const client = targetUrl.startsWith('https') ? https : http;
            client.get(targetUrl, (response) => {
                if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
                    return request(response.headers.location);
                }

                if (response.statusCode !== 200) {
                    fileStream.close();
                    fs.unlink(tempDest, () => {});
                    return reject(new Error(`Failed to download ${url}: status code ${response.statusCode}`));
                }

                response.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close(() => {
                        fs.rename(tempDest, destPath, (renameErr) => {
                            if (renameErr) return reject(renameErr);
                            resolve(destPath);
                        });
                    });
                });
            }).on('error', (err) => {
                fileStream.close();
                fs.unlink(tempDest, () => {});
                reject(err);
            });
        };

        request(url);
    });
}

class TtsManager {
    constructor() {
        this.activeProcess = null;
    }

    getVoices(engine = 'edge') {
        switch (engine) {
            case 'edge':
                return EDGE_VOICES;
            case 'piper':
                return PIPER_VOICES;
            case 'kokoro':
                return KOKORO_VOICES;
            default:
                return [];
        }
    }

    /**
     * Synthesizes text to speech using the selected engine
     * @param {Object} options
     * @param {string} options.text
     * @param {string} options.engine - 'edge' | 'piper' | 'kokoro' | 'system'
     * @param {string} options.voice
     * @param {number} options.rate
     * @param {number} options.pitch
     * @returns {Promise<{ audioUrl: string, format: string }>}
     */
    async synthesize({ text, engine = 'edge', voice, rate = 1.05, pitch = 1.0 }) {
        if (!text || typeof text !== 'string' || !text.trim()) {
            throw new Error('Text to synthesize is required');
        }

        const cleanText = text.trim();
        const selectedEngine = ['edge', 'piper', 'kokoro'].includes(engine) ? engine : 'edge';

        // Check local cache
        const cacheHash = crypto.createHash('sha256')
            .update(`${selectedEngine}:${voice}:${rate}:${pitch}:${cleanText}`)
            .digest('hex');
        const ext = selectedEngine === 'edge' ? 'mp3' : 'wav';
        const cachedFile = path.join(getCacheDir(), `${cacheHash}.${ext}`);

        if (fs.existsSync(cachedFile)) {
            const buffer = await fs.promises.readFile(cachedFile);
            const mimeType = ext === 'mp3' ? 'audio/mp3' : 'audio/wav';
            return {
                audioUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
                format: ext,
                cached: true
            };
        }

        let audioBuffer;
        if (selectedEngine === 'edge') {
            audioBuffer = await this.synthesizeEdge(cleanText, voice || 'pt-BR-FranciscaNeural', rate, pitch);
        } else if (selectedEngine === 'piper') {
            audioBuffer = await this.synthesizePiper(cleanText, voice || 'pt_BR-faber-medium', rate, pitch);
        } else if (selectedEngine === 'kokoro') {
            audioBuffer = await this.synthesizeKokoro(cleanText, voice || 'af_heart', rate, pitch);
        }

        // Cache result
        try {
            await fs.promises.writeFile(cachedFile, audioBuffer);
        } catch (e) {
            console.warn('[TtsManager] Failed to write cache:', e.message);
        }

        const mimeType = ext === 'mp3' ? 'audio/mp3' : 'audio/wav';
        return {
            audioUrl: `data:${mimeType};base64,${audioBuffer.toString('base64')}`,
            format: ext,
            cached: false
        };
    }

    /**
     * Synthesize using Microsoft Edge TTS (online neural)
     */
    async synthesizeEdge(text, voice, rate, pitch) {
        const tempOut = path.join(getCacheDir(), `temp_edge_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);
        
        // Format rate: e.g. +5% or -10%
        const rateDiff = Math.round((rate - 1) * 100);
        const rateStr = `${rateDiff >= 0 ? '+' : ''}${rateDiff}%`;

        // Format pitch: e.g. +0Hz
        const pitchDiff = Math.round((pitch - 1) * 50);
        const pitchStr = `${pitchDiff >= 0 ? '+' : ''}${pitchDiff}Hz`;

        return new Promise((resolve, reject) => {
            const args = [
                'edge-tts',
                '--voice', voice,
                '--rate', rateStr,
                '--pitch', pitchStr,
                '--text', text,
                '--write-media', tempOut
            ];

            const proc = spawn('uvx', args, { windowsHide: true });
            this.activeProcess = proc;

            let stderr = '';
            proc.stderr.on('data', (d) => { stderr += d.toString(); });

            proc.on('close', async (code) => {
                this.activeProcess = null;
                if (code !== 0) {
                    return this.synthesizeEdgeFallback(text, voice, rateStr, pitchStr, tempOut, resolve, reject, stderr);
                }

                try {
                    const data = await fs.promises.readFile(tempOut);
                    await fs.promises.unlink(tempOut).catch(() => {});
                    resolve(data);
                } catch (err) {
                    reject(err);
                }
            });

            proc.on('error', (err) => {
                this.synthesizeEdgeFallback(text, voice, rateStr, pitchStr, tempOut, resolve, reject, err.message);
            });
        });
    }

    synthesizeEdgeFallback(text, voice, rateStr, pitchStr, tempOut, resolve, reject, initialError) {
        const fallbackProc = spawn('edge-tts', [
            '--voice', voice,
            '--rate', rateStr,
            '--pitch', pitchStr,
            '--text', text,
            '--write-media', tempOut
        ], { windowsHide: true });

        fallbackProc.on('close', async (code) => {
            if (code !== 0) {
                return reject(new Error(`Edge TTS failed (code ${code}): ${initialError}`));
            }
            try {
                const data = await fs.promises.readFile(tempOut);
                await fs.promises.unlink(tempOut).catch(() => {});
                resolve(data);
            } catch (err) {
                reject(err);
            }
        });

        fallbackProc.on('error', (err) => {
            reject(new Error(`Edge TTS unavailable: ${err.message}`));
        });
    }

    /**
     * Synthesize using local Piper TTS
     */
    async synthesizePiper(text, voiceId, rate, _pitch) {
        const piperInfo = PIPER_VOICES.find(v => v.id === voiceId) || PIPER_VOICES[0];
        const modelsDir = getModelsDir('piper');
        const modelPath = path.join(modelsDir, `${piperInfo.id}.onnx`);
        const configPath = path.join(modelsDir, `${piperInfo.id}.onnx.json`);

        // Ensure model files exist, download if necessary
        if (!fs.existsSync(modelPath) && piperInfo.modelUrl) {
            console.log(`[TtsManager] Downloading Piper model: ${piperInfo.id}...`);
            await downloadFile(piperInfo.modelUrl, modelPath);
        }
        if (!fs.existsSync(configPath) && piperInfo.configUrl) {
            console.log(`[TtsManager] Downloading Piper config: ${piperInfo.id}...`);
            await downloadFile(piperInfo.configUrl, configPath);
        }

        const tempOut = path.join(getCacheDir(), `temp_piper_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`);
        const lengthScale = (1.0 / Math.max(0.5, Math.min(2.0, rate))).toFixed(2);

        return new Promise((resolve, reject) => {
            const args = [
                '--from', 'piper-tts',
                'piper.exe',
                '-m', modelPath,
                '-c', configPath,
                '-f', tempOut,
                '--length-scale', lengthScale
            ];

            const proc = spawn('uvx', args, { windowsHide: true });
            this.activeProcess = proc;

            let stderr = '';
            proc.stderr.on('data', (d) => { stderr += d.toString(); });

            proc.stdin.write(text);
            proc.stdin.end();

            proc.on('close', async (code) => {
                this.activeProcess = null;
                if (code !== 0) {
                    return reject(new Error(`Piper TTS failed with exit code ${code}: ${stderr}`));
                }

                try {
                    const data = await fs.promises.readFile(tempOut);
                    await fs.promises.unlink(tempOut).catch(() => {});
                    resolve(data);
                } catch (err) {
                    reject(err);
                }
            });

            proc.on('error', (err) => {
                reject(new Error(`Failed to launch Piper TTS: ${err.message}`));
            });
        });
    }

    /**
     * Synthesize using Kokoro-82M neural TTS
     */
    async synthesizeKokoro(text, voiceId, rate, _pitch) {
        const modelsDir = getModelsDir('kokoro');
        const modelPath = path.join(modelsDir, 'kokoro-v0_19.onnx');
        const voicesPath = path.join(modelsDir, 'voices.bin');

        if (!fs.existsSync(modelPath)) {
            console.log('[TtsManager] Downloading Kokoro ONNX model (82M)...');
            const modelUrl = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files/kokoro-v0_19.onnx';
            await downloadFile(modelUrl, modelPath);
        }
        if (!fs.existsSync(voicesPath)) {
            console.log('[TtsManager] Downloading Kokoro voices.bin...');
            const voicesUrl = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files/voices.bin';
            await downloadFile(voicesUrl, voicesPath);
        }

        const tempOut = path.join(getCacheDir(), `temp_kokoro_${Date.now()}_${Math.random().toString(36).slice(2)}.wav`);
        const pythonScript = `
import sys
import soundfile as sf
from kokoro_onnx import Kokoro

model_path = sys.argv[1]
voices_path = sys.argv[2]
text = sys.argv[3]
voice = sys.argv[4]
speed = float(sys.argv[5])
output_path = sys.argv[6]

kokoro = Kokoro(model_path, voices_path)
samples, sample_rate = kokoro.create(text, voice=voice, speed=speed)
sf.write(output_path, samples, sample_rate)
`;

        return new Promise((resolve, reject) => {
            const args = [
                'run',
                '--with', 'kokoro-onnx',
                '--with', 'soundfile',
                'python',
                '-c', pythonScript,
                modelPath,
                voicesPath,
                text,
                voiceId || 'af_heart',
                String(rate || 1.0),
                tempOut
            ];

            const proc = spawn('uv', args, { windowsHide: true });
            this.activeProcess = proc;

            let stderr = '';
            proc.stderr.on('data', (d) => { stderr += d.toString(); });

            proc.on('close', async (code) => {
                this.activeProcess = null;
                if (code !== 0) {
                    return reject(new Error(`Kokoro TTS failed with exit code ${code}: ${stderr}`));
                }

                try {
                    const data = await fs.promises.readFile(tempOut);
                    await fs.promises.unlink(tempOut).catch(() => {});
                    resolve(data);
                } catch (err) {
                    reject(err);
                }
            });

            proc.on('error', (err) => {
                reject(new Error(`Failed to launch Kokoro TTS: ${err.message}`));
            });
        });
    }

    /**
     * Synthesizes a test demonstration audio phrase
     */
    async testVoice({ engine = 'edge', voice, rate = 1.05, pitch = 1.0 }) {
        const testPhrases = {
            'pt-BR': 'Olá! Esta é uma demonstração da voz neural no NeoChat.',
            'en-US': 'Hello! This is a demonstration of the neural voice in NeoChat.',
            'es-ES': '¡Hola! Esta es una demostración de la voz neural en NeoChat.'
        };

        const voices = this.getVoices(engine);
        const match = voices.find(v => v.id === voice);
        const lang = match ? match.lang : 'pt-BR';
        const phrase = testPhrases[lang] || testPhrases['pt-BR'];

        return this.synthesize({
            text: phrase,
            engine,
            voice,
            rate,
            pitch
        });
    }

    stop() {
        if (this.activeProcess) {
            try {
                this.activeProcess.kill();
            } catch (e) {
                // Ignore kill errors
            }
            this.activeProcess = null;
        }
    }
}

const ttsManagerInstance = new TtsManager();

module.exports = {
    ttsManager: ttsManagerInstance,
    TtsManager,
    EDGE_VOICES,
    PIPER_VOICES,
    KOKORO_VOICES
};
