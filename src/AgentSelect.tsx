import {Box, Chip, FormControl, MenuItem, Select as MuiSelect} from "@mui/material";

export default function AgentSelect(props: {
    options: string[];
    values: string[];
    onSetAgents: (agents: string[]) => void;
}) {
    return (
        <FormControl fullWidth>
            <MuiSelect<string[]>
                multiple
                fullWidth
                sx={{minWidth: 120}}
                value={props.values}
                onChange={e => {
                    const value = e.target.value;
                    const values = typeof value === 'string'
                        ? value.split(',').filter(v => !!v)
                        : value;
                    props.onSetAgents(values);
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
