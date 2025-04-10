import {makeStyles} from "@mui/styles";
import AppBar from "./AppBar.tsx";
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

export default function App() {
    const classes = useStyles();

    const {loading} = useAppConfig();
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [activePage, setActivePage] = useState<string>('Launcher');

    if (loading) {
        return null;
    }

    return (
        <main
            className={classes.root}
        >
            <AppBar popoverDirection={isEditing ? 'right' : 'down'} isEditing={isEditing} onSettingsClick={() => {
                if (isEditing) {
                    // If changed, change in tauri.conf.json
                    setActivePage('Launcher');
                    setIsEditing(false);
                } else {
                    setIsEditing(true);
                }
            }}/>
            <Menu
                hideTabSelection={!isEditing}
                activePage={activePage}
                onPageChange={setActivePage}
            >
                <Tab label='Launcher'>
                    <InstallStartOllamaNotice/>
                    <InstallDriverNotice/>
                    <Launcher/>
                </Tab>
                <Tab label='Modes'>
                    <ModeList/>
                </Tab>
                <Tab label='Agents'>
                    <AgentList/>
                </Tab>
                <Tab label='Transcription'>
                    <InstallDriverNotice/>
                    <InputDeviceSelect/>
                    <OutputDeviceSelect/>
                    <TranscriptionModelSelect/>
                </Tab>
                <Tab label='LLM Model'>
                    <InstallStartOllamaNotice/>
                    <LlmModelSelect/>
                </Tab>
            </Menu>
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
