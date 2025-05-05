import React from "react";
import ReactDOM from "react-dom/client";
import AppWrapper from "./AppWrapper.tsx";
import './common.ts'
import AppAgentEdit from "./AppAgentEdit.tsx";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <AppWrapper>
            <AppAgentEdit/>
        </AppWrapper>
    </React.StrictMode>,
);
