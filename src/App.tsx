import InputDeviceSelect from "./InputDeviceSelect.tsx";
import OutputDeviceSelect from "./OutputDeviceSelect.tsx";
import TranscriptionModelSelect from "./TranscriptionModelSelect.tsx";
import LlmModelSelect from "./LlmModelSelect.tsx";
import Menu, {Tab} from "./Menu.tsx";
import {useState} from "react";
import AgentList from "./AgentList.tsx";
import {InstallDriverNotice} from "./InstallDriverNotice.tsx";
import {useAppConfig} from "./util/useAppConfig.ts";
import {InstallStartOllamaNotice} from "./InstallStartOllamaNotice.tsx";
import ModeList from "./ModeList.tsx";
import Launcher from "./Launcher.tsx";
import {HelpCenter, Person, PlayArrow, Speaker, SwitchAccount} from "@mui/icons-material";
import EngineIcon from "./icon/EngineIcon.tsx";
import Note from "./Note.tsx";
import {Box, Link} from "@mui/material";
import DebugButton from "./DebugButton.tsx";

const LauncherTabName = 'Launch';

export default function App() {
    const {loading} = useAppConfig();
    const [activePage, setActivePage] = useState<string>(LauncherTabName);

    if (loading) {
        return null;
    }

    return (
        <Box component="main" sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
        }}>
            <Menu
                type='bottom-navigation'
                activePage={activePage}
                onPageChange={setActivePage}
            >
                <Tab label={LauncherTabName} icon={<PlayArrow/>}>
                    <InstallStartOllamaNotice/>
                    <InstallDriverNotice/>
                    <Launcher/>
                </Tab>
                <Tab label='Mode' icon={<SwitchAccount/>}>
                    <Note title='Modes' description='A mode launches a set of Agents'/>
                    <ModeList/>
                </Tab>
                <Tab label='Agent' icon={<Person/>}>
                    <Note title='Agents'
                          description='An agent serves a single purpose and displays its output in its own window'/>
                    <AgentList/>
                </Tab>
                <Tab label='Audio' icon={<Speaker/>}>
                    <InstallDriverNotice/>
                    <Note title='Audio setup' description='Choose which microphone or audio input to listen for.'/>
                    <InputDeviceSelect/>
                    <Note
                        description='Choose which audio output to listen for, due to system constraints, only the virtual device is available.'/>
                    <OutputDeviceSelect/>
                    <Note description='Choose a Transcription model to convert audio into text.'/>
                    <TranscriptionModelSelect/>
                </Tab>
                <Tab label='Llm' icon={<EngineIcon/>}>
                    <InstallStartOllamaNotice/>
                    <Note title='LLM setup' description='Choose which LLM Model to use for all Agents.'/>
                    <LlmModelSelect/>
                </Tab>
                <Tab label='About' icon={<HelpCenter/>}>
                    <Note title='About'
                          description='Ollisten is an AI Meeting Assistant where you can define your own Agent.'/>
                    <Note description={(
                        <>
                            Visit&nbsp;
                            <Link href='https://ollisten.com' target='_blank'>https://ollisten.com</Link>
                            &nbsp;to get help.
                        </>
                    )}/>
                    <Note description={<DebugButton/>}/>
                </Tab>
            </Menu>
        </Box>
    );
}
