import {ReactNode} from "react";
import "./App.css";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import {createTheme, CssBaseline, ThemeProvider} from "@mui/material";
import {ColorSchemeListener} from "./ColorSchemeListener.tsx";
import createCache from '@emotion/cache';
import {CacheProvider} from "@emotion/react";

export const muiCache = createCache({
    key: 'mui',
    prepend: true,
});
const theme = createTheme({
    palette: {},
    colorSchemes: {
        light: true,
        dark: true,
    },
});

function MuiWrapper(props: { children: ReactNode }) {
    return (
        <CacheProvider value={muiCache}>
            <ThemeProvider theme={theme}>
                <CssBaseline/>
                <ColorSchemeListener/>
                {props.children}
            </ThemeProvider>
        </CacheProvider>
    );
}

export default MuiWrapper;
