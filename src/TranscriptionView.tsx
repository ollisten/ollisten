import {useEffect, useRef} from "react";
import {useForceRender} from "./util/useForceRender.ts";
import {Transcription} from "./system/transcription.ts";

function TranscriptionView() {

    const forceRender = useForceRender();

    const transcriptionRef = useRef<string[]>([]);

    useEffect(() => {
        return Transcription.get().subscribe((event) => {
            switch (event.type) {
                case 'transcription-data':
                    transcriptionRef.current.push(event.text);
                    forceRender();
                    break;
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
