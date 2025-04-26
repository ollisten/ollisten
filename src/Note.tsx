import {Box, Typography} from "@mui/material";
import {ReactNode} from "react";

export default function Note(props: {
    title?: ReactNode;
    description?: ReactNode;
}) {
    return (
        <Box sx={{
            margin: "0rem 2rem",
        }}>
            {props.title && (
                <Typography variant="h5" component="div">{props.title}</Typography>
            )}
            {props.description && (
                <Typography variant="body1" component="div">{props.description}</Typography>
            )}
        </Box>
    );
}
