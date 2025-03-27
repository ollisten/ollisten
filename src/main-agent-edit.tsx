import React from "react";
import ReactDOM from "react-dom/client";
import MuiWrapper from "./MuiWrapper.tsx";
import './common.ts'
import AppAgentEdit from "./AppAgentEdit.tsx";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <MuiWrapper>
            <AppAgentEdit/>
        </MuiWrapper>
    </React.StrictMode>,
);
