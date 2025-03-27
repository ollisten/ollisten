import Handlebars from "handlebars";
import {Agent, AgentManager, FileChangeEvent} from "./agentManager.ts";
import {Llm} from "./llm.ts";
import debounce, {DebouncedFunction} from "../util/debounce.ts";
import {TranscriptionDataEvent} from "./transcription.ts";
import {Events, Unsubscribe} from "./events.ts";
import {getCurrentWindow} from "@tauri-apps/api/window";

export type AgentOverrideEvent = {
    type: 'agent-override';
    agent: Agent;
}
export type LlmResponseEvent = {
    type: 'llm-response';
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
        this.debouncedInvoke = this.prepareInvocation(AgentManager.get().clientGetAgentConfig().agent);

        // TODO fix type
        const eventsToListen: any = ['TranscriptionData', 'agent-override']
        if(watchFileChanges) {
            eventsToListen.push('file-agent-created', 'file-agent-deleted', 'file-agent-modified')
        }
        this.transcriptionUnsubscribe = Events.get().subscribe(
            eventsToListen, (
            event: TranscriptionDataEvent | FileChangeEvent | AgentOverrideEvent
        ) => {
            switch (event.type) {
                case 'TranscriptionData':
                    if (this.isPaused || !this.debouncedInvoke) return;
                    this.transcriptionHistory.push(event.text);
                    this.transcriptionLatest.push(event.text);
                    this.debouncedInvoke().catch(console.error);
                    break;
                case 'file-agent-deleted':
                    getCurrentWindow().destroy();
                    break;
                case 'file-agent-created':
                case 'file-agent-modified':
                case 'agent-override':
                    this.prepareInvocation(event.agent)
                    break;
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

    private prepareInvocation(agent: Agent): DebouncedInvoke {
        const template = Handlebars.compile(agent.prompt, {});
        const intervalInSec = Math.max(1, agent.intervalInSec || 3);
        return debounce(async () => {
            if (!this.transcriptionLatest.length || this.isPaused) {
                return
            }
            const transcriptionHistory = this.transcriptionHistory.join("\n");
            const transcriptionLatest = this.transcriptionLatest.join("\n");
            this.transcriptionLatest = [];
            const prompt = template(this.getTemplateInput(
                transcriptionHistory,
                transcriptionLatest,
            ));
            const answer = await Llm.get().talk(prompt);
            const event: LlmResponseEvent = {
                type: 'llm-response',
                transcriptionLatest,
                prompt,
                answer,
            };
            Events.get().sendInternal(event)
        }, intervalInSec, true);
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
