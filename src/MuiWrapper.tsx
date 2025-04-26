import {ReactNode} from "react";
import {createTheme, CssBaseline, ThemeProvider} from "@mui/material";
import {ColorSchemeListener} from "./ColorSchemeListener.tsx";
import MuiSnackbarProvider from "./util/MuiSnackbarProvider.tsx";
import ErrorNotifier from "./ErrorNotifier.tsx";

const theme = createTheme({
    palette: {},
    colorSchemes: {
        light: true,
        dark: true,
    },
});

function MuiWrapper(props: { children: ReactNode }) {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline/>
            <ColorSchemeListener/>
            <MuiSnackbarProvider>
                <ErrorNotifier />
                {props.children}
            </MuiSnackbarProvider>
        </ThemeProvider>
    );
}

export default MuiWrapper;
