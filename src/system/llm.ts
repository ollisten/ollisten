import {invoke} from "@tauri-apps/api/core";
import {SubscriptionManager} from "./subscriptionManager.ts";

export type LlmModel = {
    name: string;
    size: number;
}

export type LlmModeloptionsUpdatedEvent = {
    type: 'llm-model-options-updated';
    options: LlmModel[];
}
export type LlmModelOptionSelectedEvent = {
    type: 'llm-model-option-selected';
    modelName: string;
}
export type LlmModelOptionsErrorEvent = {
    type: 'llm-model-options-error';
    msg: string;
};

export class Llm {

    private static instance: Llm | null = null
    private llmModelOptions: LlmModel[] = [];
    private llmModelName: string | null = null;

    static get = () => {
        if (!Llm.instance) {
            Llm.instance = new Llm();
        }
        return Llm.instance;
    }

    private constructor() {
        this.listenForLlmModelChanges();
        this.fetchLlmModelOptions();

        let llmModelName = new URLSearchParams(window.location.search)
            .get('llmModelName');
        if (llmModelName) {
            this.llmModelName = decodeURIComponent(llmModelName);
        }
    }

    public talk(text: string): Promise<string> {
        return invoke<string>("llm_talk", {
            llmModel: this.llmModelName,
            text,
        });
    }

    public canStart(): boolean {
        return this.getLlmModelName() !== null;
    }

    /*
     * LLM Model options
     */

    private async listenForLlmModelChanges() {
        SubscriptionManager.get().subscribe('llm-model-option-selected', (event: LlmModelOptionSelectedEvent) => {
            switch (event.type) {
                case "llm-model-option-selected":
                    this.llmModelName = event.modelName;
                    this.onEventLlmModel({type: 'llm-model-option-selected', modelName: event.modelName});
                    break;
                default:
                    console.error(`Unexpected event: ${event}`);
                    break;
            }
        });
    }

    private async fetchLlmModelOptions() {
        try {
            const response = await invoke<LlmModel[]>("get_llm_model_options");
            console.log('Recv get_llm_model_options', response);
            if (response.length === 0) {
                this.onError('No LLM models available');
                return;
            }
            this.llmModelOptions = response;
            this.onEventLlmModel({type: 'llm-model-options-updated', options: response});
            if (this.llmModelName == null || response.findIndex(o => o.name === this.llmModelName) === -1) {
                await this.selectLlmModelName(response[0].name);
            }
        } catch (e) {
            this.onError(`Failed to get LLM model options: ${e}`);
        }
    }

    public getLlmModelOptions(): LlmModel[] {
        return this.llmModelOptions;
    }

    public getLlmModelName(): string | null {
        return this.llmModelName;
    }

    public async selectLlmModelName(newLlmModelName: string) {
        SubscriptionManager.get().sendExternal<LlmModelOptionSelectedEvent>({
            type: 'llm-model-option-selected',
            modelName: newLlmModelName,
        });
    }

    private onError(message: string) {
        this.onEventLlmModel({type: 'llm-model-options-error', msg: message});
    }

    private onEventLlmModel(event: LlmModeloptionsUpdatedEvent | LlmModelOptionSelectedEvent | LlmModelOptionsErrorEvent) {
        SubscriptionManager.get().sendExternal<typeof event>(event);
    }
}
