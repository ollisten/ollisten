import {AgentWorker} from "./agentWorker.ts";
import Handlebars from "handlebars";

export class Prompter {

    private static instance: Prompter | null = null
    private promptTemplate: HandlebarsTemplateDelegate;

    static get = () => {
        if (!Prompter.instance) {
            Prompter.instance = new Prompter();
        }
        return Prompter.instance;
    }

    private constructor() {
        AgentWorker.get().subscribe(event => {
            this.promptTemplate = this.compilePrompt(event.prompt);
        })
        this.promptTemplate = this.compilePrompt(AgentWorker.get().getAgent().prompt);
    }

    private compilePrompt(template: string): HandlebarsTemplateDelegate {
        return Handlebars.compile(template, {});
    }

    public constructPrompt(
        transcriptionPart: string,
    ): string {
        return this.promptTemplate({
            transcriptionPart,
        })
    }
}
