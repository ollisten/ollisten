import {Button} from "@mui/material";
import {invoke} from "@tauri-apps/api/core";

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
                    .catch((err: Error) => {
                        console.error(`Failed to install driver: ${err}`);
                    })
            }}
        >Install</Button>
    );
}
