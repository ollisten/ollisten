import React from "react";
import ReactDOM from "react-dom/client";
import AppWrapper from "./AppWrapper.tsx";
import AppAgent from "./AppAgent.tsx";
import './common.ts'

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <AppWrapper>
            <AppAgent/>
        </AppWrapper>
    </React.StrictMode>,
);
