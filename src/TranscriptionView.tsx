import {useEffect, useRef} from "react";
import {useForceRender} from "./util/useForceRender.ts";
import {TranscriptionDataEvent} from "./system/transcription.ts";
import {SubscriptionManager} from "./system/subscriptionManager.ts";

function TranscriptionView() {

    const forceRender = useForceRender();

    const transcriptionRef = useRef<string[]>([]);

    useEffect(() => {
        return SubscriptionManager.get().subscribe('TranscriptionData', (event: TranscriptionDataEvent) => {
            switch (event.type) {
                case 'TranscriptionData':
                    transcriptionRef.current.push(event.text);
                    forceRender();
                    break;
                default:
                    console.error(`Unexpected event: ${event}`);
            }
        });
    }, []);

    return (
        <div>
            <h5>Transcript</h5>
            <pre>{transcriptionRef.current.map((text, index) => (
                <p key={index}>{text}</p>
            ))}</pre>
        </div>
    );
}

export default TranscriptionView;
