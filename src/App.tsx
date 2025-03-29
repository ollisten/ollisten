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
import {InstallDriverNotice} from "./InstallDriverNotice.tsx";
import {useAppConfig} from "./util/useAppConfig.ts";
import {InstallStartOllamaNotice} from "./InstallStartOllamaNotice.tsx";
import ModeList from "./ModeList.tsx";

export default function App() {
    const classes = useStyles();

    const [activePage, setActivePage] = useState('quick-launch');
    const {loading} = useAppConfig();

    if (loading) {
        return null;
    }

    return (
        <main
            className={classes.root}
        >
            <StatusView/>
            <Menu activePage={activePage} onPageChange={setActivePage}/>
            <TabPanels>
                <TabPanel tabPage='quick-launch' activePage={activePage}>
                    <InstallStartOllamaNotice/>
                    <InstallDriverNotice/>
                    <ModeList />
                    <StartButton startTranscription startAgents label='Start all'/>
                </TabPanel>
                <TabPanel tabPage='agents' activePage={activePage}>
                    <AgentList/>
                </TabPanel>
                <TabPanel tabPage='transcription' activePage={activePage}>
                    <InstallDriverNotice/>
                    <InputDeviceSelect/>
                    <OutputDeviceSelect/>
                    <TranscriptionModelSelect/>
                    <TranscriptionView/>
                </TabPanel>
                <TabPanel tabPage='llm-model' activePage={activePage}>
                    <InstallStartOllamaNotice/>
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
        margin: '1rem',
    },
});
