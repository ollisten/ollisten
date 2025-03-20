import {makeStyles} from "@mui/styles";
import TranscriptionView from "./TranscriptionView.tsx";
import StatusView from "./StatusView.tsx";
import InputDeviceSelect from "./InputDeviceSelect.tsx";
import OutputDeviceSelect from "./OutputDeviceSelect.tsx";
import TranscriptionModelSelect from "./TranscriptionModelSelect.tsx";
import LlmModelSelect from "./LlmModelSelect.tsx";
import StartButton from "./StartButton.tsx";

function App() {
    const classes = useStyles();

    return (
        <main
            data-tauri-drag-region
            className={classes.root}
        >
            <TranscriptionModelSelect/>
            <LlmModelSelect/>
            <InputDeviceSelect/>
            <OutputDeviceSelect/>
            <StartButton/>
            <StatusView/>
            <TranscriptionView/>
        </main>
    );
}

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        margin: '1rem',
    },
});

export default App;
