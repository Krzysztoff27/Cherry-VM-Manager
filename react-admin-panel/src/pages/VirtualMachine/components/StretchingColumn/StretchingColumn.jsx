import { Grid, Paper } from "@mantine/core";
import classes from './StretchingColumn.module.css';

export default function StretchingColumn({ span, children, ...props }) {
    return (
        <Grid.Col span={span} className={classes.column} {...props}>
            <Paper className={classes.columnPaper} withBorder>
                {children}
            </Paper>
        </Grid.Col>
    )
}
