import {
    Box,
    Button,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField
} from "@mui/material";
import AgentSelect from "./AgentSelect.tsx";
import useModes from "./useModes.ts";
import {Add} from "@mui/icons-material";

export default function ModeList() {
    const {modes, renameMode, setModeAgents, deleteMode, createMode, agentNames} = useModes();

    return (
        <div>
            {!!Object.keys(modes).length && (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell sx={{flexGrow: 5}}>Agents</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Object.entries(modes).map(([modeId, mode]) => (
                                <TableRow key={modeId}>
                                    <TableCell component="th" scope="row">
                                        <TextField
                                            value={mode.label}
                                            onChange={e => {
                                                renameMode(modeId, e.target.value);
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell component="th" scope="row">
                                        <AgentSelect
                                            options={agentNames}
                                            values={mode.agents}
                                            onSetAgents={agents => {
                                                setModeAgents(modeId, agents);
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            onClick={() => deleteMode(modeId)}
                                            color='error'
                                        >
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow key='create'>
                                <TableCell component="th" scope="row" colSpan={3}>
                                    <Box display='flex' alignItems='center' justifyContent='center'>
                                        <IconButton onClick={createMode}>
                                            <Add/>
                                        </IconButton>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </div>
    );
}
