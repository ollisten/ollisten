import {Tab, Tabs} from "@mui/material";
import {makeStyles} from "@mui/styles";
import {ReactNode} from "react";

const pages = [
    {value: 'quick-launch', name: 'Launcher'},
    {value: 'agents', name: 'Agents'},
    {value: 'transcription', name: 'Transcription'},
    {value: 'llm-model', name: 'LLM Model'},
];

export default function Menu(props: {
    activePage: string;
    onPageChange: (page: string) => void;
}) {
    return (
        <Tabs
            value={props.activePage}
            onChange={(_, newValue) => props.onPageChange(newValue)}
            variant='fullWidth'
        >
            {pages.map(page => (
                <Tab key={page.value} label={page.name} value={page.value}/>
            ))}
        </Tabs>
    );
}

export const TabPanel = (props: {
    activePage: string;
    tabPage: string;
    children: ReactNode;
}) => (
    <div hidden={props.tabPage !== props.activePage}>
        {props.children}
    </div>
);

export const TabPanels = (props: {
    children: ReactNode;
}) => {
    const classes = useStylesTabPanels();
    return (<div className={classes.root}>
        {props.children}
    </div>)
};

const useStylesTabPanels = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        marginTop: '1rem',
    },
});
