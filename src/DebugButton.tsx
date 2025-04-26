import {IconButton} from "@mui/material";
import {BugReport} from "@mui/icons-material";
import {WebviewWindow} from "@tauri-apps/api/webviewWindow";

export default function DebugButton() {
    return (
        <>
            <IconButton
                color='inherit'
                onClick={e => {
                    e.preventDefault();
                    new WebviewWindow('debug', {
                        url: `debug.html`,
                        title: 'Debug',
                        center: true,
                        width: 1024,
                        height: 768,
                        resizable: true,
                        visible: true,
                        contentProtected: true,
                    });
                }}
            ><BugReport/></IconButton>
        </>
    );
}
