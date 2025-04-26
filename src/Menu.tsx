import {
    BottomNavigation,
    BottomNavigationAction,
    Box,
    Collapse,
    Tab as MuiTab,
    Tabs,
    useColorScheme
} from "@mui/material";
import React, {createContext, ReactNode, useContext, useState} from "react";

// Create context for sharing active tab state
const MenuContext = createContext<{
    activePage: string;
}>({
    activePage: '',
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

    return (
        <MenuContext.Provider value={{activePage}}>
            <Box sx={{
                ...(type === 'bottom-navigation' ? {
                    display: "flex",
                    flexDirection: "column",
                    flex: '1 1 0',
                } : {})
            }}>
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
                    <Box sx={{
                        flex: '0 0 auto',
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                    }}>
                        <Box sx={{
                            margin: '2rem',
                        }}>
                            <img
                                src={`/ollisten-logo-circle-${isDark ? 'white' : 'black'}.png`}
                                width={50}
                                height={50}
                            />
                        </Box>
                        <BottomNavigation
                            showLabels={false}
                            value={activePage}
                            onChange={(_, newValue) => handleTabChange(newValue)}
                        >
                            {tabItems.map(page => (
                                <BottomNavigationAction key={page.label} label={page.label} value={page.label}
                                                        icon={page.icon}/>
                            ))}
                        </BottomNavigation>
                    </Box>
                )}

                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: '1rem',
                    flexGrow: 1,
                    ...(type === 'bottom-navigation' ? {
                        overflow: 'auto',
                        flex: '1 1 0',
                    } : {})
                }}>
                    {children}
                </Box>

            </Box>
        </MenuContext.Provider>
    );
}
