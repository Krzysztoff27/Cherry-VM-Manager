import { ScrollArea } from '@mantine/core';
import styles from './FadingScroll.module.css';
import { useRef, useState } from 'react';


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
