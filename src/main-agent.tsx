import React from "react";
import ReactDOM from "react-dom/client";
import MuiWrapper from "./MuiWrapper.tsx";
import AppAgent from "./AppAgent.tsx";
import './common.ts'

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <MuiWrapper>
            <AppAgent/>
        </MuiWrapper>
    </React.StrictMode>,
);
