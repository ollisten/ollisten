import {makeStyles} from "@mui/styles";
import {Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import AgentSelect from "./AgentSelect.tsx";
import useModes from "./useModes.ts";

export default function ModeList() {
    const classes = useStyles();
    const {modes, setModeAgents, agentNames} = useModes();

    return (
        <div>
            {!!Object.keys(modes).length && (
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
                            {Object.values(modes).map((mode) => (
                                <TableRow key={mode.label}>
                                    <TableCell component="th" scope="row">
                                        <Button color='primary' onClick={() => {
                                            // TODO
                                        }}>Start</Button>
                                    </TableCell>
                                    <TableCell component="th" scope="row">
                                        {mode.label}
                                    </TableCell>
                                    <TableCell component="th" scope="row">
                                        <AgentSelect
                                            label={mode.label}
                                            options={agentNames}
                                            values={Object.keys(mode.agents)}
                                            setModeAgents={setModeAgents}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            <Button
                className={classes.createButton}
                onClick={() => {
                    setModeAgents('New Mode', []);
                }}
            >
                Create
            </Button>
        </div>
    );
}

const useStyles = makeStyles({
    createButton: {
        margin: '1rem',
    },
});
