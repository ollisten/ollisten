import Handlebars from "handlebars";
import {Agent, AgentManager, FileChangeEvent} from "./agentManager.ts";
import {Llm} from "./llm.ts";
import debounce, {DebouncedFunction} from "../util/debounce.ts";
import {TranscriptionDataEvent} from "./transcription.ts";
import {SubscriptionManager, Unsubscribe} from "./subscriptionManager.ts";
import {getCurrentWindow} from "@tauri-apps/api/window";

export type LlmResponseEvent = {
    type: 'llm-response';
    prompt: string;
    answer: string;
}
type DebouncedInvoke = DebouncedFunction<[], LlmResponseEvent>;

export class Prompter {

    private static instance: Prompter | null = null
    private debouncedInvoke: DebouncedInvoke;
    private transcriptionUnsubscribe: Unsubscribe | null = null;
    private transcriptionHistory: string[] = [];
    private transcriptionLatest: string[] = [];

    static get = () => {
        if (!Prompter.instance) {
            Prompter.instance = new Prompter();
        }
        return Prompter.instance;
    }

    private constructor() {
        this.debouncedInvoke = this.prepareInvocation(AgentManager.get().clientGetAgentConfig().agent);
    }

    public start(): Unsubscribe {
        if (this.transcriptionUnsubscribe) {
            return () => {
            };
        }

        this.transcriptionUnsubscribe = SubscriptionManager.get().subscribe([
            'TranscriptionData', 'FileAgentCreated', 'FileAgentDeleted', 'FileAgentModified',
        ], (
            event: TranscriptionDataEvent | FileChangeEvent
        ) => {
            switch (event.type) {
                case 'TranscriptionData':
                    this.transcriptionHistory.push(event.text);
                    this.transcriptionLatest.push(event.text);
                    this.debouncedInvoke()
                        .then(response => {
                            SubscriptionManager.get().sendInternal(response);
                        })
                        .catch(err => {
                            console.error(err);
                        });
                    break;
                case 'FileAgentDeleted':
                    getCurrentWindow().destroy();
                    break;
                case 'FileAgentCreated':
                case 'FileAgentModified':
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
            this.debouncedInvoke.cancel();
            this.transcriptionHistory.push(this.transcriptionLatest.join("\n"));
            this.transcriptionLatest = [];
        };
    }

    private prepareInvocation(agent: Agent): DebouncedInvoke {
        const template = Handlebars.compile(agent.prompt, {});
        const intervalInSec = Math.max(1, agent.intervalInSec || 3);
        return debounce(async () => {
            const transcriptionHistory = this.transcriptionHistory.join("\n");
            const transcriptionLatest = this.transcriptionLatest.join("\n");
            this.transcriptionLatest = [];
            const prompt = template(this.getTemplateInput(
                transcriptionHistory,
                transcriptionLatest,
            ));
            const answer = await Llm.get().talk(prompt);
            return {type: 'llm-response', prompt, answer};
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
