import {invoke} from "@tauri-apps/api/core";

export type LlmModel = {
    name: string;
    size: number;
}

export class Llm {

    private llm_model: string;

    public static async getModels(): Promise<LlmModel[]> {
        const models = await invoke<LlmModel[]>("get_llm_model_options");
        console.log('Recv get_llm_model_options', models);
        return models;
    }

    public static create = (llm_model: string) => {
        return new Llm(llm_model);
    }

    private constructor(llm_model: string) {
        this.llm_model = llm_model;
    }

    public talk(text: string): Promise<string> {
        return invoke<string>("llm_talk", {
            llm_model: this.llm_model,
            text,
        });
    }
}
