import {AgentWorker} from "./agentWorker.ts";
import Handlebars from "handlebars";
import {Agent} from "./agentManager.ts";
import {Llm} from "./llm.ts";
import debounce, {DebouncedFunction} from "../util/debounce.ts";
import {Transcription, Unsubscribe} from "./transcription.ts";

type LlmResponse = {
    prompt: string;
    answer: string;
}
type DebouncedInvoke = DebouncedFunction<[], LlmResponse>;
type Listener = (response: LlmResponse) => void;

export class Prompter {

    private static instance: Prompter | null = null
    private debouncedInvoke: DebouncedInvoke;
    private listener: Listener | null = null;
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
        AgentWorker.get().subscribe(agent => {
            this.debouncedInvoke = this.prepareInvocation(agent);
        })
        this.debouncedInvoke = this.prepareInvocation(AgentWorker.get().getAgent());
    }

    public start(listener: Listener) {
        this.listener = listener

        this.transcriptionUnsubscribe = Transcription.get().subscribe(event => {
            if (event.type !== 'transcription-data') return;

            this.transcriptionHistory.push(event.text);
            this.transcriptionLatest.push(event.text);

            this.debouncedInvoke()
                .then(response => {
                    if (this.listener) {
                        this.listener(response);
                    }
                })
                .catch(err => {
                    console.error(err);
                });
        });
    }

    public stop() {
        this.transcriptionUnsubscribe?.();
        this.transcriptionUnsubscribe = null;
        this.debouncedInvoke.cancel();
        this.listener = null;
        this.transcriptionHistory.push(this.transcriptionLatest.join("\n"));
        this.transcriptionLatest = [];
    }

    private prepareInvocation(agent: Agent): DebouncedInvoke {
        const template = Handlebars.compile(agent.prompt, {});
        const intervalInSec = Math.max(1, agent.intervalInSec || 3);
        return debounce(async () => {
            const transcriptionHistory = this.transcriptionHistory.join("\n");
            const transcriptionLatest = this.transcriptionLatest.join("\n");
            this.transcriptionLatest = [];
            console.log("Invoking LLM", transcriptionLatest);
            const prompt = template(this.getTemplateInput(
                transcriptionHistory,
                transcriptionLatest,
            ));
            const answer = await Llm.get().talk(prompt);
            return {prompt, answer};
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
