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
import {Person, PlayArrow, Speaker, SwitchAccount} from "@mui/icons-material";
import EngineIcon from "./icon/EngineIcon.tsx";

const LauncherTabName = 'Launch';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
    },
});

export default function App() {
    const classes = useStyles();

    const {loading} = useAppConfig();
    const [activePage, setActivePage] = useState<string>(LauncherTabName);

    if (loading) {
        return null;
    }

    return (
        <main
            className={classes.root}
        >
            <AppBar />
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
                    <ModeList/>
                </Tab>
                <Tab label='Agent' icon={<Person/>}>
                    <AgentList/>
                </Tab>
                <Tab label='Audio' icon={<Speaker/>}>
                    <InstallDriverNotice/>
                    <InputDeviceSelect/>
                    <OutputDeviceSelect/>
                    <TranscriptionModelSelect/>
                </Tab>
                <Tab label='Llm' icon={<EngineIcon/>}>
                    <InstallStartOllamaNotice/>
                    <LlmModelSelect/>
                </Tab>
            </Menu>
        </main>
    );
}
