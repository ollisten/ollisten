import {Box, Chip, FormControl, InputLabel, MenuItem, Select as MuiSelect} from "@mui/material";

export default function AgentSelect(props: {
    label: string;
    options: string[];
    values: string[];
    setModeAgents: (label: string, agents: string[]) => void;
}) {
    return (
        <FormControl>
            <InputLabel>Agents</InputLabel>
            <MuiSelect<string[]>
                multiple
                fullWidth
                label={props.label}
                value={props.values}
                onChange={e => {
                    const value = e.target.value;
                    const values = typeof value === 'string'
                        ? value.split(',').filter(v => !!v)
                        : value;
                    props.setModeAgents(props.label, values);
                }}
                renderValue={(selected) => (
                    <Box sx={{display: 'flex', flexWrap: 'wrap', gap: 0.5}}>
                        {selected.map((value) => (
                            <Chip key={value} label={value}/>
                        ))}
                    </Box>
                )}
            >
                {props.options.map(option =>
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                )}
            </MuiSelect>
        </FormControl>
    );
}
