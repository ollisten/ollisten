import {Collapse, Tab as MuiTab, Tabs} from "@mui/material";
import {makeStyles} from "@mui/styles";
import React, {createContext, ReactNode, useContext, useState} from "react";

// Create context for sharing active tab state
const MenuContext = createContext<{
    activePage: string;
}>({
    activePage: '',
});

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        marginTop: '1rem',
    },
});

export const Tab: React.FC<{
    label: string;
    children: ReactNode;
}> = ({label, children}) => {
    const {activePage} = useContext(MenuContext);

    return (
        <div hidden={label !== activePage}>
            {children}
        </div>
    );
};

export default function Menu(props: {
    tabs?: string[]; // Optional, can be inferred from children
    activePage?: string; // For controlled component
    defaultActivePage?: string; // For uncontrolled component
    onPageChange?: (page: string) => void; // For controlled component
    children: ReactNode;
    hideTabSelection?: boolean;
}) {
    const {
        tabs,
        activePage: controlledActivePage,
        defaultActivePage = '',
        onPageChange,
        children,
        hideTabSelection
    } = props;

    // Extract tab information from children if tabs prop not provided
    const childrenArray = React.Children.toArray(children);
    const tabsFromChildren = childrenArray
        .filter((child) => React.isValidElement(child) && (child.type as any) === Tab)
        .map((child) => {
            if (React.isValidElement(child)) {
                return child.props.label;
            }
            return null;
        })
        .filter(Boolean) as string[];

    // Use provided tabs prop or infer from children
    const tabItems = tabs || tabsFromChildren;

    const [internalActivePage, setInternalActivePage] = useState(defaultActivePage || tabItems[0]);
    const activePage = controlledActivePage !== undefined ? controlledActivePage : internalActivePage;

    const handleTabChange = (newLabel: string) => {
        if (onPageChange) {
            onPageChange(newLabel);
        } else {
            setInternalActivePage(newLabel);
        }
    };

    const classes = useStyles();

    return (
        <MenuContext.Provider value={{activePage}}>
            <div>
                <Collapse in={!hideTabSelection}>
                    <Tabs
                        value={activePage}
                        onChange={(_, newLabel) => handleTabChange(newLabel)}
                        variant='fullWidth'
                    >
                        {tabItems.map(page => (
                            <MuiTab key={page} label={page} value={page}/>
                        ))}
                    </Tabs>
                </Collapse>

                <div className={classes.root}>
                    {children}
                </div>
            </div>
        </MenuContext.Provider>
    );
}
