import React from "react";
import ReactDOM from "react-dom/client";
import MuiWrapper from "./MuiWrapper.tsx";
import AppAgent from "./AppAgent.tsx";
import {AgentWorker} from "./system/agentWorker.ts";
import "./AppAgent.css";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

AgentWorker.get().startMonitor();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <MuiWrapper>
            <AppAgent/>
        </MuiWrapper>
    </React.StrictMode>,
);
