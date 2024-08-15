const jwt = require('jsonwebtoken');
const util = require('util');
const crypto = require('crypto');
const catchAsync = require('../utils/catchAsync');
const User = require('./../models/userModel');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    // We can also write it as {id}
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const CreateSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const CookieOPtions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    // secure: true, //This is to prevent website from cross site scripting attacks
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') CookieOPtions.secure = true;
  res.cookie('jwt', token);

  user.password = undefined; // To remove the password from output but WE ARE NOT SAVING IT

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email, // WE can also pass req.body but for security we will only pass selected terms
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAT: req.body.passwordChangedAT,
    role: req.body.role,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  CreateSendToken(newUser, 201, res);
  // const token = signToken(newUser._id);
  // res.status(201).json({
  //   status: 'success',
  //   token,
  //   data: {
  //     user: newUser,
  //   },
  // });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body; //ESlint way of assigning the value as the email and password variable name same as the body name
  //1> Check if the email and password exists
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  //2> Check if the user exists
  const user = await User.findOne({ email }).select('+password');
  //3> Check if the password is correct
  // const correct =await user.correctPassword(password, user.password);
  if (!user || !(await user.correctPassword(password, user.password))) {
    //if the user does not exists we will not execute that code, decreases time
    return next(new AppError('Incorrect email or passsword', 401));
  }
  //4> If everything is correct then we send the token
  CreateSendToken(user, 200, res);
  // const token = signToken(user._id);
  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
});

exports.protect = catchAsync(async (req, res, next) => {
  //1> Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) token = req.cookies.jwt;
  console.log(token);
  if (!token) {
    return next(new AppError('You are not logged in! Please login first', 401));
  }
  //2> verificaton of the token
  const decoded = await util.promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET,
  );
  console.log(decoded);
  //3> Check if the user exists
  const currentUser = await User.findById(decoded.id); // We want to check if the user stil exists, to stop making the attacker login with that token
  if (!currentUser) {
    return next(
      new AppError('The user belonging to the user does no longer exists', 401),
    );
  }
  //4> Check if the user changed the password after the JWT was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again', 401),
    );
  }
  req.user = currentUser;
  res.locals.user = currentUser;
  next(); //GRANCT ACCESS TO PROTECTED ROUTE
});

exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      //1> Verify the jwt token stored in the cookie
      const decoded = await util.promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );
      //2> Check if the user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      //3> Check if the user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      //NOW IF ALL THE CHECKS ARE PERFORMED THEN THE USER IS LOGGED IN
      res.locals.user = currentUser; // we can use this user variable everywhere as its local
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles is an array ['admin','lead-guide']  role is now just user role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }
    next();
  };
};

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1> get user based on Posted email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no User with that email address', 404));
  }
  //2>  Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // This will turn off all the validators that we defined in our schema
  //3> Send it to user's email
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/user/resetPasssword/${resetToken}`;
  // const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\n If you didnt forgot your password please ignore this message`;

  try {
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your password reset token (valid for 10 mins)',
    //   message: message,
    // });
    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Token sent to the registered email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save({ validateBeforeSave: false }); //TO save the data in DB

    return next(
      new AppError(
        `There was an error sending the email. Try again later!${err}`,
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1> Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiry: { $gt: Date.now() },
  });
  //2> If token has not expired, and there is user, set the new password

  if (!user) {
    return next(new AppError('The Token is invalid or expired', 400));
  }
  user.password = req.body.password; //We will send the pass and pass confirm via the body
  user.passwordConfirm = req.body.passwordConfirm;

  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;
  await user.save();

  //3> Update changedPasswordAt property for the user[ we did it in the user model ]

  //4> Log the user in, send JWT to client
  CreateSendToken(user, 200, res);
  // const token = signToken(user._id);
  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1> Get user from the collection
  const user = await User.findById(req.user.id).select('+password');
  //2> Check if the posted password is correct

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    // we will pass passwordCurrent in the req.body

    return next(new AppError('Your current password is wrong', 401));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //3> If so, update the password

  //4> Log the user in with JWT
  CreateSendToken(user, 200, res);
});
