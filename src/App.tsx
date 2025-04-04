import {makeStyles} from "@mui/styles";
import AppBar from "./AppBar.tsx";
import InputDeviceSelect from "./InputDeviceSelect.tsx";
import OutputDeviceSelect from "./OutputDeviceSelect.tsx";
import TranscriptionModelSelect from "./TranscriptionModelSelect.tsx";
import LlmModelSelect from "./LlmModelSelect.tsx";
import Menu, {TabPanel, TabPanels} from "./Menu.tsx";
import {useState} from "react";
import AgentList from "./AgentList.tsx";
import {InstallDriverNotice} from "./InstallDriverNotice.tsx";
import {useAppConfig} from "./util/useAppConfig.ts";
import {InstallStartOllamaNotice} from "./InstallStartOllamaNotice.tsx";
import ModeList from "./ModeList.tsx";
import {Collapse} from "@mui/material";
import Launcher from "./Launcher.tsx";
import useWindowSize from "./util/useWindowSize.tsx";

export default function App() {
    const classes = useStyles();

    const {loading} = useAppConfig();
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [activePage, setActivePage] = useState<string>('quick-launch');

    const setWindowSize = useWindowSize();

    if (loading) {
        return null;
    }

    return (
        <main
            className={classes.root}
        >
            <AppBar popoverDirection={isEditing ? 'right' : 'down'} onSettingsClick={() => {
                if (isEditing) {
                    setWindowSize({width: 224, height: 335});
                    setActivePage('quick-launch');
                    setIsEditing(false);
                } else {
                    setWindowSize({width: 800, height: 600});
                    setIsEditing(true);
                }
            }}/>
            <Collapse in={isEditing}>
                <Menu activePage={activePage} onPageChange={setActivePage}/>
            </Collapse>
            <TabPanels>
                <TabPanel tabPage='quick-launch' activePage={activePage}>
                    <InstallStartOllamaNotice/>
                    <InstallDriverNotice/>
                    <Launcher/>
                </TabPanel>
                <TabPanel tabPage='modes' activePage={activePage}>
                    <ModeList/>
                </TabPanel>
                <TabPanel tabPage='agents' activePage={activePage}>
                    <AgentList/>
                </TabPanel>
                <TabPanel tabPage='transcription' activePage={activePage}>
                    <InstallDriverNotice/>
                    <InputDeviceSelect/>
                    <OutputDeviceSelect/>
                    <TranscriptionModelSelect/>
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
