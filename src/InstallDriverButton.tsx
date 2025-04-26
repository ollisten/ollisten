import {Button} from "@mui/material";
import {invoke} from "@tauri-apps/api/core";
import {Events} from "./system/events.ts";

const installDriver = async () => {
    return await invoke<void>('install_driver');
}

export function InstallDriverButton(props: {
    isDriverInstalled: boolean;
}) {

    return (
        <Button
            color='inherit'
            disabled={props.isDriverInstalled}
            size="small"
            onClick={e => {
                e.preventDefault();
                installDriver()
                    .then(() => {
                        console.log("Invoked install_driver");
                    })
                    .catch((e: Error) => {
                        Events.get().showError(`Failed to install drive: ${e}`);
                    })
            }}
        >Install</Button>
    );
}
