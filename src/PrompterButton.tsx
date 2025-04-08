import {ComponentProps, ReactNode, useEffect, useState} from "react";
import {Button, IconButton, Popover, Typography} from "@mui/material";
import {Events} from "./system/events.ts";
import {VolumeMute, VolumeOff, VolumeUp} from "@mui/icons-material";
import {LlmRequestEvent, LlmResponseEvent, Prompter, PrompterEvent, PrompterStatus} from "./system/prompter.ts";

export default function PrompterButton(props: {
    popoverDirection?: 'right' | 'up' | 'down';
}) {

    const [prompterStatus, setPrompterStatus] = useState<PrompterStatus>(Prompter.get().getStatus());
    const [llmWorking, setLlmWorking] = useState<boolean>(false);
    useEffect(() => {
        return Events.get().subscribe([
            'prompter-status-changed', "llm-request", "llm-response"
        ], (event: PrompterEvent | LlmRequestEvent | LlmResponseEvent) => {
            switch (event.type) {
                case 'prompter-status-changed':
                    setPrompterStatus(event.status);
                    break;
                case 'llm-request':
                    setLlmWorking(true);
                    break;
                case 'llm-response':
                    setLlmWorking(false);
                    break;
            }
        });
    }, []);

    let buttonDisabled: boolean = false;
    let buttonIcon: ReactNode = null;
    let buttonPopoverText: string = '';
    let buttonColor: ComponentProps<typeof Button>['color'] = undefined;
    switch (prompterStatus) {
        case PrompterStatus.Paused:
            buttonIcon = <VolumeOff/>;
            buttonPopoverText = 'Agent is paused. Press to resume.';
            buttonColor = 'inherit';
            break;
        case PrompterStatus.Running:
            buttonDisabled = false;
            buttonIcon = <VolumeUp/>;
            if (!llmWorking) {
                buttonPopoverText = 'Agent is waiting for next input. Press to pause.';
                buttonColor = 'success';
            } else {
                buttonPopoverText = 'Agent is processing an answer. Press to pause.';
                buttonColor = 'info';
            }
            break;
        case PrompterStatus.Stopped:
            buttonDisabled = true;
            buttonIcon = <VolumeMute/>;
            buttonPopoverText = 'Agent is not running.';
            buttonColor = 'error';
            break;
        default:
            buttonDisabled = true;
            buttonIcon = <VolumeMute/>;
            buttonPopoverText = 'Unknown Agent status';
            buttonColor = 'error';
            break;
    }

    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const buttonPopoverOpen = Boolean(anchorEl);

    var anchorOrigin: ComponentProps<typeof Popover>['anchorOrigin'] | undefined;
    var transformOrigin: ComponentProps<typeof Popover>['transformOrigin'] | undefined;
    switch (props.popoverDirection || '') {
        case 'right':
            anchorOrigin = {
                vertical: 'center',
                horizontal: 'right',
            };
            transformOrigin = {
                vertical: 'center',
                horizontal: 'left',
            };
            break;
        default:
        case 'up':
            anchorOrigin = {
                vertical: 'top',
                horizontal: 'center',
            };
            transformOrigin = {
                vertical: 'bottom',
                horizontal: 'center',
            };
            break;
        case 'down':
            anchorOrigin = {
                vertical: 'bottom',
                horizontal: 'center',
            };
            transformOrigin = {
                vertical: 'top',
                horizontal: 'center',
            };
            break;
    }

    return (
        <>
            <IconButton
                color={buttonColor}
                onClick={async e => {
                    e.preventDefault();
                    if (buttonDisabled) {
                        return
                    }
                    switch (prompterStatus) {
                        case PrompterStatus.Running:
                            Prompter.get().pause();
                            break;
                        case PrompterStatus.Paused:
                            Prompter.get().resume();
                            break;
                    }
                }}
                onMouseEnter={event => setAnchorEl(event.currentTarget)}
                onMouseLeave={() => setAnchorEl(null)}
            >{buttonIcon}</IconButton>
            <Popover
                sx={{pointerEvents: 'none'}}
                open={buttonPopoverOpen && !!buttonPopoverText}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={anchorOrigin}
                transformOrigin={transformOrigin}
            >
                <Typography sx={{p: 1}}>{buttonPopoverText}</Typography>
            </Popover>
        </>
    );
}
