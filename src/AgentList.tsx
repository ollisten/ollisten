import {makeStyles} from "@mui/styles";
import {useCallback} from "react";
import {Agent, AgentConfig} from "./system/agentManager.ts";
import {Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import {WebviewWindow} from "@tauri-apps/api/webviewWindow";
import useAgents from "./useAgents.ts";
import {randomUuid} from "./util/idUtil.ts";

export default function AgentList() {
    const classes = useStyles();
    const agents = useAgents();

    const openAgentEdit = useCallback((name: string, agent: Agent) => {
        const windowLabel = `agentEdit-${randomUuid()}`;
        const agentConfig: AgentConfig = {name, agent};
        const webview = new WebviewWindow(windowLabel, {
            url: `agent-edit.html?agentConfig=${encodeURIComponent(JSON.stringify(agentConfig))}`,
            title: 'Agent',
            center: true,
            width: 1440,
            height: 900,
            resizable: true,
            visible: true,
            contentProtected: true,
        });
        webview.once('tauri://created', () => {
            console.log(`Window successfully created for agent edit ${agentConfig.name}`);
        });
        webview.once('tauri://error', (e) => {
            console.error('Error creating window:', e);
        });
        webview.once('tauri://closed', () => {
            console.log('Window closed');
        });
    }, []);

    return (
        <div>
            {!!Object.keys(agents).length && (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Prompt</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.entries(agents).map(([name, agent]) => (
                                <TableRow key={name}>
                                    <TableCell component="th" scope="row">
                                        {name}
                                    </TableCell>
                                    <TableCell component="th" scope="row">
                                    <span className={classes.ellipsis}>
                                        {agent.prompt}
                                    </span>
                                    </TableCell>
                                    <TableCell component="th" scope="row">
                                        <Button onClick={() => openAgentEdit(name, agent)}>Edit</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            <Button
                className={classes.createButton}
                onClick={() => openAgentEdit('', {
                    prompt: '',
                    intervalInSec: 3,
                    transcriptionHistoryMaxChars: null,
                    structuredOutput: null,
                })}
            >
                Create
            </Button>
        </div>
    );
}

const useStyles = makeStyles({
    ellipsis: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: '2',
        WebkitBoxOrient: 'vertical',
    },
    createButton: {
        margin: '1rem',
    },
});
