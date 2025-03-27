import {useEffect, useState} from "react";
import {DeviceOutputUpdatedEvent} from "./system/transcription.ts";
import {Alert, Collapse} from "@mui/material";
import {Events} from "./system/events.ts";
import {invoke} from "@tauri-apps/api/core";
import {InstallDriverButton} from "./InstallDriverButton.tsx";
import {makeStyles} from "@mui/styles";
import {RetryDriverButton} from "./RetryDriverButton.tsx";

const fetchIsDriverInstalled = async () => {
    return await invoke<boolean>('is_driver_installed');
}

const useStyles = makeStyles({
    alert: {
        margin: '1rem',
        marginTop: 0,
    },
});

export function InstallDriverNotice() {

    const classes = useStyles();
    const [isDriverInstalled, setIsDriverInstalled] = useState<boolean | null>(null);

    useEffect(() => {
        fetchIsDriverInstalled()
            .then(isInstalled => {
                setIsDriverInstalled(isInstalled);
            })
            .catch(err => {
                console.error(`Failed to fetch isDriverInstalled: ${err}`);
            });
    }, []);

    useEffect(() => {
        return Events.get().subscribe([
            'device-output-updated',
        ], (event: DeviceOutputUpdatedEvent) => {
            switch (event.type) {
                case 'device-output-updated':
                    if (event.option) {
                        setIsDriverInstalled(true);
                    } else {
                        setIsDriverInstalled(false);
                    }
                    break;
            }
        });
    }, []);

    return (
        <Collapse in={isDriverInstalled === false}>
            <Alert
                variant='outlined'
                severity='warning'
                className={classes.alert}
                action={
                <>
                    <RetryDriverButton />
                    <InstallDriverButton isDriverInstalled={isDriverInstalled !== false}/>
                </>
                }
            >
                The audio device driver is not installed. Please install the driver to use the device.
            </Alert>
        </Collapse>
    );
}
