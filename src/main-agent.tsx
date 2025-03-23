import React from "react";
import ReactDOM from "react-dom/client";
import MuiWrapper from "./MuiWrapper.tsx";
import AppAgent from "./AppAgent.tsx";
import "./AppAgent.css";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <MuiWrapper>
            <AppAgent/>
        </MuiWrapper>
    </React.StrictMode>,
);
