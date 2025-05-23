import React from "react";
import ReactDOM from "react-dom/client";
import AppWrapper from "./AppWrapper.tsx";
import './common.ts'
import AppDebug from "./AppDebug.tsx";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <AppWrapper>
            <AppDebug/>
        </AppWrapper>
    </React.StrictMode>,
);
