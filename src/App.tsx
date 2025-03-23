import {makeStyles} from "@mui/styles";
import TranscriptionView from "./TranscriptionView.tsx";
import StatusView from "./StatusView.tsx";
import InputDeviceSelect from "./InputDeviceSelect.tsx";
import OutputDeviceSelect from "./OutputDeviceSelect.tsx";
import TranscriptionModelSelect from "./TranscriptionModelSelect.tsx";
import LlmModelSelect from "./LlmModelSelect.tsx";
import StartButton from "./StartButton.tsx";
import Menu, {TabPanel, TabPanels} from "./Menu.tsx";
import {useState} from "react";
import AgentList from "./AgentList.tsx";

function App() {
    const classes = useStyles();

    const [activePage, setActivePage] = useState('quick-launch');

    return (
        <main
            data-tauri-drag-region
            className={classes.root}
        >
            <Menu activePage={activePage} onPageChange={setActivePage}/>

            <TabPanels>
                    <StatusView/>
                <TabPanel tabPage='quick-launch' activePage={activePage}>
                    <StartButton/>
                </TabPanel>
                <TabPanel tabPage='agents' activePage={activePage}>
                    <AgentList/>
                </TabPanel>
                <TabPanel tabPage='transcription' activePage={activePage}>
                    <InputDeviceSelect/>
                    <OutputDeviceSelect/>
                    <TranscriptionModelSelect/>
                    <TranscriptionView/>
                </TabPanel>
                <TabPanel tabPage='llm-model' activePage={activePage}>
                    <LlmModelSelect/>
                </TabPanel>
            </TabPanels>
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
