import {makeStyles} from "@mui/styles";
import {Typography} from "@mui/material";
import {ReactNode} from "react";

const useStyles = makeStyles({
    container: {
        margin: "0rem 2rem",
    },
});

export default function Note(props: {
    title?: ReactNode;
    description?: ReactNode;
}) {
    const classes = useStyles();
    return (
        <div className={classes.container}>
            {props.title && (
                <Typography variant="h5" component="div">{props.title}</Typography>
            )}
            {props.description && (
                <Typography variant="body1" component="div">{props.description}</Typography>
            )}
        </div>
    );
}
