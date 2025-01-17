import React, { useCallback, useEffect, useMemo } from 'react';
import Grid from '@mui/material/Grid';
import { useParams } from 'react-router';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { log } from '../util/errors';
import { LoadingSpinner } from '../component/LoadingSpinner';
import {
    apiGetWikiPage,
    apiSaveWikiPage,
    Page,
    renderMarkdown
} from '../api/wiki';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import { useCurrentUserCtx } from '../contexts/CurrentUserCtx';
import { PermissionLevel } from '../api';
import { useUserFlashCtx } from '../contexts/UserFlashCtx';
import Paper from '@mui/material/Paper';
import EditIcon from '@mui/icons-material/Edit';
import { MDEditor } from '../component/MDEditor';
import { RenderedMarkdownBox } from '../component/RenderedMarkdownBox';

const defaultPage: Page = {
    slug: '',
    body_md: '',
    created_on: new Date(),
    updated_on: new Date(),
    revision: 0,
    title: ''
};

export const WikiPage = (): JSX.Element => {
    const [page, setPage] = React.useState<Page>(defaultPage);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [editMode, setEditMode] = React.useState<boolean>(false);
    const { slug } = useParams();
    const { currentUser } = useCurrentUserCtx();
    const { flashes, setFlashes } = useUserFlashCtx();

    useEffect(() => {
        setLoading(true);
        apiGetWikiPage(slug || 'home')
            .then((page) => {
                setPage(page);
            })
            .catch((e) => {
                log(e);
            });
        setLoading(false);
    }, [slug]);

    const onSave = useCallback(
        (new_body_md: string) => {
            const newPage = page;
            newPage.slug = slug || 'home';
            newPage.body_md = new_body_md;
            apiSaveWikiPage(newPage)
                .then((p) => {
                    setPage(p);
                    setFlashes([
                        ...flashes,
                        {
                            heading: 'Saved wiki page',
                            level: 'success',
                            message: `Slug ${p.slug} updated`,
                            closable: true
                        }
                    ]);
                    setEditMode(false);
                })
                .catch((e) => {
                    log(e);
                });
        },
        [page, slug, setFlashes, flashes]
    );

    const bodyHTML = useMemo(() => {
        return page.revision > 0 && page.body_md
            ? renderMarkdown(page.body_md)
            : '';
    }, [page.body_md, page.revision]);

    return (
        <Grid container paddingTop={3} spacing={3}>
            {loading && (
                <Grid item xs={12} alignContent={'center'}>
                    <Paper elevation={1}>
                        <LoadingSpinner />
                    </Paper>
                </Grid>
            )}
            {!loading && !editMode && page.revision > 0 && (
                <Grid item xs={12}>
                    <Paper elevation={1}>
                        <Stack padding={3}>
                            <Typography variant={'h1'}>{page.title}</Typography>
                            <RenderedMarkdownBox bodyMd={bodyHTML} />
                            {currentUser.permission_level >=
                                PermissionLevel.Moderator && (
                                <ButtonGroup>
                                    <Button
                                        variant={'contained'}
                                        color={'primary'}
                                        onClick={() => {
                                            setEditMode(true);
                                        }}
                                        startIcon={<EditIcon />}
                                    >
                                        Edit Page
                                    </Button>
                                </ButtonGroup>
                            )}
                        </Stack>
                    </Paper>
                </Grid>
            )}
            {!loading && !editMode && page.revision == 0 && (
                <Grid item xs={12}>
                    <Paper elevation={1}>
                        <Stack spacing={3} padding={3}>
                            <Typography variant={'h1'}>
                                Wiki Entry Not Found
                            </Typography>
                            <Typography variant={'h3'}>
                                slug: {slug || 'home'}
                            </Typography>
                            {currentUser.permission_level >=
                                PermissionLevel.Moderator && (
                                <Typography variant={'body1'}>
                                    <Button
                                        variant={'contained'}
                                        color={'primary'}
                                        onClick={() => {
                                            setEditMode(true);
                                        }}
                                    >
                                        Create It
                                    </Button>
                                </Typography>
                            )}
                        </Stack>
                    </Paper>
                </Grid>
            )}
            {!loading && editMode && (
                <Grid item xs={12}>
                    <Paper elevation={1}>
                        <MDEditor
                            initialBodyMDValue={page.body_md}
                            onSave={onSave}
                        />
                    </Paper>
                </Grid>
            )}
        </Grid>
    );
};
