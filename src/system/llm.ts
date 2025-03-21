import {invoke} from "@tauri-apps/api/core";
import {emitTo, listen} from "@tauri-apps/api/event";

export type LlmModel = {
    name: string;
    size: number;
}

export type LlmModelEvent = {
    type: 'llm-model-options-updated';
    options: LlmModel[];
} | {
    type: 'llm-model-option-selected';
    modelName: string;
} | {
    type: 'llm-model-options-error';
    msg: string;
};

export type ListenerLlmModel = (event: LlmModelEvent) => void;
export type Unsubscribe = () => void;

export class Llm {

    private static instance: Llm | null = null

    private readonly listenersLlmModel: Set<ListenerLlmModel> = new Set();
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

    public subscribeLlmModel(listener: ListenerLlmModel): Unsubscribe {
        this.listenersLlmModel.add(listener);
        return () => {
            this.listenersLlmModel.delete(listener);
        }
    }

    private async listenForLlmModelChanges() {
        // Listen from llm-model-option-selected
        await listen<string>('llm-model-option-selected', (event) => {
            this.llmModelName = event.payload;
            this.onEventLlmModel({type: 'llm-model-option-selected', modelName: event.payload});
        });
    }

    private async fetchLlmModelOptions() {
        try {
            const response = await invoke<LlmModel[]>("get_llm_model_options");
            console.log('Recv get_llm_model_options', response);
            if (response.length === 0) {
                console.error('No LLM models available');
                return;
            }
            this.llmModelOptions = response;
            this.onEventLlmModel({type: 'llm-model-options-updated', options: response});
            if (this.llmModelName == null || response.findIndex(o => o.name === this.llmModelName) === -1) {
                this.selectLlmModelName(response[0].name);
            }
        } catch (e) {
            this.onEventLlmModel({type: 'llm-model-options-error', msg: `Failed to get LLM model options: ${e}`});
        }
    }

    public getLlmModelOptions(): LlmModel[] {
        return this.llmModelOptions;
    }

    public getLlmModelName(): string | null {
        return this.llmModelName;
    }

    public async selectLlmModelName(newLlmModelName: string) {
        await emitTo({kind: 'Any'}, 'llm-model-option-selected', newLlmModelName);
    }

    private onEventLlmModel(event: LlmModelEvent) {
        this.listenersLlmModel.forEach(listener => {
            try {
                listener(event);
            } catch (e) {
                console.error('Error in event handler', e);
            }
        });
    }
}
