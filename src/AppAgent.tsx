import {makeStyles} from "@mui/styles";
import {useEffect} from "react";
import {AgentWorker} from "./system/agentWorker.ts";

function App() {
    const classes = useStyles();

    useEffect(() => {
        AgentWorker.get().monitorConfig();
    }, []);

    return (
        <main
            data-tauri-drag-region
            className={classes.root}
        >
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
