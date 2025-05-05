import {Box} from "@mui/material";
import {useEffect, useState} from "react";
import {BackgroundColorDark} from "./AppWrapper.tsx";
import {getCurrentWebviewWindow} from "@tauri-apps/api/webviewWindow";
import {Events} from "./system/events.ts";

export default function () {

    const [shown, setShown] = useState(true);

    useEffect(() => {

        // Show the window almost immediately to prevent a flash of white
        const timer1 = setTimeout(() => {
            getCurrentWebviewWindow().show().catch(e => {
                Events.get().showError(`Failed to show own window: ${e}`);
            });
        }, 1);

        // Transition splash screen out after a short delay
        const timer2 = setTimeout(() => {
            setShown(false);
        }, 300);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, []);

    return (
        <Box sx={{
            // Center logo
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',

            // Show/hide
            opacity: shown ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out'
                + ', background-color 0.2s ease-in-out'
                + ', background-image 0.2s ease-in-out',

            // Position over all
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,

            pointerEvents: 'none',
            backgroundColor: BackgroundColorDark,
            backdropFilter: 'blur(10px)',

            // Use ollisten logo as background image depending on dark mode
            backgroundImage: `url('/ollisten-logo-circle-white.png')`,
            // make logo in the center
            backgroundPosition: 'center',
            // make logo 50% of itself
            backgroundSize: 100,
            // make logo not repeat
            backgroundRepeat: 'no-repeat',
        }}>
            &nbsp;
        </Box>
    );
}
