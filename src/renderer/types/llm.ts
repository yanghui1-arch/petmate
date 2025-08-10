export interface ChatMessage {
    role: "assistant" | "user" | "system";
    content: string;
}

export interface ChatLLMConfig {
    model: string;
    apiKey: string;
    baseUrl: string;
}

export interface TTSLLMConfig {
    model: string;
    apiKey: string;
    baseUrl: string;
    parameters: TTSParameters;
}

export interface TTSVoice {
    name: string;
    voice: string;
    createdAt: Date;
}

export interface TTSParameters {
    text_type?: string;
    voice: string;
    format: string;
    sample_rate: number;
    volume: number;
    rate: number; // 语速
    pitch: number; // 音调
}

export interface HistoryChatMessage {
    chatMessage: ChatMessage;
    createdAt: Date;
}