const Review = require('./../models/reviewModel');
// const catchAsync = require('../utils/catchAsync');
// const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// exports.getAllReviews = catchAsync(async (req, res, next) => {
//   let filter = {};
//   if (req.params.tourId) filter = { tour: req.params.tourId };
//   const review = await Review.find(filter);
//   res.status(200).json({
//     status: 'success',
//     results: review.length,
//     data: {
//       review,
//     },
//   });
// });

exports.setTourUserIds = (req, res, next) => {
  //Allow nested routess
  if (!req.body.tour) req.body.tour = req.params.tourId; // for tours, if its not defined in the body
  if (!req.body.user) req.body.user = req.user.id; // for users, if they are not specified in the body
  next();
};

// exports.createReview = catchAsync(async (req, res, next) => {
//   //Allow nested routess
//   if (!req.body.tour) req.body.tour = req.params.tourId; // for tours, if its not defined in the body
//   if (!req.body.user) req.body.user = req.user.id; // for users, if they are not specified in the body
//   const newReview = await Review.create(req.body);

//   res.status(201).json({
//     status: 'success',
//     data: {
//       review: newReview,
//     },
//   });
// });
exports.getAllReviews = factory.getAll(Review);

exports.getReview = factory.getOne(Review);

exports.createReview = factory.createOne(Review);

exports.updateReview = factory.updateOne(Review);

exports.deleteReview = factory.deleteOne(Review);
