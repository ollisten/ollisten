import {Box, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import useAgents from "./useAgents.ts";
import {Add, ContentCopy, Edit} from "@mui/icons-material";
import {cloneAgent, createAgent, openAgentEdit} from "./agentEditWindow.ts";

export default function AgentList() {
    const agents = useAgents();

    return (
        <Box sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
        }}>
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
                                    <Box component='span' sx={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: '2',
                                        WebkitBoxOrient: 'vertical',
                                    }}>
                                        {agent.prompt}
                                    </Box>
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
        </Box>
    );
}
