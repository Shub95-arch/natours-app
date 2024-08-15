const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const tourRouter = require('./routes/tourRoutes'); //Routes
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const app = express();
app.set('view engine', 'pug'); // we need to define the engine that we want to use

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

// GloBal middlewares
const websites = [
  'https://cdnjs.cloudflare.com',
  'https://js.stripe.com',
  'https://api.mapbox.com',
  "'self'",
  'blob:',
];
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https://*.mapbox.com'],
      baseUri: ["'self'"],
      blockAllMixedContent: [],
      fontSrc: ["'self'", 'https:', 'data:'],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameSrc: websites,
      scriptSrc: websites,
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      upgradeInsecureRequests: [],
    },
  }),
); //Set security HTTP Headers
app.set('views', path.join(__dirname, 'views')); // using this we dont need to put the '/' , to prevent that bug we need to use this

const morgran = require('morgan'); //Development Logging
app.use(express.json({ limit: '10kb' })); //now if we have a body more than 10kb it will not be served

app.use(cookieParser()); // This middleware is used to parase the jwt token in the cookie

//Date sanitization against NoSQL query injection

app.use(mongoSanitize());

//Data sanitization against XSS

app.use(xss());

//Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price ',
    ],
  }),
);

app.use(morgran('dev')); //morgan middleware

const limiter = rateLimit({
  //PREVENTS FROM DDOS
  max: 100, // No. of requests
  windowMs: 60 * 60 * 1000, // Time in Ms
  message: 'Too many requests from this IP, Please try again in an hour', // Error message
});

app.use('/api', limiter); // This will only affect the url with the /api

app.use(express.static(`${__dirname}/public`));

// app.get('/',(req,res)=>{
//     res.status(200).json({message: 'Hello from the server', app: 'natours'});

// });

// app.post('/', (req,res)=>{
//     res.send("sending the post endpoint")
// })

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Cant Find ${req.originalUrl} on this server`,
  // });
  next(new AppError(`Cant Find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
