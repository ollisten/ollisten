import {ComponentProps, ReactNode, useEffect, useState} from "react";
import {Button, IconButton, Popover, Typography} from "@mui/material";
import {Events} from "./system/events.ts";
import {LlmRequestEvent, LlmResponseEvent, Prompter, PrompterEvent, PrompterStatus} from "./system/prompter.ts";
import EngineOffOutlineIcon from "./icon/EngineOffOutlineIcon.tsx";
import EngineOutlineIcon from "./icon/EngineOutlineIcon.tsx";
import EngineIcon from "./icon/EngineIcon.tsx";
import TimeAgo from "react-timeago";
import EngineOffIcon from "./icon/EngineOffIcon.tsx";

export default function PrompterButton(props: {
    agentName: string;
    popoverDirection?: 'right' | 'up' | 'down';
}) {

    const [prompterStatus, setPrompterStatus] = useState<PrompterStatus>(Prompter.get().getStatus());
    const [llmWorking, setLlmWorking] = useState<boolean>(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    useEffect(() => {
        return Events.get().subscribe([
            'prompter-status-changed', "llm-request", "llm-response"
        ], (event: PrompterEvent | LlmRequestEvent | LlmResponseEvent) => {
            if (event.agentName !== props.agentName) {
                return;
            }
            switch (event.type) {
                case 'prompter-status-changed':
                    setPrompterStatus(event.status);
                    break;
                case 'llm-request':
                    setLlmWorking(true);
                    break;
                case 'llm-response':
                    setLlmWorking(false);
                    setLastUpdated(new Date());
                    break;
            }
        });
    }, []);

    let buttonIcon: ReactNode = null;
    let buttonPopoverText: React.ReactNode = '';
    let buttonColor: ComponentProps<typeof Button>['color'] = undefined;
    switch (prompterStatus) {
        case PrompterStatus.Paused:
            buttonColor = 'inherit';
            if (!llmWorking) {
                buttonPopoverText = 'Agent is paused. Press to resume.';
                buttonIcon = <EngineOffOutlineIcon/>;
            } else {
                buttonPopoverText = 'Agent is still processing an answer and will pause when finished. Press to resume.';
                buttonIcon = <EngineOffIcon/>;
            }
            break;
        case PrompterStatus.Running:
            buttonColor = 'inherit';
            if (!llmWorking) {
                buttonPopoverText = 'Agent is waiting for next input. Press to pause.';
                buttonIcon = <EngineOutlineIcon/>;
            } else {
                buttonPopoverText = 'Agent is processing an answer. Press to pause.';
                buttonIcon = <EngineIcon/>;
            }
            break;
        case PrompterStatus.Stopped:
            buttonIcon = <EngineOffOutlineIcon/>;
            buttonPopoverText = 'Agent is not running.';
            buttonColor = 'error';
            break;
        default:
            buttonIcon = <EngineOffOutlineIcon/>;
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
                <Typography sx={{p: 1}}>
                    {buttonPopoverText}
                    {!!lastUpdated && (
                        <>
                        <br/>Last update: {lastUpdated && <TimeAgo date={lastUpdated}/>}
                        </>
                    )}
                </Typography>
            </Popover>
        </>
    );
}
