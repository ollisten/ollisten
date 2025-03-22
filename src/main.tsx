import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import MuiWrapper from "./MuiWrapper.tsx";
import "./App.css";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <MuiWrapper>
            <App/>
        </MuiWrapper>
    </React.StrictMode>,
);
