import Handlebars from "handlebars";
import {AgentConfig, FileChangeEvent} from "./agentManager.ts";
import {Llm} from "./llm.ts";
import debounce, {DebouncedFunction} from "../util/debounce.ts";
import {DeviceSource, Transcription, TranscriptionDataEvent} from "./transcription.ts";
import {Events, Unsubscribe} from "./events.ts";
import {getCurrentWindow} from "@tauri-apps/api/window";

export enum PrompterStatus {
    Stopped,
    Running,
    Paused,
}

export type PrompterEvent = {
    type: 'prompter-status-changed';
    agentName: string;
    status: PrompterStatus;
}
export type LlmRequestEvent = {
    type: 'llm-request';
    agentName: string;
    transcriptionHistory: string;
    transcriptionLatest: string;
    prompt: string;
    previousAnswer: string | null;
    previousAnswerJson: object | null; // Provided if using structured output
}
export type LlmResponseEvent = {
    type: 'llm-response';
    agentName: string;
    transcriptionHistory: string;
    transcriptionLatest: string;
    prompt: string;
    answer: string;
    answerJson: object | null; // Provided if using structured output
}
type DebouncedInvoke = DebouncedFunction<[], void>;

// Add handlebar helper json that will JSON.stringify
const HandlebarHelpers: { [name: string]: Function } = {
    json: (context: object) => JSON.stringify(context, null, 4),
};

export class Prompter {

    private static instance: Prompter | null = null
    private debouncedInvoke: DebouncedInvoke | null = null
    private transcriptionUnsubscribe: Unsubscribe | null = null;
    private transcriptionHistory: string[] = [];
    private transcriptionLatest: string[] = [];
    private previousAnswer: string | null = null;
    private previousAnswerJson: object | null = null;
    private isPaused: boolean = false;
    private agentName: string | null = null;
    private template: HandlebarsTemplateDelegate | null = null;
    private structuredOutputSchema: string | null = null;
    private structuredOutputMapperTemplate: HandlebarsTemplateDelegate | null = null;
    private intervalInSec: number | null = null;

    static get = () => {
        if (!Prompter.instance) {
            Prompter.instance = new Prompter();
        }
        return Prompter.instance;
    }

    private constructor() {
    }

    public getStatus(): PrompterStatus {
        if (this.transcriptionUnsubscribe) {
            return this.isPaused ? PrompterStatus.Paused : PrompterStatus.Running;
        }
        return PrompterStatus.Stopped;
    }

    private async sendStatusEvent() {
        if (!this.agentName) {
            return;
        }
        await Events.get().send({
            type: 'prompter-status-changed',
            agentName: this.agentName,
            status: this.getStatus(),
        } as PrompterEvent);
    }

    public start(watchFileChanges?: boolean): Unsubscribe {
        if (this.transcriptionUnsubscribe) {
            return () => {
            };
        }

        // TODO fix type
        const eventsToListen: any = ['TranscriptionData']
        if (!!watchFileChanges && !!this.agentName) {
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
                        switch (Transcription.get().deviceIdToSource(event.deviceId)) {
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
                        if (event.name === this.agentName) {
                            getCurrentWindow().close();
                        }
                        break;
                    case 'file-agent-created':
                    case 'file-agent-modified':
                        if (event.name === this.agentName) {
                            this.configureAgent(event);
                        }
                        break;
                    default:
                        console.error(`Unexpected event: ${event}`);
                        break;
                }
            });

        this.sendStatusEvent(); // Started

        return () => {
            this.transcriptionUnsubscribe?.();
            this.transcriptionUnsubscribe = null;
            this.debouncedInvoke?.cancel();
            this.transcriptionHistory.push(this.transcriptionLatest.join("\n"));
            this.transcriptionLatest = [];
            this.sendStatusEvent(); // Stopped
        };
    }

    public async pause() {
        this.isPaused = true;
        await this.sendStatusEvent(); // Paused
    }

    public async resume() {
        this.isPaused = false;
        await this.sendStatusEvent(); // Resumed
    }

    public configureAgent(agentConfig: AgentConfig) {
        this.agentName = agentConfig.name;
        this.template = Handlebars.compile(agentConfig.agent.prompt);
        if (agentConfig.agent.structuredOutput) {
            this.structuredOutputSchema = agentConfig.agent.structuredOutput.schema;
            this.structuredOutputMapperTemplate = Handlebars.compile(agentConfig.agent.structuredOutput.mapper, {});
        } else {
            this.structuredOutputSchema = null;
            this.structuredOutputMapperTemplate = null;
        }
        const intervalInSec = Math.max(1, agentConfig.agent.intervalInSec || 3);
        if (intervalInSec !== this.intervalInSec || !this.debouncedInvoke) {
            this.intervalInSec = intervalInSec;
            this.debouncedInvoke = debounce(async () => {
                if (this.isPaused) {
                    return
                }
                const transcriptionHistoryStr = this.transcriptionHistory.join("\n");
                const transcriptionLatestStr = this.transcriptionLatest.join("\n");
                this.transcriptionLatest = [];
                const event = await this.invoke(
                    transcriptionHistoryStr,
                    transcriptionLatestStr,
                    this.previousAnswer,
                    this.previousAnswerJson,
                );
                if (event) {
                    this.previousAnswer = event.answer;
                    this.previousAnswerJson = event.answerJson || null;
                }
            }, intervalInSec * 1000, true);
        }
    }

    public async invoke(
        transcriptionHistoryStr: string,
        transcriptionLatestStr: string,
        previousAnswer: string | null,
        previousAnswerJson: object | null,
    ): Promise<LlmResponseEvent | null> {
        if (!transcriptionLatestStr || !this.agentName || !this.template) {
            return null
        }
        const prompt = this.template(this.getTemplateInput(
            transcriptionHistoryStr,
            transcriptionLatestStr,
            previousAnswer,
            previousAnswerJson,
        ), {
            helpers: HandlebarHelpers,
        });
        const requestEvent: LlmRequestEvent = {
            type: 'llm-request',
            agentName: this.agentName,
            transcriptionHistory: transcriptionHistoryStr,
            transcriptionLatest: transcriptionLatestStr,
            prompt,
            previousAnswer,
            previousAnswerJson,
        }
        await Events.get().send(requestEvent)
        let answer = await Llm.get().talk(prompt, this.structuredOutputSchema);
        let answerJson: object | null = null;
        if (this.structuredOutputMapperTemplate) {
            answerJson = JSON.parse(answer);
            answer = this.structuredOutputMapperTemplate(answerJson, {
                helpers: HandlebarHelpers,
            });
        }
        const responseEvent: LlmResponseEvent = {
            type: 'llm-response',
            agentName: this.agentName,
            transcriptionHistory: transcriptionHistoryStr,
            transcriptionLatest: transcriptionLatestStr,
            prompt,
            answer,
            answerJson,
        };
        await Events.get().send(responseEvent)
        return responseEvent;
    }

    private getTemplateInput(
        transcriptionHistory: string,
        transcriptionLatest: string,
        previousAnswer: string | null,
        previousAnswerJson: object | null,
    ): object {
        return {
            transcription: {
                all: transcriptionHistory,
                latest: transcriptionLatest
            },
            answer: {
                previous: {
                    text: previousAnswer || '',
                    json: previousAnswerJson || null
                },
            },
        }
    }
}
