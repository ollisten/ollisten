import {useColorScheme} from "@mui/material";

export default function () {
    const {mode, systemMode} = useColorScheme();
    const isDark = (mode === 'system' ? systemMode : mode) === 'dark';
    return isDark;
}
