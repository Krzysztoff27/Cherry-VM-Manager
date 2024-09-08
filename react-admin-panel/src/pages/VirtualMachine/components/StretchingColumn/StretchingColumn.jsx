import { Grid, Paper } from "@mantine/core";
import styles from './StretchingColumn.module.css';


export default function StretchingColumn({ span, children, ...props }) {
    return (
        <Grid.Col span={span} className={styles.column} {...props}>
            <Paper className={styles.columnPaper} withBorder>
                {children}
            </Paper>
        </Grid.Col>
    )
}
