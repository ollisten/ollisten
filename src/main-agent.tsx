import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import MuiWrapper from "./MuiWrapper.tsx";
import AppAgent from "./AppAgent.tsx";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <MuiWrapper>
            <AppAgent/>
        </MuiWrapper>
    </React.StrictMode>,
);
