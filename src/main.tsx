import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import MuiWrapper from "./MuiWrapper.tsx";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <MuiWrapper>
            <App/>
        </MuiWrapper>
    </React.StrictMode>,
);
