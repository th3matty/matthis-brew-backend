import User, { UserInterface } from '../../models/user.schema';
const MasterKey =
  process.env.CREATE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
import {
  createToken,
  createRefreshToken,
  useRefreshToken,
} from '../../utils/jwt/jwt';

import { hashedPassword, comparePassword } from '../../utils/bCrypt/bCrypt';
import { errName } from '../../utils/error/error-handler';
import validator from 'validator';
import { messageTemplate } from '../../utils/verify/verifyMessage-template';
import { createVerifyToken } from '../../utils/jwt/jwt';

const GraphQLResolver = {
  getUserDetails: async function ({}, req: any) {
    try {
      if (!req.user) {
        throw new Error(errName.AUTH_FAILED);
      }
      const findUser = await User.findById(req.user._id).lean(true).exec();
      if (!findUser) {
        throw new Error(errName.USER_NOT_FOUND);
      }

      const { __v, ...relevantDoc } = findUser;

      relevantDoc.createdAt = new Date(
        Number(relevantDoc.createdAt)
      ).toISOString();
      relevantDoc.updatedAt = new Date(
        Number(relevantDoc.updatedAt)
      ).toISOString();

      return relevantDoc;
    } catch (err) {
      throw err;
    }
  },
  createUser: async function ({ createUserInput }: any, req: any) {
    if (req.user) {
      throw new Error(errName.ALREADY_LOGGED_IN);
    }
    const {
      username,
      password,
      emailAddress,
      confirmPassword,
    } = createUserInput;

    if (!validator.isEmail(emailAddress)) {
      throw new Error(errName.INVALID_EMAIL);
    }
    if (!validator.isLength(password, { min: 5 })) {
      throw new Error(errName.INVALID_PASS);
    }

    try {
      const findUser = await User.findOne({ username: username })
        .lean(true)
        .exec();
      if (findUser) {
        throw new Error(errName.USER_OR_EMAIL_EXISTS);
      }
      const findUserByEmail = await User.findOne({
        emailAddress: emailAddress,
      })
        .lean(true)
        .exec();

      if (findUserByEmail) {
        throw new Error(errName.USER_OR_EMAIL_EXISTS);
      }

      if (password !== confirmPassword) {
        throw new Error(errName.PASSWORD_MISMATCH);
      }
      const secretPassword = await hashedPassword(password);
      const newUser = new User({
        username: username,
        emailAddress: emailAddress.toLowerCase(),
        dateCreated: new Date().getTime().toString(),
        meta: {
          password: secretPassword,
        },
      });

      await newUser.save();

      const emailToken = await createVerifyToken({ accountID: newUser._id });

      const message = messageTemplate(
        newUser.username,
        newUser._id,
        emailToken
      );

      console.log(message);

      //prettier ignore
      return message;
    } catch (err) {
      throw err;
    }
  },
  updateUser: async function ({ updateUserInput }: any, req: any) {
    const { confirmPassword, password, emailAddress } = updateUserInput;

    if (!req.user) {
      throw new Error(errName.AUTH_FAILED);
    }

    if (emailAddress && !validator.isEmail(emailAddress)) {
      throw new Error(errName.INVALID_EMAIL);
    }
    if (password && !validator.isLength(password, { min: 5 })) {
      throw new Error(errName.INVALID_PASS);
    }

    if (password && !confirmPassword) {
      throw new Error(errName.PASSWORD_MISMATCH);
    }
    if (password && confirmPassword && password !== confirmPassword) {
      throw new Error(errName.PASSWORD_MISMATCH);
    }

    try {
      const findUser = await User.findById(req.user._id).exec();

      if (!findUser) {
        throw new Error(errName.USER_NOT_FOUND);
      }

      if (emailAddress) {
        const checkEmail = await User.findOne({ emailAddress: emailAddress })
          .lean(true)
          .exec();
        if (checkEmail) {
          throw new Error(errName.USER_OR_EMAIL_EXISTS);
        }
        findUser.emailAddress = emailAddress;
      }
      if (password) {
        findUser.meta.password = await hashedPassword(password);
      }
      return await findUser.save();
    } catch (err) {
      throw err;
    }
  },
  login: async function ({ username, password }: any, req: any) {
    if (req.user) {
      throw new Error(errName.ALREADY_LOGGED_IN);
    }
    try {
      const user = await User.findOne({ username: username }).exec();
      if (!user) {
        throw new Error(errName.USER_NOT_FOUND);
      }
      const comparePass = await comparePassword(password, user.meta.password);
      if (!comparePass) {
        throw new Error(errName.PASSWORD_MISMATCH);
      }
      if (!user.meta.isVerified) {
        throw new Error(errName.MISSING_VALIDATION);
      }
      const authObject = {
        token: createToken({
          username: user.username,
          emailAddress: user.emailAddress,
          isAuth: true,
        }),
        refreshToken: createRefreshToken({
          username: user.username,
          emailAddress: user.emailAddress,
          isAuth: true,
        }),
      };
      user.meta.refreshToken = authObject.refreshToken;
      await user.save();
      return authObject;
    } catch (err) {
      throw err;
    }
  },
  refreshToken: async function ({ refreshToken }: any, req: any) {
    try {
      const newAuthObject = useRefreshToken(refreshToken);
      const user = await User.findOne({
        username: newAuthObject.username,
      })
        .lean(true)
        .exec();
      if (!user) {
        throw new Error(errName.TOKEN_EXPIRED);
      }
      if (user.meta.refreshToken !== refreshToken) {
        throw new Error(errName.TOKEN_EXPIRED);
      }
      const newRefreshToken = createRefreshToken({
        username: user.username,
        emailAddress: user.emailAddress,
        isAuth: true,
      });
      req.user.meta.refreshToken = newRefreshToken;
      await req.user.save();
      return {
        token: newAuthObject.token,
        refreshToken: newRefreshToken,
      };
    } catch (err) {
      throw err;
    }
  },
  logout: async function ({}, req: any) {
    if (!req.user) {
      throw new Error(errName.LOGOUT_ERROR);
    }
    try {
      const user = await User.findById(req.user._id).lean(true).exec();
      if (!user) {
        throw new Error(errName.USER_NOT_FOUND);
      }
      req.user.meta.refreshToken = '';
      await req.user.save();
      return 'Logout successful !';
    } catch (err) {
      throw err;
    }
  },
  followUser: async function ({ followUserID }: any, req: any) {
    if (!req.user) {
      throw new Error(errName.AUTH_FAILED);
    }

    const targetUser = await User.findById(followUserID).exec();

    if (!targetUser) {
      throw new Error(errName.USER_NOT_FOUND);
    }

    req.user.following.push(targetUser);
    targetUser.followers.push(req.user);

    await req.user.save();
    await targetUser.save();

    return `Success, you are now following ${targetUser.username} !`;
  },
  unFollow: async function ({ userID }: any, req: any) {
    if (!req.user) {
      throw new Error(errName.AUTH_FAILED);
    }
    const targetUser = await User.findById(userID).exec();

    if (!targetUser) {
      throw new Error(errName.USER_NOT_FOUND);
    }

    req.user.following = req.user.following.filter((id: any) => {
      return id.toString() !== userID;
    });

    targetUser.followers = targetUser.followers.filter((id: any) => {
      return id.toString() !== req.user.id;
    });

    await req.user.save();
    await targetUser.save();

    return `Let him go, you aren´t further following ${targetUser.username}`;
  },
  getAllFollowerDetails: async function ({}, req: any) {
    if (!req.user) {
      throw new Error(errName.AUTH_FAILED);
    }
    const userWithDetails = await User.findById(req.user._id)
      .populate({
        path: 'followers',
        select: ['username', 'emailAddress'],
      })
      .lean(true)
      .exec();

    if (!userWithDetails) {
      throw new Error(errName.USER_NOT_FOUND);
    }

    const { followers } = userWithDetails;

    if (!followers) {
      throw new Error(errName.DEFAULT);
    }

    return userWithDetails.followers;
  },
  getAllFollowingDetails: async function ({}, req: any) {
    if (!req.user) {
      throw new Error(errName.AUTH_FAILED);
    }
    const userWithDetails = await User.findById(req.user._id)
      .populate({
        path: 'following',
        select: ['username', 'emailAddress'],
      })
      .lean(true)
      .exec();

    if (!userWithDetails) {
      throw new Error(errName.USER_NOT_FOUND);
    }

    const { following } = userWithDetails;

    if (!following) {
      throw new Error(errName.DEFAULT);
    }

    return userWithDetails.following;
  },
};

export default GraphQLResolver;
