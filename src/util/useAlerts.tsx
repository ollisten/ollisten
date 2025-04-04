import {useCallback} from "react";
import {randomUuid} from "./idUtil.ts";

/*
 * Alert storage
 */

export interface AlertDefinition {
    id?: string;
    type: 'error' | 'success' | 'info' | 'in-progress';
    content: string;
    dismissible?: boolean;
    onDismiss?: () => void;
}
const store: AlertDefinition[] = [];
const setAlert = (alert: AlertDefinition) => {
    const index = store.findIndex(({id}) => id === alert.id);
    if (index === -1) {
        store.push(alert);
    } else {
        store[index] = alert;
    }
}
const removeAlert = (id: string) => {
    const index = store.findIndex(({id: alertId}) => alertId === id);
    if (index !== -1) {
        store.splice(index, 1);
    }
}
export const addAlert = (alert: AlertDefinition) => {
    const id = alert.id || randomUuid();
    setAlert({
        id,
        dismissible: true,
        onDismiss: () => removeAlert(id),
        ...alert
    });
    return () => removeAlert(id);
};

/*
 * Alert listeners
 */

export type Listener = () => void;
export type Unsubscribe = () => void;
export type Subscribe = (listener: Listener) => Unsubscribe;
const listeners: Set<Listener> = new Set();
const subscribe: Subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener)
    };
};

/*
 * React hook
 */

export type DismissAlert = () => void;
// @ts-ignore
export const useAlerts: {
    addAlert: (alert: AlertDefinition) => DismissAlert;
    addAlertWithoutId: (alert: AlertDefinition) => DismissAlert;
    removeAlert: (id: string) => void;
    beginProcessing: (alertInProgress: Partial<AlertDefinition>) => {
        onSuccess: (alertSuccess: Partial<AlertDefinition>) => void;
        onError: (alertError: Partial<AlertDefinition>) => void;
    };
    subscribe: Subscribe;
} = () => {

    const beginProcessing = useCallback((alertInProgress: Partial<AlertDefinition>) => {
        let dismissInProgress = addAlert({
            type: 'in-progress',
            content: 'Processing...',
            ...alertInProgress,
        });
        return {
            onSuccess: (alertSuccess: Partial<AlertDefinition>) => {
                dismissInProgress();
                return addAlert({
                    type: 'success',
                    content: 'Operation completed successfully',
                    ...alertSuccess,
                });
            },
            onError: (alertError: Partial<AlertDefinition>) => {
                dismissInProgress();
                return addAlert({
                    type: 'error',
                    content: 'Failed to complete the operation',
                    ...alertError,
                });
            },
        };
    }, []);

    return {
        addAlert,
        removeAlert,
        beginProcessing,
        subscribe,
    };
}
