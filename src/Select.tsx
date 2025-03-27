import {FormControl, InputLabel, MenuItem, Select as MuiSelect} from "@mui/material";
import {useCallback} from "react";
import {makeStyles} from "@mui/styles";
import clsx from "clsx";

export type Option = {
    label: string;
    value: string;
}

const useStyles = makeStyles({
    root: {
        width: '-webkit-fill-available'
    },
});

export default function Select(props: {
    className?: string;
    label: string;
    options: Option[]
    value: string | null;
    onSelect: (newValue: string) => void;
}) {

    const classes = useStyles();
    const onChange = useCallback((e: any) => {
        props.onSelect(e.target.value);
    }, [props.onSelect]);

    return (
        <FormControl className={clsx(classes.root, props.className)}>
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
