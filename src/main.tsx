import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AppWrapper from "./AppWrapper.tsx";
import './common.ts'

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <AppWrapper>
            <App/>
        </AppWrapper>
    </React.StrictMode>,
);
