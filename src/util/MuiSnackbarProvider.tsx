import {SnackbarProvider} from 'notistack';
import React from 'react';
import {CloseRounded} from "@mui/icons-material";
import {IconButton} from "@mui/material";

const MuiSnackbarProvider = (props: {
    children: React.ReactNode;
    notistackRef?: React.RefObject<SnackbarProvider>;
}) => {
    const notistackRef = props.notistackRef || React.createRef<SnackbarProvider>();

    return (
        <SnackbarProvider
            ref={notistackRef}
            preventDuplicate
            maxSnack={3}
            hideIconVariant
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
            action={key => (
                <IconButton
                    sx={{
                        color: 'white',
                    }}
                    onClick={() => notistackRef.current?.closeSnackbar(key)}
                >
                    <CloseRounded fontSize='inherit'/>
                </IconButton>
            )}
        >
            {props.children}
        </SnackbarProvider>
    )
};

export default MuiSnackbarProvider;
