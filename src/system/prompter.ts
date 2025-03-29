import Handlebars from "handlebars";
import {Agent, AgentManager, FileChangeEvent} from "./agentManager.ts";
import {Llm} from "./llm.ts";
import debounce, {DebouncedFunction} from "../util/debounce.ts";
import {DeviceSource, Transcription, TranscriptionDataEvent} from "./transcription.ts";
import {Events, Unsubscribe} from "./events.ts";
import {getCurrentWindow} from "@tauri-apps/api/window";

export type LlmResponseEvent = {
    type: 'llm-response';
    transcriptionHistory: string;
    transcriptionLatest: string;
    prompt: string;
    answer: string;
}
type DebouncedInvoke = DebouncedFunction<[], void>;

export class Prompter {

    private static instance: Prompter | null = null
    private debouncedInvoke: DebouncedInvoke | null = null
    private transcriptionUnsubscribe: Unsubscribe | null = null;
    private transcriptionHistory: string[] = [];
    private transcriptionLatest: string[] = [];
    private isPaused: boolean = false;
    private template: HandlebarsTemplateDelegate | null = null;
    private intervalInSec: number | null = null;

    static get = () => {
        if (!Prompter.instance) {
            Prompter.instance = new Prompter();
        }
        return Prompter.instance;
    }

    private constructor() {
    }

    public start(watchFileChanges: boolean): Unsubscribe {
        if (this.transcriptionUnsubscribe) {
            return () => {
            };
        }
        this.prepareInvocation(AgentManager.get().clientGetAgentConfig().agent);

        // TODO fix type
        const eventsToListen: any = ['TranscriptionData']
        if (watchFileChanges) {
            eventsToListen.push('file-agent-created', 'file-agent-deleted', 'file-agent-modified')
        }
        this.transcriptionUnsubscribe = Events.get().subscribe(
            eventsToListen, (
                event: TranscriptionDataEvent | FileChangeEvent
            ) => {
                switch (event.type) {
                    case 'TranscriptionData':
                        if (this.isPaused || !this.debouncedInvoke) return;
                        let transcriptionStr = event.text;
                        switch(Transcription.get().deviceIdToSource(event.deviceId)) {
                            case DeviceSource.Guest:
                                transcriptionStr = `Guest: ${transcriptionStr}`;
                                break;
                            case DeviceSource.Host:
                                transcriptionStr = `Host: ${transcriptionStr}`;
                                break;
                        }
                        this.transcriptionHistory.push(transcriptionStr);
                        this.transcriptionLatest.push(transcriptionStr);
                        this.debouncedInvoke().catch(console.error);
                        break;
                    case 'file-agent-deleted':
                        getCurrentWindow().destroy();
                        break;
                    case 'file-agent-created':
                    case 'file-agent-modified':
                    default:
                        console.error(`Unexpected event: ${event}`);
                        break;
                }
            });

        return () => {
            this.transcriptionUnsubscribe?.();
            this.transcriptionUnsubscribe = null;
            this.debouncedInvoke?.cancel();
            this.transcriptionHistory.push(this.transcriptionLatest.join("\n"));
            this.transcriptionLatest = [];
        };
    }

    public pause(): void {
        this.isPaused = true;
    }

    public resume(): void {
        this.isPaused = false;
    }

    public prepareInvocation(agent: Agent) {
        this.template = Handlebars.compile(agent.prompt, {});
        const intervalInSec = Math.max(1, agent.intervalInSec || 3);
        if (intervalInSec !== this.intervalInSec || !this.debouncedInvoke) {
            this.intervalInSec = intervalInSec;
            this.debouncedInvoke = debounce(async () => {
                const transcriptionHistoryStr = this.transcriptionHistory.join("\n");
                const transcriptionLatestStr = this.transcriptionLatest.join("\n");
                this.transcriptionLatest = [];
                const event = await this.invoke(
                    transcriptionHistoryStr,
                    transcriptionLatestStr,
                );
                if(event) Events.get().sendInternal(event);
            }, intervalInSec * 1000, true);
        }
    }

    public async invoke(
        transcriptionHistoryStr: string,
        transcriptionLatestStr: string,
    ): Promise<LlmResponseEvent | null> {
        if (!transcriptionLatestStr || this.isPaused || !this.template) {
            return null
        }
        const prompt = this.template(this.getTemplateInput(
            transcriptionHistoryStr,
            transcriptionLatestStr,
        ));
        const answer = await Llm.get().talk(prompt);
        return {
            type: 'llm-response',
            transcriptionHistory: transcriptionHistoryStr,
            transcriptionLatest: transcriptionLatestStr,
            prompt,
            answer,
        };
    }

    private getTemplateInput(transcriptionHistory: string, transcriptionLatest: string): object {
        return {
            transcription: {
                all: transcriptionHistory,
                latest: transcriptionLatest
            },
        }
    }
}
