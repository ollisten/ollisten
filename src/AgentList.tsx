import {makeStyles} from "@mui/styles";
import {DeviceInputOptionSelectedEvent} from "./system/transcription.ts";
import {useEffect} from "react";
import {SubscriptionManager} from "./system/subscriptionManager.ts";

export default function AgentList() {
    const classes = useStyles();

    // TODO
    useEffect(() => {
        return SubscriptionManager.get().subscribe([
            'device-input-option-selected',
        ], (
            event: DeviceInputOptionSelectedEvent
        ) => {
            switch (event.type) {
                case 'device-input-option-selected':
                    break;
                default:
                    console.error(`Unexpected event: ${event}`);
                    break;
            }
        });
    }, []);

    return (
        <div>

        </div>
    );
}

const useStyles = makeStyles({
    root: {},
});
