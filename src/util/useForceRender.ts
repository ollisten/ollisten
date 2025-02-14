import {useReducer} from 'react';

export const useForceRender = () => {
    const [_, forceRender] = useReducer(x => x + 1, 0, i => i);
    return forceRender;
}
