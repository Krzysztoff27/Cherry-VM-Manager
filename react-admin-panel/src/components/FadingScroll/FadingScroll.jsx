import { ScrollArea } from '@mantine/core';
import styles from './FadingScroll.module.css';
import { useRef, useState } from 'react';

/**
 * Mantine Scroll Area component with a fade effect near the bottom of the scrollable area.
 * When the user is not scrolled to the end of the content, a fade is applied.
 * @param {import('@mantine/core').ScrollAreaProps} props - Props passed to the ScrollArea component
 * @extends ScrollArea from Mantine library
 * @returns {JSX.Element} The customized ScrollArea with fading scroll effect
 */
export default function FadingScroll(props) {
    const viewport = useRef(null);
    const [atEnd, setAtEnd] = useState(false);

    const onScrollPositionChange = (position) => {
        const height = viewport.current.scrollHeight - viewport.current.clientHeight; // INT
        const scrolled = position.y; // FLOAT
        setAtEnd(Math.abs(scrolled - height) < 20);
    };

    return (
        <ScrollArea
            {...props}
            className={atEnd ? null : styles.fade}
            onScrollPositionChange={onScrollPositionChange}
            viewportRef={viewport}
            type="always"
            offsetScrollbars
        >
            {props.children}
        </ScrollArea>
    )
}
