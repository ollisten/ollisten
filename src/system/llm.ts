import {invoke} from "@tauri-apps/api/core";
import {Events} from "./events.ts";
import {AppConfigChangedEvent, getAppConfig, setAppConfig} from "../util/useAppConfig.ts";

export type LlmModel = {
    name: string;
    description: string;
}

export type OllamaStatus = 'Running' | 'Stopped' | 'Missing';
export type OllamaLlmModels = {
    models: LlmModel[];
    status: OllamaStatus;
}

export type LlmModelOptionsUpdatedEvent = {
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

export type OllamaIsStoppedEvent = {
    type: 'ollama-is-stopped';
}
export type OllamaNotInstalledEvent = {
    type: 'ollama-not-installed';
}
export type OllamaNoModels = {
    type: 'ollama-no-models';
}

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
        this.setup();
    }

    private async setup() {
        await this.listenForEvents();
        await this.fetchLlmModelOptions();

        const modelNameFromConfig = getAppConfig().selectedLlmModelName;
        if (modelNameFromConfig) {
            this.llmModelName = modelNameFromConfig;
            await this.onEventLlmModel({type: 'llm-model-option-selected', modelName: modelNameFromConfig});
        }
    }

    public talk(text: string, structuredOutputSchemaString: string | null = null): Promise<string> {
        return invoke<string>("llm_talk", {
            text,
            structuredOutputSchemaString,
        });
    }

    public canStart(): boolean {
        return this.getLlmModelName() !== null;
    }

    /*
     * LLM Model options
     */

    private async listenForEvents() {
        Events.get().subscribe([
            'app-config-changed', 'llm-model-option-selected'
        ], (event: AppConfigChangedEvent | LlmModelOptionSelectedEvent) => {
            switch (event.type) {
                case 'app-config-changed':
                    const llmModelNameFromConfig = getAppConfig().selectedLlmModelName || null;
                    if (!!llmModelNameFromConfig && llmModelNameFromConfig !== this.llmModelName) {
                        this.llmModelName = llmModelNameFromConfig;
                        this.onEventLlmModel({type: 'llm-model-option-selected', modelName: this.llmModelName});
                    }
                    break;
                case 'llm-model-option-selected':
                    invoke<string>("setup_ollama", {
                        llmModel: event.modelName
                    }).catch(console.error);
                    break;
                default:
                    console.error(`Unexpected event: ${event}`);
                    break;
            }
        });
    }

    public async fetchLlmModelOptions() {
        try {
            const response = await invoke<OllamaLlmModels>("start_and_get_llm_model_options_ollama");
            console.log('Recv start_and_get_llm_model_options_ollama', response);
            switch (response.status) {
                case 'Running':
                    break; // Continue
                case 'Stopped':
                    this.onEventLlmModel({type: 'ollama-is-stopped'});
                    return;
                case 'Missing':
                    this.onEventLlmModel({type: 'ollama-not-installed'});
                    return;
                default:
                    this.onError('Unexpected Ollama state: ' + response.status);
                    return;
            }
            if (response.models.length === 0) {
                this.onEventLlmModel({type: 'ollama-no-models'});
                return;
            }
            this.llmModelOptions = response.models;
            this.onEventLlmModel({type: 'llm-model-options-updated', options: response.models});
            if (this.llmModelName == null || response.models.findIndex(o => o.name === this.llmModelName) === -1) {
                await this.selectLlmModelName(response.models[0].name);
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
        await setAppConfig(c => c.selectedLlmModelName = newLlmModelName);
        await Events.get().sendExternal<LlmModelOptionSelectedEvent>({
            type: 'llm-model-option-selected',
            modelName: newLlmModelName,
        });
    }

    private async onError(message: string) {
        await this.onEventLlmModel({type: 'llm-model-options-error', msg: message});
    }

    private async onEventLlmModel(event:
                                      LlmModelOptionsUpdatedEvent
                                      | LlmModelOptionSelectedEvent
                                      | LlmModelOptionsErrorEvent
                                      | OllamaIsStoppedEvent
                                      | OllamaNotInstalledEvent
                                      | OllamaNoModels
    ) {
        await Events.get().sendExternal<typeof event>(event);
    }
}
