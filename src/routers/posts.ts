import { Router, RequestHandler } from 'express';
import type { SequelizeClient } from '../sequelize';
import { BadRequestError, UnauthorizedError } from '../errors';
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
