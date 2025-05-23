import {SvgIcon} from "@mui/material";
import {ComponentProps} from "react";

export default function (props: ComponentProps<typeof SvgIcon>) {
    return (
        <SvgIcon {...props}>
            <path
                d="M7,4V6H10V8H7L5,10V13H3V10H1V18H3V15H5V18H8L10,20H18V16H20V19H23V9H20V12H18V8H12V6H15V4H7Z"/>
        </SvgIcon>
    );
}
