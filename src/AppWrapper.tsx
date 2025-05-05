import {ReactNode} from "react";
import {createTheme, CssBaseline, ThemeProvider} from "@mui/material";
import {ColorSchemeListener} from "./ColorSchemeListener.tsx";
import MuiSnackbarProvider from "./util/MuiSnackbarProvider.tsx";
import ErrorNotifier from "./ErrorNotifier.tsx";
import SplashScreen from "./SplashScreen.tsx";

export const BackgroundColorLight = '#1b1b1b';
export const BackgroundColorDark = '#1b1b1b';

const theme = createTheme({
    palette: {},
    colorSchemes: {
        light: {
            palette: {
                background: {
                    default: '#c6c6c6', // Light mode background
                },
            },
        },
        dark: {
            palette: {
                background: {
                    default: BackgroundColorDark,
                    paper: BackgroundColorDark,
                },
            },
        },
    },
});

export default function(props: { children: ReactNode }) {
    return (
        <ThemeProvider theme={theme}>
            <SplashScreen />
            <CssBaseline/>
            <ColorSchemeListener/>
            <MuiSnackbarProvider>
                <ErrorNotifier />
                {props.children}
            </MuiSnackbarProvider>
        </ThemeProvider>
    );
}
