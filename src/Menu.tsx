import {BottomNavigation, BottomNavigationAction, Collapse, Tab as MuiTab, Tabs, useColorScheme} from "@mui/material";
import {makeStyles} from "@mui/styles";
import React, {createContext, ReactNode, useContext, useState} from "react";
import clsx from "clsx";

// Create context for sharing active tab state
const MenuContext = createContext<{
    activePage: string;
}>({
    activePage: '',
});

const useStyles = makeStyles({
    rootWithBottomNavigation: {
        display: "flex",
        flexDirection: "column",
        flex: '1 1 0',
    },
    children: {
        display: 'flex',
        flexDirection: 'column',
        marginTop: '1rem',
        flexGrow: 1,
    },
    scrollable: {
        overflow: 'auto',
        flex: '1 1 0',
    },
    bottomNavigationContainer: {
        flex: '0 0 auto',
        display: 'flex',
        width: '100%',
        alignItems: 'center',
    },
    logo: {
        margin: '2rem',
    },
    bottomNavigation: {
    },
});

export type TabItem = {
    label: string;
    icon?: ReactNode;
}

export const Tab: React.FC<{
    label: string;
    icon?: ReactNode;
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
    type?: 'tabs' | 'bottom-navigation';
    tabs?: TabItem[]; // Optional, can be inferred from children
    activePage?: string; // For controlled component
    defaultActivePage?: string; // For uncontrolled component
    onPageChange?: (page: string) => void; // For controlled component
    children: ReactNode;
    hideTabSelection?: boolean;
}) {
    const {
        type = 'tabs',
        tabs,
        activePage: controlledActivePage,
        defaultActivePage = '',
        onPageChange,
        children,
        hideTabSelection,
    } = props;

    const {mode, systemMode} = useColorScheme();
    const isDark = (mode === 'system' ? systemMode : mode) === 'dark';

    // Extract tab information from children if tabs prop not provided
    const childrenArray = React.Children.toArray(children);
    const tabsFromChildren = childrenArray
        .filter((child) => React.isValidElement(child) && (child.type as any) === Tab)
        .map((child) => {
            if (React.isValidElement(child)) {
                return {
                    label: child.props.label,
                    icon: child.props.icon,
                };
            }
            return null;
        })
        .filter(Boolean) as TabItem[];

    // Use provided tabs prop or infer from children
    const tabItems = tabs || tabsFromChildren;

    const [internalActivePage, setInternalActivePage] = useState(defaultActivePage || tabItems[0].label);
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
            <div className={clsx(type === 'bottom-navigation' && classes.rootWithBottomNavigation)}>
                {type === 'tabs' && (
                    <Collapse in={!hideTabSelection}>
                    <Tabs
                        value={activePage}
                        onChange={(_, newLabel) => handleTabChange(newLabel)}
                        variant='fullWidth'
                    >
                        {tabItems.map(page => (
                            <MuiTab key={page.label} label={page.label} value={page.label}/>
                        ))}
                    </Tabs>
                    </Collapse>
                )}

                {type === 'bottom-navigation' && (
                    <div className={classes.bottomNavigationContainer}>
                        <img className={classes.logo} src={`/ollisten-logo-circle-${isDark ? 'white' : 'black'}.png`}
                             width={40}
                             height={40}/>
                        <BottomNavigation
                            className={classes.bottomNavigation}
                            showLabels={false}
                            value={activePage}
                            onChange={(_, newValue) => handleTabChange(newValue)}
                        >
                            {tabItems.map(page => (
                                <BottomNavigationAction key={page.label} label={page.label} value={page.label}
                                                        icon={page.icon}/>
                            ))}
                        </BottomNavigation>
                    </div>
                )}

                <div className={clsx(classes.children, type === 'bottom-navigation' && classes.scrollable)}>
                    {children}
                </div>

            </div>
        </MenuContext.Provider>
    );
}
