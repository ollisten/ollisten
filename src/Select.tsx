import {FormControl, InputLabel, MenuItem, Select as MuiSelect} from "@mui/material";
import {useCallback} from "react";

export type Option = {
    label: string;
    value: string;
}

export default function Select(props: {
    label: string;
    options: Option[]
    value: string | null;
    onSelect: (newValue: string) => void;
}) {

    const onChange = useCallback((e: any) => {
        props.onSelect(e.target.value);
    }, [props.onSelect]);

    return (
        <FormControl fullWidth>
            <InputLabel>{props.label}</InputLabel>
            <MuiSelect
                label={props.label}
                value={props.value === null ? '' : props.value}
                onChange={onChange}
            >
                {props.options.map(option =>
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                )}
            </MuiSelect>
        </FormControl>
    );
}
