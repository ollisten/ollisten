import {makeStyles} from "@mui/styles";
import {Box, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import useAgents from "./useAgents.ts";
import {Add, ContentCopy, Edit} from "@mui/icons-material";
import {cloneAgent, createAgent, openAgentEdit} from "./agentEditWindow.ts";

export default function AgentList() {
    const classes = useStyles();
    const agents = useAgents();

    return (
        <div className={classes.container}>
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
                                    <Box display='flex' alignItems='center'>
                                        <IconButton size='small' onClick={() => openAgentEdit(name, agent)}>
                                            <Edit/>
                                        </IconButton>
                                        <IconButton size='small' onClick={() => cloneAgent(name, agent)}>
                                            <ContentCopy/>
                                        </IconButton>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                        <TableRow key='create'>
                            <TableCell component="th" scope="row" colSpan={3}>
                                <Box display='flex' alignItems='center' justifyContent='center'>
                                    <IconButton onClick={createAgent}>
                                        <Add/>
                                    </IconButton>
                                </Box>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
}

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
    },
    ellipsis: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: '2',
        WebkitBoxOrient: 'vertical',
    },
});
