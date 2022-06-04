import { Router, RequestHandler } from 'express';
import type { SequelizeClient } from '../sequelize';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../errors';
import { hashPassword, generateToken } from '../security';
import { initTokenValidationRequestHandler, initAdminValidationRequestHandler, RequestAuth } from '../middleware/security';
import { Post } from '../repositories/types';
import { Request, ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { extraDataFromToken } from '../security';

export function initPostsRouter(sequelizeClient: SequelizeClient): Router {
    const router = Router({ mergeParams: true });

    const tokenValidation = initTokenValidationRequestHandler(sequelizeClient);
    const adminValidation = initAdminValidationRequestHandler(sequelizeClient);

    router.route('/')
        .get(tokenValidation, initGetAllPostsRequestHandler(sequelizeClient))
    router.route('/blogger/newPost')
        .post(tokenValidation, initCreatePostRequestHandler(sequelizeClient))
    router.route('/blogger/editPost/:id')
        .put(tokenValidation, initEditPostRequestHandler(sequelizeClient))
    router.route('/blogger/deletePost/:id')
        .delete(tokenValidation, initDeletePostRequestHandler(sequelizeClient))
    router.route('/blogger/publishPost/:id')
        .put(tokenValidation, initPublishPostRequestHandler(sequelizeClient))
    router.route('/blogger/hidePost/:id')
        .put(tokenValidation, initHidePostRequestHandler(sequelizeClient))
    router.route('/blogger')
        .get(tokenValidation, initGetBloggerPostsRequestHandler(sequelizeClient))

    // routes for admins

    return router;
}

function initCreatePostRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
    return async function createNewPost(req, res, next): Promise<void> {
        const { models } = sequelizeClient;
        try {
            const authorId = await getIdFromToken(req);
            //console.log(authorId);
            const title = req.body.title;
            const content = req.body.content;
            await models.posts.create({ title, content, authorId });
            res.status(204).end();
        } catch (err) {
            next(err);
        }
    }
}

function initGetAllPostsRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
    return async function getAllPublicPosts(req, res, next) {
        const { models } = sequelizeClient;
        try {
            const publicPosts = await models.posts.findAll({
                attributes: ['title', 'content'],
                where: {
                    is_hidden: false
                },
                raw: true,
            })
            console.log(publicPosts)
            res
                .status(200)
                .json(publicPosts)
        } catch (error) {
            next(error)
        }
    }
}

function initEditPostRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
    return async function updatePost(req, res, next) {
        const { models } = sequelizeClient;
        try {
            const userId = await getIdFromToken(req);
            const postId = req.params.id;
            const post = await models.posts.findOne({
                where: {
                    id: postId
                }
            })
            if (userId !== post?.authorId) {
                throw new ForbiddenError("YOU_CAN'T_EDIT_THIS_POST");
            }
            await models.posts.update(
                {
                    title: req.body.title,
                    content: req.body.content
                },
                {
                    where: {
                        id: postId
                    }
                }
            );
            res.status(200).end();
        } catch (error) {
            next(error);
        }
    }
}

function initDeletePostRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
    return async function deletePost(req, res, next) {
        const { models } = sequelizeClient;
        try {
            const userId = await getIdFromToken(req);
            const postId = req.params.id;
            const post = await models.posts.findOne({
                where: {
                    id: postId
                }
            });
            if (!post) {
                throw new BadRequestError("THIS_POST_DOES_NOT_EXISTS");
            }
            if (userId !== post?.authorId) {
                throw new ForbiddenError("YOU_CAN'T_DELETE_THIS_POST");
            }
            await models.posts.destroy({
                where: {
                    id: postId
                }
            });
            res.status(200).end();
        } catch (error) {
            next(error);
        }
    }
}

function initPublishPostRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
    return async function publishPost(req, res, next) {
        const { models } = sequelizeClient;
        try {
            const userId = await getIdFromToken(req);
            const postId = req.params.id;
            const post = await models.posts.findOne({
                where: {
                    id: postId
                }
            });
            if (userId !== post?.authorId) {
                throw new ForbiddenError("YOU_ARE_NOT_THE_AUTHOR_OF_THIS_POST");
            }
            if (!post) {
                throw new BadRequestError("THIS_POST_DOES_NOT_EXISTS");
            }
            if (post?.isHidden == false) {
                throw new BadRequestError("THIS_POST_IS_ALREADY_PUBLISHED");
            } else if (post?.isHidden == true) {
                await models.posts.update(
                    {
                        isHidden: false,
                    },
                    {
                        where: {
                            id: postId
                        }
                    }
                );
            }
            res.status(200).end();
        } catch (error) {
            next(error);
        }
    }
}

function initHidePostRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
    return async function hidePost(req, res, next) {
        const { models } = sequelizeClient;
        try {
            const userId = await getIdFromToken(req);
            const postId = req.params.id;
            const post = await models.posts.findOne({
                where: {
                    id: postId
                }
            });
            if (userId !== post?.authorId) {
                throw new ForbiddenError("YOU_ARE_NOT_THE_AUTHOR_OF_THIS_POST");
            }
            if (!post) {
                throw new BadRequestError("THIS_POST_DOES_NOT_EXISTS");
            }
            if (post?.isHidden == true) {
                throw new BadRequestError("THIS_POST_IS_ALREADY_HIDDEN");
            } else if (post?.isHidden == false) {
                await models.posts.update(
                    {
                        isHidden: true,
                    },
                    {
                        where: {
                            id: postId
                        }
                    }
                );
            }
            res.status(200).end();
        } catch (error) {
            next(error);
        }
    }
}

function initGetBloggerPostsRequestHandler(sequelizeClient: SequelizeClient): RequestHandler {
    return async function getPosts(req, res, next) {
        const { models } = sequelizeClient;
        try {
            const userId = await getIdFromToken(req);
            const publicPosts = await models.posts.findAll({
                attributes: ['title', 'content', 'is_hidden'],
                where: {
                    authorId: userId
                },
                raw: true,
            })
            //console.log(publicPosts)
            res
                .status(200)
                .json(publicPosts)

        } catch (error) {
            next(error);
        }        
    }
}

async function getIdFromToken(req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>) {
    const authorizationHeaderValue = req.header('authorization');
    //console.log(token)
    if (!authorizationHeaderValue) {
        throw new UnauthorizedError('AUTH_MISSING');
    }

    const [type, token] = authorizationHeaderValue.split(' ');
    if (type?.toLowerCase() == 'bearer' && token) {
        const { id } = extraDataFromToken(token);
        return id;
    }
}
