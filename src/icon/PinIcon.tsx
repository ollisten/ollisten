import {SvgIcon} from "@mui/material";
import {ComponentProps} from "react";

export default function (props: ComponentProps<typeof SvgIcon>) {
    return (
        <SvgIcon {...props}>
            <path
                d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"/>
        </SvgIcon>
    );
}
