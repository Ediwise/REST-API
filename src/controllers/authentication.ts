
import express from 'express';

import { createUser, getUserByEmail } from '../db/users';
import { random, authentication } from '../helpers';

export const login = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.sendStatus(400); // Bad Request if no email or password
            return;
        }

        const user = await getUserByEmail(email).select('+authentication.salt +authentication.password');

        if (!user) {
            res.sendStatus(400); // Bad Request if user does not exist
            return;
        }

        const expectedHash = authentication(user.authentication.salt, password);

        if (user.authentication.password != expectedHash) {
            res.sendStatus(403); // Forbidden if password doesn't match
            return;
        }

        const salt = random();
        user.authentication.sessionToken = authentication(salt, user._id.toString()); 

        await user.save();
        
        res.cookie('EDWARD-AUTH', user.authentication.sessionToken, { domain: 'localhost', path: '/'});

        res.status(200).json(user).end(); // Send back user details as a response
    } catch (error) {
        console.log(error);
        res.sendStatus(400);  // Bad Request in case of error
    }
}

export const register = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
        const { email, password, username } = req.body;

        if (!email || !password || !username) {
            res.sendStatus(400);  // Bad Request if any of the required fields are missing
            return;
        }

        const existingUser = await getUserByEmail(email)

        if (existingUser) {
            res.sendStatus(400); // Bad Request if user already exists
            return;
        }

        const salt = random();
        const user = await createUser({
            email,
            username,
            authentication: {
                salt,
                password: authentication(salt, password),
            },
        });

        res.status(200).json(user); // Send back user details as a response
    } catch (error) {
        console.log(error);
        res.sendStatus(400);  // Bad Request in case of error
    }
};
