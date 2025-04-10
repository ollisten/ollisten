import React from "react";
import ReactDOM from "react-dom/client";
import MuiWrapper from "./MuiWrapper.tsx";
import './common.ts'
import AppDebug from "./AppDebug.tsx";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <MuiWrapper>
            <AppDebug/>
        </MuiWrapper>
    </React.StrictMode>,
);
