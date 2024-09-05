import { ScrollArea } from '@mantine/core';
import styles from './FadingScroll.module.css';
import { useRef, useState } from 'react';

export default function FadingScroll(props) {
    const viewport = useRef(null);
    const [atEnd, setAtEnd] = useState(false);

    const onScrollPositionChange = (position) => {
        const height = viewport.current.scrollHeight - viewport.current.clientHeight; // INT
        const scrolled = position.y; // FLOAT
        console.log(height, scrolled)
        setAtEnd(Math.abs(scrolled - height) < 30); // close enough
    };

    return (
        <ScrollArea 
            {...props} 
            className={`${styles.fadingScroll} ${atEnd ? styles.noFade : styles.fade}`}
            onScrollPositionChange={onScrollPositionChange}
            viewportRef={viewport}
            type="always"
            offsetScrollbars
        >
            {props.children}
        </ScrollArea>

    )
}
