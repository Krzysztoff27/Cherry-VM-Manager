import { ScrollArea } from '@mantine/core';
import classes from './FadingScroll.module.css';
import { useEffect, useRef, useState } from 'react';
import { useViewportSize } from '@mantine/hooks';

/**
 * Mantine Scroll Area component with a fade effect near the bottom of the scrollable area.
 * When the user is not scrolled to the end of the content, a fade is applied.
 * @param {import('@mantine/core').ScrollAreaProps} props - Props passed to the ScrollArea component
 * @extends ScrollArea from Mantine library
 * @returns {JSX.Element} The customized ScrollArea with fading scroll effect
 */
export default function FadingScroll(props) {
    const viewport = useRef(null);
    const [faded, setFaded] = useState(true);
    const { height, width } = useViewportSize(); // website window width and height

    const isNearScrollEnd = () => {
        const areaHeight = viewport.current.scrollHeight - viewport.current.clientHeight; 
        const scrolled = viewport.current.scrollTop; 
        return Math.abs(scrolled - areaHeight) < 30; // if lower than 30px then its close enough to the end to not fade
    }

    const onScrollPositionChange = (_) => setFaded(!isNearScrollEnd());

    useEffect(() => {
        if(viewport.current.scrollHeight == viewport.current.clientHeight) setFaded(false);
        else if(!isNearScrollEnd()) setFaded(true);
    }, [height, width])

    return (
        <ScrollArea
            {...props}
            className={`${classes.scrollArea} ${faded ? '' : classes.noFade}`}
            onScrollPositionChange={onScrollPositionChange}
            viewportRef={viewport}
            type="always"
            offsetScrollbars
        >
            {props.children}
        </ScrollArea>
    )
}
